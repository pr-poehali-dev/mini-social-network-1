"""Сообщения: список чатов, поиск пользователей, отправка, получение истории"""
import json
import os
import psycopg2

SCHEMA = "t_p25668763_mini_social_network_"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data, status=200):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_user_from_token(cur, token):
    if not token:
        return None
    cur.execute(
        f"SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token=%s AND s.expires_at>NOW()",
        (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def get_or_create_conversation(cur, uid1, uid2):
    u1, u2 = min(uid1, uid2), max(uid1, uid2)
    cur.execute(f"SELECT id FROM {SCHEMA}.conversations WHERE user1_id=%s AND user2_id=%s", (u1, u2))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(f"INSERT INTO {SCHEMA}.conversations (user1_id, user2_id) VALUES (%s, %s) RETURNING id", (u1, u2))
    return cur.fetchone()[0]


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")
    # Токен читаем из тела — надёжнее чем заголовки (прокси может их фильтровать)
    token = body.get("token") or (event.get("headers") or {}).get("X-Session-Token") or (event.get("headers") or {}).get("x-session-token", "")

    conn = get_conn()
    cur = conn.cursor()

    # Все пользователи (для страницы контактов)
    if action == "list_users":
        me = get_user_from_token(cur, token)
        if not me:
            conn.close()
            return err("Не авторизован", 401)

        cur.execute(f"""
            SELECT id, name, username, avatar_color
            FROM {SCHEMA}.users
            WHERE id != %s
            ORDER BY name ASC
        """, (me,))

        users = [{"id": r[0], "name": r[1], "username": r[2], "avatarColor": r[3], "avatar": r[1][:2].upper()} for r in cur.fetchall()]
        conn.close()
        return ok({"users": users})

    # Поиск пользователей для нового чата
    if action == "search_users":
        me = get_user_from_token(cur, token)
        if not me:
            conn.close()
            return err("Не авторизован", 401)

        q = (body.get("query") or "").strip()
        if len(q) < 2:
            conn.close()
            return ok({"users": []})

        cur.execute(f"""
            SELECT id, name, username, avatar_color
            FROM {SCHEMA}.users
            WHERE id != %s AND (
                LOWER(name) LIKE LOWER(%s) OR LOWER(username) LIKE LOWER(%s)
            )
            LIMIT 10
        """, (me, f"%{q}%", f"%{q}%"))

        users = [{"id": r[0], "name": r[1], "username": r[2], "avatarColor": r[3], "avatar": r[1][:2].upper()} for r in cur.fetchall()]
        conn.close()
        return ok({"users": users})

    # Список чатов текущего пользователя
    if action == "list_chats":
        me = get_user_from_token(cur, token)
        if not me:
            conn.close()
            return err("Не авторизован", 401)

        cur.execute(f"""
            SELECT
                c.id,
                CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END AS other_id,
                u.name, u.username, u.avatar_color,
                m.text, m.file_name, m.created_at, m.sender_id,
                (
                    SELECT COUNT(*) FROM {SCHEMA}.messages
                    WHERE conversation_id = c.id AND sender_id != %s AND is_read = FALSE
                ) AS unread_count
            FROM {SCHEMA}.conversations c
            JOIN {SCHEMA}.users u ON u.id = CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END
            LEFT JOIN LATERAL (
                SELECT text, file_name, created_at, sender_id
                FROM {SCHEMA}.messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) m ON true
            WHERE c.user1_id = %s OR c.user2_id = %s
            ORDER BY COALESCE(m.created_at, c.created_at) DESC
        """, (me, me, me, me, me))

        chats = []
        for row in cur.fetchall():
            conv_id, other_id, name, username, color, last_text, last_file, last_time, last_sender, unread_count = row
            if last_file and not last_text:
                preview = f"📎 {last_file}"
            elif last_text:
                preview = last_text[:60]
            else:
                preview = "Нет сообщений"

            chats.append({
                "id": conv_id,
                "userId": other_id,
                "userName": name,
                "userUsername": f"@{username}",
                "avatarColor": color,
                "userAvatar": name[:2].upper(),
                "lastMessage": preview,
                "time": str(last_time) if last_time else "",
                "unread": int(unread_count),
                "online": False,
            })

        conn.close()
        return ok({"chats": chats})

    # Загрузить историю сообщений
    if action == "get_messages":
        me = get_user_from_token(cur, token)
        if not me:
            conn.close()
            return err("Не авторизован", 401)

        conv_id = body.get("conversationId")
        if not conv_id:
            conn.close()
            return err("conversationId не указан")

        # Проверяем доступ
        cur.execute(f"SELECT id FROM {SCHEMA}.conversations WHERE id=%s AND (user1_id=%s OR user2_id=%s)", (conv_id, me, me))
        if not cur.fetchone():
            conn.close()
            return err("Нет доступа", 403)

        offset = int(body.get("offset", 0))
        cur.execute(f"""
            SELECT id, sender_id, text, file_url, file_name, file_mime, file_size, created_at, is_read
            FROM {SCHEMA}.messages
            WHERE conversation_id=%s
            ORDER BY created_at ASC
            LIMIT 50 OFFSET %s
        """, (conv_id, offset))

        messages = []
        for row in cur.fetchall():
            mid, sender, text, furl, fname, fmime, fsize, created, is_read = row
            messages.append({
                "id": mid,
                "from": "me" if sender == me else "other",
                "text": text or "",
                "time": str(created),
                "fileUrl": furl,
                "fileName": fname,
                "fileMime": fmime,
                "fileSize": fsize,
                "isRead": is_read,
            })

        conn.close()
        return ok({"messages": messages})

    # Пометить сообщения прочитанными (вызывается только при открытии чата)
    if action == "mark_read":
        me = get_user_from_token(cur, token)
        if not me:
            conn.close()
            return err("Не авторизован", 401)

        conv_id = body.get("conversationId")
        if not conv_id:
            conn.close()
            return err("conversationId не указан")

        cur.execute(f"SELECT id FROM {SCHEMA}.conversations WHERE id=%s AND (user1_id=%s OR user2_id=%s)", (conv_id, me, me))
        if not cur.fetchone():
            conn.close()
            return err("Нет доступа", 403)

        cur.execute(f"""
            UPDATE {SCHEMA}.messages
            SET is_read = TRUE
            WHERE conversation_id=%s AND sender_id != %s AND is_read = FALSE
        """, (conv_id, me))

        conn.commit()
        conn.close()
        return ok({"ok": True})

    # Отправить сообщение
    if action == "send":
        me = get_user_from_token(cur, token)
        if not me:
            conn.close()
            return err("Не авторизован", 401)

        to_user_id = body.get("toUserId")
        conv_id = body.get("conversationId")
        text = (body.get("text") or "").strip()
        file_url = body.get("fileUrl")
        file_name = body.get("fileName")
        file_mime = body.get("fileMime")
        file_size = body.get("fileSize")

        if not text and not file_url:
            conn.close()
            return err("Нельзя отправить пустое сообщение")

        if not conv_id and to_user_id:
            conv_id = get_or_create_conversation(cur, me, int(to_user_id))

        if not conv_id:
            conn.close()
            return err("Не указан получатель")

        # Проверяем доступ
        cur.execute(f"SELECT id FROM {SCHEMA}.conversations WHERE id=%s AND (user1_id=%s OR user2_id=%s)", (conv_id, me, me))
        if not cur.fetchone():
            conn.close()
            return err("Нет доступа", 403)

        cur.execute(f"""
            INSERT INTO {SCHEMA}.messages (conversation_id, sender_id, text, file_url, file_name, file_mime, file_size)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (conv_id, me, text, file_url, file_name, file_mime, file_size))
        mid, created = cur.fetchone()

        conn.commit()
        conn.close()

        return ok({
            "message": {
                "id": mid,
                "from": "me",
                "text": text,
                "time": str(created),
                "fileUrl": file_url,
                "fileName": file_name,
                "fileMime": file_mime,
                "fileSize": file_size,
            },
            "conversationId": conv_id,
        }, 201)

    conn.close()
    return err("Неизвестное действие")