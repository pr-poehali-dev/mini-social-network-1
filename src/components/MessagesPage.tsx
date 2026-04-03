import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { isImage, formatSize, uploadFile, UploadedFile } from "@/lib/upload";
import {
  Chat, Message, ChatUser,
  listChats, getMessages, sendMessage, searchUsers, markRead,
} from "@/lib/messages";
import { getToken } from "@/lib/auth";
import { requestPermission, sendBrowserNotification } from "@/lib/notifications";

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  const isAuth = !!getToken();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChatRef = useRef<Chat | null>(null);
  activeChatRef.current = activeChat;

  // Запоминаем последнее известное кол-во непрочитанных по каждому чату
  const knownUnreadRef = useRef<Record<number, number>>({});
  // Запоминаем последний id сообщения в активном чате
  const lastMsgIdRef = useRef<number>(0);

  const refreshChats = useCallback(async (silent = false) => {
    if (!silent) setLoadingChats(true);
    const c = await listChats();
    setChats(c);
    // Инициализируем baseline непрочитанных при первой загрузке
    if (!silent) {
      const init: Record<number, number> = {};
      c.forEach(chat => { init[chat.id] = chat.unread; });
      knownUnreadRef.current = init;
    }
    if (!silent) setLoadingChats(false);
  }, []);

  // Запрашиваем разрешение на уведомления при входе
  useEffect(() => {
    if (!isAuth) return;
    requestPermission();
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth) return;
    refreshChats();
  }, [isAuth, refreshChats]);

  // Автообновление: чаты каждые 15 сек, сообщения каждые 5 сек
  useEffect(() => {
    if (!isAuth) return;

    const chatsTimer = setInterval(async () => {
      const prev = knownUnreadRef.current;
      const newChats = await listChats();
      setChats(newChats);

      // Проверяем новые непрочитанные в фоне
      for (const chat of newChats) {
        const prevUnread = prev[chat.id] ?? chat.unread;
        const isActive = activeChatRef.current?.id === chat.id;
        if (chat.unread > prevUnread && !isActive) {
          // Toast-уведомление внутри приложения
          toast(`💬 ${chat.userName}`, {
            description: chat.lastMessage,
            duration: 5000,
            action: { label: "Открыть", onClick: () => {} },
          });
          // Браузерное push-уведомление
          sendBrowserNotification(
            chat.userName,
            chat.lastMessage,
          );
        }
        prev[chat.id] = chat.unread;
      }
      knownUnreadRef.current = prev;
    }, 15000);

    const msgsTimer = setInterval(async () => {
      const cur = activeChatRef.current;
      if (!cur || cur.id === 0) return;
      const msgs = await getMessages(cur.id);
      const newLast = msgs[msgs.length - 1];
      const hasNew = newLast && newLast.id !== lastMsgIdRef.current && newLast.from === "other";
      if (hasNew) {
        lastMsgIdRef.current = newLast.id;
        // Чат открыт — сразу помечаем прочитанным
        markRead(cur.id);
      }
      setMessages(msgs);
      setChats(prev => prev.map(c => c.id === cur.id ? { ...c, unread: 0 } : c));
      knownUnreadRef.current[cur.id] = 0;
    }, 5000);

    return () => { clearInterval(chatsTimer); clearInterval(msgsTimer); };
  }, [isAuth, refreshChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const openChat = useCallback(async (chat: Chat) => {
    setActiveChat(chat);
    setPendingUserId(null);
    setSearchResults([]);
    setSearch("");
    setLoadingMsgs(true);
    const msgs = await getMessages(chat.id);
    setMessages(msgs);
    setLoadingMsgs(false);
    // Фиксируем последнее сообщение как базовую точку
    const last = msgs[msgs.length - 1];
    if (last) lastMsgIdRef.current = last.id;
    // Помечаем прочитанными ТОЛЬКО здесь — при реальном открытии чата
    await markRead(chat.id);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
    knownUnreadRef.current[chat.id] = 0;
  }, []);

  const startChatWithUser = useCallback((user: ChatUser) => {
    // Проверяем, есть ли уже чат с этим пользователем
    const existing = chats.find(c => c.userId === user.id);
    if (existing) {
      openChat(existing);
      return;
    }
    // Новый чат — отображаем интерфейс для нового диалога
    setActiveChat({
      id: 0,
      userId: user.id,
      userName: user.name,
      userUsername: `@${user.username}`,
      avatarColor: user.avatarColor,
      userAvatar: user.avatar,
      lastMessage: "",
      time: "",
      unread: 0,
      online: false,
    });
    setPendingUserId(user.id);
    setMessages([]);
    setSearchResults([]);
    setSearch("");
  }, [chats, openChat]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const users = await searchUsers(q);
      setSearchResults(users);
      setSearching(false);
    }, 350);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      setAttachment(uploaded);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || sending) return;
    setSending(true);

    const params: Parameters<typeof sendMessage>[0] = {
      text: input.trim(),
    };

    if (activeChat && activeChat.id > 0) {
      params.conversationId = activeChat.id;
    } else if (pendingUserId) {
      params.toUserId = pendingUserId;
    }

    if (attachment) {
      if (isImage(attachment.mimeType)) {
        params.fileUrl = attachment.url;
        params.fileName = attachment.fileName;
        params.fileMime = attachment.mimeType;
        params.fileSize = attachment.size;
      } else {
        params.fileUrl = attachment.url;
        params.fileName = attachment.fileName;
        params.fileMime = attachment.mimeType;
        params.fileSize = attachment.size;
      }
    }

    const result = await sendMessage(params);
    setSending(false);

    if (result) {
      setMessages(prev => [...prev, result.message]);
      setInput("");
      setAttachment(null);

      // Если был новый чат — обновить список чатов
      if (!activeChat || activeChat.id === 0) {
        const updatedChats = await listChats();
        setChats(updatedChats);
        const newChat = updatedChats.find(c => c.id === result.conversationId);
        if (newChat) setActiveChat(newChat);
        setPendingUserId(null);
      } else {
        // Обновляем превью последнего сообщения в списке
        const preview = attachment
          ? (isImage(attachment.mimeType) ? "📷 Фото" : `📎 ${attachment.fileName}`)
          : input.trim();
        setChats(prev => prev.map(c =>
          c.id === activeChat.id ? { ...c, lastMessage: preview, time: result.message.time } : c
        ));
      }
    }
  };

  if (!isAuth) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center space-y-2">
          <Icon name="MessageCircle" size={32} className="mx-auto opacity-30" />
          <p className="text-sm">Войдите, чтобы писать сообщения</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden flex" style={{ height: "calc(100vh - 140px)", minHeight: 400 }}>
      {/* Sidebar */}
      <div className={`${activeChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 border-r border-border flex-shrink-0`}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Сообщения</h2>
            {chats.reduce((s, c) => s + c.unread, 0) > 0 && (
              <span className="bg-foreground text-background text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-medium">
                {chats.reduce((s, c) => s + c.unread, 0)}
              </span>
            )}
          </div>
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Найти пользователя..."
              className="w-full pl-8 pr-3 py-2 bg-secondary rounded-lg text-xs focus:outline-none"
            />
            {searching && <Icon name="Loader2" size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="border-b border-border">
            <p className="text-[10px] text-muted-foreground px-4 pt-2 pb-1 uppercase tracking-wide">Пользователи</p>
            {searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => startChatWithUser(user)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: user.avatarColor }}>
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                <Icon name="MessageCircle" size={14} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
            {search.length >= 2 && searchResults.length === 0 && !searching && (
              <p className="text-xs text-muted-foreground px-4 py-2">Никого не найдено</p>
            )}
          </div>
        )}

        {/* Chats list */}
        <div className="overflow-y-auto flex-1">
          {loadingChats ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-secondary rounded w-28" />
                    <div className="h-2.5 bg-secondary rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <p className="text-xs">Нет чатов. Найдите пользователя выше, чтобы начать переписку.</p>
            </div>
          ) : (
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => openChat(chat)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left ${activeChat?.id === chat.id ? "bg-secondary" : ""}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: chat.avatarColor }}>
                  {chat.userAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{chat.userName}</p>
                    <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{formatTime(chat.time)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <div className="w-5 h-5 bg-foreground text-background text-xs rounded-full flex items-center justify-center font-medium flex-shrink-0">
                    {chat.unread}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <button onClick={() => { setActiveChat(null); setPendingUserId(null); }} className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
              <Icon name="ArrowLeft" size={16} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: activeChat.avatarColor }}>
              {activeChat.userAvatar}
            </div>
            <div>
              <p className="text-sm font-semibold">{activeChat.userName}</p>
              <p className="text-xs text-muted-foreground">{activeChat.userUsername}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex justify-center py-8">
                <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <p className="text-xs text-muted-foreground">Напишите первое сообщение</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"} animate-fade-in`} style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}>
                  <div className={`max-w-[70%] rounded-2xl text-sm leading-relaxed overflow-hidden ${msg.from === "me" ? "bg-foreground text-background rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                    {msg.fileUrl && msg.fileName && msg.fileMime && (
                      <div className="p-2">
                        {isImage(msg.fileMime) ? (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                            <img src={msg.fileUrl} alt={msg.fileName} className="rounded-xl max-h-52 w-full object-cover" />
                          </a>
                        ) : (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${msg.from === "me" ? "bg-white/10 hover:bg-white/20" : "bg-white hover:bg-gray-50"}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.from === "me" ? "bg-white/20" : "bg-secondary"}`}>
                              <Icon name="FileText" size={14} className={msg.from === "me" ? "text-background" : "text-muted-foreground"} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-medium truncate ${msg.from === "me" ? "text-background" : "text-foreground"}`}>{msg.fileName}</p>
                              {msg.fileSize && <p className={`text-[10px] ${msg.from === "me" ? "text-background/60" : "text-muted-foreground"}`}>{formatSize(msg.fileSize)}</p>}
                            </div>
                            <Icon name="Download" size={13} className={msg.from === "me" ? "text-background/60" : "text-muted-foreground"} />
                          </a>
                        )}
                      </div>
                    )}
                    {msg.text && <p className="px-3.5 py-2.5">{msg.text}</p>}
                    <div className={`flex items-center gap-1 px-3.5 pb-2 ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                      <span className={`text-[10px] ${msg.from === "me" ? "text-background/50" : "text-muted-foreground"}`}>{formatTime(msg.time)}</span>
                      {msg.from === "me" && (
                        <Icon
                          name={msg.isRead ? "CheckCheck" : "Check"}
                          size={11}
                          className={msg.isRead ? "text-blue-300" : "text-background/40"}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment preview */}
          {attachment && (
            <div className="px-4 pt-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-secondary/50">
                {isImage(attachment.mimeType)
                  ? <img src={attachment.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0"><Icon name="FileText" size={16} className="text-muted-foreground" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{attachment.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(attachment.size)}</p>
                </div>
                <button onClick={() => setAttachment(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <Icon name="X" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {uploading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Paperclip" size={16} />}
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={attachment ? "Добавить подпись..." : "Написать сообщение..."}
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !attachment) || sending}
                className="p-1.5 bg-foreground text-background rounded-lg disabled:opacity-30 hover:opacity-80 transition-opacity flex-shrink-0"
              >
                {sending ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Send" size={14} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
              <Icon name="MessageCircle" size={22} />
            </div>
            <p className="text-sm">Выберите чат или найдите пользователя</p>
          </div>
        </div>
      )}
    </div>
  );
}