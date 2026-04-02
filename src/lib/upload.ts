import { getToken } from "./auth";

const UPLOAD_URL = "https://functions.poehali.dev/b32675ac-fb7d-4880-b2d1-56bedb23a471";

export interface UploadedFile {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function isVideo(mimeType: string) {
  return mimeType.startsWith("video/");
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const token = getToken();
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Session-Token": token } : {}),
        },
        body: JSON.stringify({
          file: base64,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
        }),
      });
      const data = await res.json();
      if (data.error) reject(new Error(data.error));
      else resolve(data);
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}
