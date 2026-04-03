import { getToken } from "./auth";

const MESSAGES_URL = "https://functions.poehali.dev/64a4420c-2769-4c60-b834-d166fe9f9977";

export interface ChatUser {
  id: number;
  name: string;
  username: string;
  avatarColor: string;
  avatar: string;
}

export interface Chat {
  id: number;
  userId: number;
  userName: string;
  userUsername: string;
  avatarColor: string;
  userAvatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

export interface Message {
  id: number;
  from: "me" | "other";
  text: string;
  time: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
  isRead?: boolean;
}

async function call(action: string, data: object = {}) {
  const token = getToken();
  const res = await fetch(MESSAGES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token, ...data }),
  });
  return res.json();
}

export async function listUsers(): Promise<ChatUser[]> {
  const data = await call("list_users", {});
  return data.users || [];
}

export async function searchUsers(query: string): Promise<ChatUser[]> {
  const data = await call("search_users", { query });
  return data.users || [];
}

export async function listChats(): Promise<Chat[]> {
  const data = await call("list_chats");
  return data.chats || [];
}

export async function getMessages(conversationId: number, offset = 0): Promise<Message[]> {
  const data = await call("get_messages", { conversationId, offset });
  return data.messages || [];
}

export async function markRead(conversationId: number): Promise<void> {
  await call("mark_read", { conversationId });
}

export async function sendMessage(params: {
  conversationId?: number;
  toUserId?: number;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
}): Promise<{ message: Message; conversationId: number } | null> {
  const data = await call("send", params);
  if (data.error) return null;
  return data;
}