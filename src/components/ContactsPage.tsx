import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { listUsers, ChatUser } from "@/lib/messages";
import { getToken } from "@/lib/auth";

interface Props {
  onStartChat?: (user: ChatUser) => void;
}

export default function ContactsPage({ onStartChat }: Props) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const isAuth = !!getToken();

  useEffect(() => {
    if (!isAuth) { setLoading(false); return; }
    listUsers().then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, [isAuth]);

  const filtered = search
    ? users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (!isAuth) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Войдите, чтобы видеть контакты
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск контактов..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-semibold">{users.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Всего</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-semibold">{filtered.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Найдено</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? "Контакты не найдены" : "Пока нет других пользователей"}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="p-2">
            {filtered.map((u, i) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors animate-fade-in group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0" style={{ background: u.avatarColor }}>
                  {u.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {onStartChat && (
                  <button
                    onClick={() => onStartChat(u)}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  >
                    <Icon name="MessageCircle" size={13} />
                    Написать
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}