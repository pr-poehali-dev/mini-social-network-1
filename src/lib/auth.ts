const AUTH_URL = "https://functions.poehali.dev/8dc69365-fdeb-4772-9020-2831a36b9003";
const TOKEN_KEY = "nochat_token";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  avatar: string;
  avatarColor: string;
  bio: string;
  status: string;
  statusEmoji: string;
}

async function call(action: string, data: object = {}, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Session-Token"] = token;
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...data }),
  });
  return res.json();
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(name: string, username: string, email: string, password: string) {
  return call("register", { name, username, email, password });
}

export async function login(email: string, password: string) {
  return call("login", { email, password });
}

export async function logout() {
  const token = getToken();
  if (token) await call("logout", {}, token);
  clearToken();
}

export async function getMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  const data = await call("me", {}, token);
  if (data.user) return data.user;
  return null;
}
