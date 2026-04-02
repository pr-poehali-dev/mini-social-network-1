"""Загрузка файлов в S3. Принимает base64-файл, возвращает публичный CDN URL"""
import json
import os
import base64
import uuid
import mimetypes
import boto3
import psycopg2

SCHEMA = "t_p25668763_mini_social_network_"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}


def ok(data, status=200):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_user_from_token(token):
    if not token:
        return None
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token=%s AND s.expires_at>NOW()",
        (token,)
    )
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    token = (event.get("headers") or {}).get("X-Session-Token") or (event.get("headers") or {}).get("x-session-token", "")
    user_id = get_user_from_token(token)
    if not user_id:
        return err("Не авторизован", 401)

    body = json.loads(event.get("body") or "{}")
    file_data = body.get("file")
    file_name = body.get("fileName", "file")
    mime_type = body.get("mimeType", "application/octet-stream")

    if not file_data:
        return err("Файл не передан")

    # Декодируем base64
    if "," in file_data:
        file_data = file_data.split(",", 1)[1]
    raw = base64.b64decode(file_data)

    # Ограничение 20 МБ
    if len(raw) > 20 * 1024 * 1024:
        return err("Файл слишком большой. Максимум 20 МБ")

    # Генерируем уникальное имя
    ext = mimetypes.guess_extension(mime_type) or os.path.splitext(file_name)[1] or ""
    ext = ext.lstrip(".")
    if not ext:
        ext = "bin"
    key = f"uploads/{user_id}/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=mime_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return ok({"url": cdn_url, "fileName": file_name, "mimeType": mime_type, "size": len(raw)})
