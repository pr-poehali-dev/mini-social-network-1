"""Авторизация: регистрация, вход, выход, проверка сессии. Действие передаётся в поле action тела запроса."""
import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = "t_p25668763_mini_social_network_"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

AVATAR_COLORS = ["#1a1a1a", "#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706", "#0891b2"]


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def ok(data: dict, status: int = 200):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def err(msg: str, status: int = 400):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action", "")
    token = body.get("_token", "")

    # register
    if action == "register":
        name = (body.get("name") or "").strip()
        username = (body.get("username") or "").strip().lstrip("@")
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not all([name, username, email, password]):
            return err("Заполните все поля")
        if len(password) < 6:
            return err("Пароль минимум 6 символов")
        if " " in username:
            return err("Имя пользователя не должно содержать пробелы")

        color = AVATAR_COLORS[len(name) % len(AVATAR_COLORS)]
        avatar = (name[:2]).upper()

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email=%s OR username=%s", (email, username))
        if cur.fetchone():
            conn.close()
            return err("Email или имя пользователя уже заняты")

        pw_hash = hash_password(password)
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (name, username, email, password_hash, avatar_color) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (name, username, email, pw_hash, color)
        )
        user_id = cur.fetchone()[0]
        tok = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, tok))
        conn.commit()
        conn.close()

        return ok({
            "token": tok,
            "user": {"id": user_id, "name": name, "username": f"@{username}", "avatar": avatar, "avatarColor": color, "bio": "", "status": "На связи", "statusEmoji": "🟢"}
        }, 201)

    # login
    if action == "login":
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not email or not password:
            return err("Введите email и пароль")

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, username, avatar_color, bio, status, status_emoji FROM {SCHEMA}.users WHERE email=%s AND password_hash=%s",
            (email, hash_password(password))
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Неверный email или пароль")

        uid, name, username, color, bio, status, status_emoji = row
        tok = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (uid, tok))
        conn.commit()
        conn.close()

        return ok({
            "token": tok,
            "user": {"id": uid, "name": name, "username": f"@{username}", "avatar": (name[:2]).upper(), "avatarColor": color, "bio": bio or "", "status": status, "statusEmoji": status_emoji}
        })

    # me
    if action == "me":
        if not token:
            return err("Нет токена", 401)
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT u.id, u.name, u.username, u.avatar_color, u.bio, u.status, u.status_emoji
                FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.token=%s AND s.expires_at > NOW()""",
            (token,)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return err("Сессия не найдена", 401)
        uid, name, username, color, bio, status, status_emoji = row
        return ok({"user": {"id": uid, "name": name, "username": f"@{username}", "avatar": (name[:2]).upper(), "avatarColor": color, "bio": bio or "", "status": status, "statusEmoji": status_emoji}})

    # logout
    if action == "logout":
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
            conn.commit()
            conn.close()
        return ok({"ok": True})

    return err("Неизвестное действие", 400)