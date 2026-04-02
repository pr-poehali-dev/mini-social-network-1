import { useState } from "react";
import Icon from "@/components/ui/icon";
import FeedPage from "@/components/FeedPage";
import MessagesPage from "@/components/MessagesPage";
import ContactsPage from "@/components/ContactsPage";
import NotificationsPage from "@/components/NotificationsPage";
import ProfilePage from "@/components/ProfilePage";
import { currentUser, notifications, conversations } from "@/data/mockData";

type Tab = "feed" | "messages" | "contacts" | "notifications" | "profile";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "feed", label: "Лента", icon: "LayoutList" },
  { id: "messages", label: "Сообщения", icon: "MessageCircle" },
  { id: "contacts", label: "Контакты", icon: "Users" },
  { id: "notifications", label: "Уведомления", icon: "Bell" },
  { id: "profile", label: "Профиль", icon: "User" },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  const unreadMessages = conversations.reduce((s, c) => s + c.unread, 0);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const getBadge = (tab: Tab) => {
    if (tab === "messages") return unreadMessages;
    if (tab === "notifications") return unreadNotifs;
    return 0;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[900px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
              <Icon name="Zap" size={14} className="text-background" />
            </div>
            <span className="font-semibold text-sm tracking-tight">no-chat</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(tab => {
              const badge = getBadge(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                >
                  <Icon name={tab.icon} size={15} />
                  <span>{tab.label}</span>
                  {badge > 0 && (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-semibold ${activeTab === tab.id ? "bg-white text-foreground" : "bg-foreground text-background"}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: currentUser.avatarColor }}
            onClick={() => setActiveTab("profile")}
          >
            {currentUser.avatar}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[900px] mx-auto px-4 py-5 pb-24 md:pb-5">
        {activeTab === "feed" && <FeedPage />}
        {activeTab === "messages" && <MessagesPage />}
        {activeTab === "contacts" && <ContactsPage />}
        {activeTab === "notifications" && <NotificationsPage />}
        {activeTab === "profile" && <ProfilePage />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border z-30">
        <div className="flex">
          {tabs.map(tab => {
            const badge = getBadge(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 relative transition-colors ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground"}`}
              >
                <div className="relative">
                  <Icon name={tab.icon} size={20} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-foreground text-background text-[9px] rounded-full flex items-center justify-center font-semibold">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-foreground rounded-b-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}