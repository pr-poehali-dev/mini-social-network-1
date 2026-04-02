"""Лента постов: получить список, создать пост, поставить/убрать лайк"""
import json
import os
import psycopg2

SCHEMA = "t_p25668763_mini_social_network_"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action", "")
    token = (event.get("headers") or {}).get("X-Session-Token") or (event.get("headers") or {}).get("x-session-token", "")

    conn = get_conn()
    cur = conn.cursor()

    # Получить ленту
    if action == "list":
        user_id = get_user_from_token(cur, token)
        offset = int(body.get("offset", 0))
        limit = int(body.get("limit", 20))

        cur.execute(f"""
            SELECT p.id, p.text, p.image_url, p.created_at,
                   u.id, u.name, u.username, u.avatar_color,
                   COUNT(DISTINCT l.id) AS likes_count,
                   MAX(CASE WHEN l2.user_id=%s THEN 1 ELSE 0 END) AS liked,
                   p.file_url, p.file_name, p.file_mime, p.file_size
            FROM {SCHEMA}.posts p
            JOIN {SCHEMA}.users u ON u.id = p.user_id
            LEFT JOIN {SCHEMA}.post_likes l ON l.post_id = p.id
            LEFT JOIN {SCHEMA}.post_likes l2 ON l2.post_id = p.id AND l2.user_id = %s
            GROUP BY p.id, u.id
            ORDER BY p.created_at DESC
            LIMIT %s OFFSET %s
        """, (user_id or 0, user_id or 0, limit, offset))

        rows = cur.fetchall()
        posts = []
        for row in rows:
            pid, text, image_url, created_at, uid, name, username, color, likes, liked, file_url, file_name, file_mime, file_size = row
            posts.append({
                "id": pid,
                "text": text,
                "imageUrl": image_url,
                "createdAt": str(created_at),
                "userId": uid,
                "userName": name,
                "userUsername": f"@{username}",
                "userAvatar": (name[:2]).upper(),
                "userAvatarColor": color,
                "likes": int(likes),
                "liked": bool(liked),
                "comments": 0,
                "fileUrl": file_url,
                "fileName": file_name,
                "fileMime": file_mime,
                "fileSize": file_size,
            })
        conn.close()
        return ok({"posts": posts})

    # Создать пост
    if action == "create":
        user_id = get_user_from_token(cur, token)
        if not user_id:
            conn.close()
            return err("Не авторизован", 401)

        text = (body.get("text") or "").strip()
        image_url = body.get("imageUrl") or None
        file_url = body.get("fileUrl") or None
        file_name = body.get("fileName") or None
        file_mime = body.get("fileMime") or None
        file_size = body.get("fileSize") or None

        if not text and not file_url:
            conn.close()
            return err("Нельзя опубликовать пустой пост")

        cur.execute(
            f"INSERT INTO {SCHEMA}.posts (user_id, text, image_url, file_url, file_name, file_mime, file_size) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at",
            (user_id, text or "", image_url, file_url, file_name, file_mime, file_size)
        )
        pid, created_at = cur.fetchone()

        cur.execute(f"SELECT name, username, avatar_color FROM {SCHEMA}.users WHERE id=%s", (user_id,))
        name, username, color = cur.fetchone()

        conn.commit()
        conn.close()

        return ok({
            "post": {
                "id": pid,
                "text": text or "",
                "imageUrl": image_url,
                "createdAt": str(created_at),
                "userId": user_id,
                "userName": name,
                "userUsername": f"@{username}",
                "userAvatar": (name[:2]).upper(),
                "userAvatarColor": color,
                "likes": 0,
                "liked": False,
                "comments": 0,
                "fileUrl": file_url,
                "fileName": file_name,
                "fileMime": file_mime,
                "fileSize": file_size,
            }
        }, 201)

    # Лайк/дизлайк
    if action == "like":
        user_id = get_user_from_token(cur, token)
        if not user_id:
            conn.close()
            return err("Не авторизован", 401)

        post_id = body.get("postId")
        if not post_id:
            conn.close()
            return err("Не указан postId")

        cur.execute(f"SELECT id FROM {SCHEMA}.post_likes WHERE post_id=%s AND user_id=%s", (post_id, user_id))
        existing = cur.fetchone()

        if existing:
            cur.execute(f"DELETE FROM {SCHEMA}.post_likes WHERE post_id=%s AND user_id=%s", (post_id, user_id))
            liked = False
        else:
            cur.execute(f"INSERT INTO {SCHEMA}.post_likes (post_id, user_id) VALUES (%s, %s)", (post_id, user_id))
            liked = True

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.post_likes WHERE post_id=%s", (post_id,))
        count = cur.fetchone()[0]

        conn.commit()
        conn.close()
        return ok({"liked": liked, "likes": int(count)})

    conn.close()
    return err("Неизвестное действие")