import { getToken } from "./auth";

const POSTS_URL = "https://functions.poehali.dev/857e610a-f7fa-4899-a86a-51ee656a73c6";

export interface Post {
  id: number;
  text: string;
  imageUrl: string | null;
  createdAt: string;
  userId: number;
  userName: string;
  userUsername: string;
  userAvatar: string;
  userAvatarColor: string;
  likes: number;
  liked: boolean;
  comments: number;
  fileUrl: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
}

async function call(action: string, data: object = {}) {
  const token = getToken();
  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token, ...data }),
  });
  return res.json();
}

export async function fetchFeed(offset = 0): Promise<Post[]> {
  const data = await call("list", { offset, limit: 20 });
  return data.posts || [];
}

export async function createPost(params: {
  text?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
}): Promise<Post | null> {
  const data = await call("create", params);
  return data.post || null;
}

export async function toggleLike(postId: number): Promise<{ liked: boolean; likes: number } | null> {
  const data = await call("like", { postId });
  if (data.error) return null;
  return { liked: data.liked, likes: data.likes };
}

export interface Comment {
  id: number;
  text: string;
  createdAt: string;
  userId: number;
  userName: string;
  userAvatar: string;
  userAvatarColor: string;
}

export async function fetchComments(postId: number): Promise<Comment[]> {
  const data = await call("list_comments", { postId });
  return data.comments || [];
}

export async function addComment(postId: number, text: string): Promise<Comment | null> {
  const data = await call("add_comment", { postId, text });
  if (data.error) return null;
  return data.comment || null;
}

export interface Notification {
  id: number;
  type: "like" | "comment";
  fromUserId: number;
  fromUserName: string;
  fromUserAvatar: string;
  fromUserAvatarColor: string;
  postId: number;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const data = await call("list_notifications", {});
  return data.notifications || [];
}

export async function markNotificationsRead(): Promise<void> {
  await call("mark_notifications_read", {});
}