import { useState } from "react";
import { conversations } from "@/data/mockData";
import Icon from "@/components/ui/icon";

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [chats, setChats] = useState(conversations);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const active = chats.find(c => c.id === activeChat);

  const sendMessage = () => {
    if (!input.trim() || !activeChat) return;
    setChats(chats.map(c =>
      c.id === activeChat
        ? {
            ...c,
            lastMessage: input,
            time: "сейчас",
            unread: 0,
            messages: [...c.messages, { id: Date.now(), from: "me", text: input, time: "сейчас" }]
          }
        : c
    ));
    setInput("");
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
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
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
            <button
              onClick={() => setActiveChat(null)}
              className="md:hidden p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
            >
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
            {active.messages.map((msg, i) => (
              <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"} animate-fade-in`} style={{ animationDelay: `${i * 30}ms` }}>
                <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.from === "me" ? "bg-foreground text-background rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"}`}>
                  <p>{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.from === "me" ? "text-background/60" : "text-muted-foreground"}`}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Написать сообщение..."
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
              <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Paperclip" size={16} />
              </button>
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="p-1.5 bg-foreground text-background rounded-lg disabled:opacity-30 hover:opacity-80 transition-opacity"
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
