import { useState, useRef, useEffect } from "react";
import { conversations } from "@/data/mockData";
import Icon from "@/components/ui/icon";
import FileAttachment from "@/components/FileAttachment";
import { uploadFile, UploadedFile, isImage, formatSize } from "@/lib/upload";

interface Message {
  id: number;
  from: string;
  text: string;
  time: string;
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
}

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [chats, setChats] = useState(conversations);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<UploadedFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const active = chats.find(c => c.id === activeChat);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length]);

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

  const sendMessage = () => {
    if ((!input.trim() && !attachment) || !activeChat) return;

    const msg: Message = {
      id: Date.now(),
      from: "me",
      text: input,
      time: "сейчас",
      ...(attachment ? {
        fileUrl: attachment.url,
        fileName: attachment.fileName,
        fileMime: attachment.mimeType,
        fileSize: attachment.size,
      } : {}),
    };

    const preview = attachment
      ? (isImage(attachment.mimeType) ? "📷 Фото" : `📎 ${attachment.fileName}`)
      : input;

    setChats(chats.map(c =>
      c.id === activeChat
        ? { ...c, lastMessage: preview, time: "сейчас", unread: 0, messages: [...c.messages, msg] }
        : c
    ));
    setInput("");
    setAttachment(null);
  };

  const filtered = chats.filter(c =>
    c.userName.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = chats.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden flex" style={{ height: "calc(100vh - 140px)", minHeight: 400 }}>
      {/* Sidebar */}
      <div className={`${activeChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 border-r border-border flex-shrink-0`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Сообщения</h2>
            {totalUnread > 0 && (
              <span className="bg-foreground text-background text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-8 pr-3 py-2 bg-secondary rounded-lg text-xs focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left ${activeChat === chat.id ? "bg-secondary" : ""}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: chat.avatarColor }}>
                  {chat.userAvatar}
                </div>
                {chat.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{chat.userName}</p>
                  <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{chat.time}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <div className="w-5 h-5 bg-foreground text-background text-xs rounded-full flex items-center justify-center font-medium flex-shrink-0">
                  {chat.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <button onClick={() => setActiveChat(null)} className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
              <Icon name="ArrowLeft" size={16} />
            </button>
            <div className="relative">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: active.avatarColor }}>
                {active.userAvatar}
              </div>
              {active.online && <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{active.userName}</p>
              <p className="text-xs text-muted-foreground">{active.online ? "онлайн" : "не в сети"}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(active.messages as Message[]).map((msg, i) => (
              <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"} animate-fade-in`} style={{ animationDelay: `${i * 20}ms` }}>
                <div className={`max-w-[70%] rounded-2xl text-sm leading-relaxed overflow-hidden ${msg.from === "me" ? "bg-foreground text-background rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                  {/* File in message */}
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
                          className={`flex items-center gap-2.5 p-2 rounded-xl ${msg.from === "me" ? "bg-white/10 hover:bg-white/20" : "bg-white hover:bg-gray-50"} transition-colors`}
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
                  {!msg.text && msg.fileUrl && (
                    <p className={`text-[10px] px-3 pb-2 ${msg.from === "me" ? "text-background/60" : "text-muted-foreground"}`}>{msg.time}</p>
                  )}
                  {msg.text && (
                    <p className={`text-xs px-3.5 pb-2.5 -mt-1 ${msg.from === "me" ? "text-background/60" : "text-muted-foreground"}`}>{msg.time}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment preview */}
          {attachment && (
            <div className="px-4 pt-2 animate-fade-in">
              <div className={`flex items-center gap-3 p-2.5 rounded-xl border border-border bg-secondary/50`}>
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
                title="Прикрепить файл"
              >
                {uploading
                  ? <Icon name="Loader2" size={16} className="animate-spin" />
                  : <Icon name="Paperclip" size={16} />
                }
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={attachment ? "Добавить подпись..." : "Написать сообщение..."}
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() && !attachment}
                className="p-1.5 bg-foreground text-background rounded-lg disabled:opacity-30 hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <Icon name="Send" size={14} />
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
            <p className="text-sm">Выберите чат</p>
          </div>
        </div>
      )}
    </div>
  );
}
