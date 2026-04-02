import { useState } from "react";
import { notifications as initialNotifs } from "@/data/mockData";
import Icon from "@/components/ui/icon";

const typeIcon: Record<string, string> = {
  like: "Heart",
  comment: "MessageCircle",
  follow: "UserPlus",
  message: "Mail",
};

const typeColor: Record<string, string> = {
  like: "text-red-500",
  comment: "text-blue-600",
  follow: "text-green-600",
  message: "text-purple-600",
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(initialNotifs);

  const unread = notifs.filter(n => !n.read).length;

  const markAll = () => setNotifs(notifs.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Уведомления</h2>
          {unread > 0 && (
            <span className="bg-foreground text-background text-xs rounded-full px-2 py-0.5 font-medium">
              {unread} новых
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Отметить все прочитанными
          </button>
        )}
      </div>

      {/* Unread */}
      {notifs.filter(n => !n.read).length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Новые</p>
          </div>
          <div className="divide-y divide-border">
            {notifs.filter(n => !n.read).map((n, i) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className="w-full flex items-start gap-3 p-4 hover:bg-secondary/30 transition-colors text-left animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: n.avatarColor }}>
                    {n.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center ${typeColor[n.type]}`}>
                    <Icon name={typeIcon[n.type]} size={11} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{n.userName}</span>{" "}
                    <span className="text-muted-foreground">{n.text}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                </div>
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Read */}
      {notifs.filter(n => n.read).length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ранее</p>
          </div>
          <div className="divide-y divide-border">
            {notifs.filter(n => n.read).map((n, i) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-4 animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white opacity-70" style={{ background: n.avatarColor }}>
                    {n.avatar}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center ${typeColor[n.type]} opacity-60`}>
                    <Icon name={typeIcon[n.type]} size={11} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground/70">{n.userName}</span>{" "}
                    {n.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notifs.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Уведомлений пока нет
        </div>
      )}
    </div>
  );
}
