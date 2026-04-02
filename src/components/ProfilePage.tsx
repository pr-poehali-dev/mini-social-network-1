import { useState } from "react";
import { currentUser, feedPosts } from "@/data/mockData";
import Icon from "@/components/ui/icon";

const statusOptions = [
  { emoji: "🟢", label: "На связи" },
  { emoji: "🌙", label: "Не беспокоить" },
  { emoji: "🏖️", label: "В отпуске" },
  { emoji: "💼", label: "На работе" },
  { emoji: "🎮", label: "Играю" },
];

export default function ProfilePage() {
  const [status, setStatus] = useState(currentUser.status);
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [bio, setBio] = useState(currentUser.bio);
  const [editingBio, setEditingBio] = useState(false);

  const myPosts = feedPosts.filter(p => p.userId === currentUser.id);

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      {/* Profile card */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {/* Cover */}
        <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 relative">
          <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="Camera" size={15} />
          </button>
        </div>

        {/* Avatar + info */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-6 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl border-4 border-white flex items-center justify-center text-lg font-bold text-white" style={{ background: currentUser.avatarColor }}>
                {currentUser.avatar}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Camera" size={12} />
              </button>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-secondary transition-colors">
              <Icon name="Pencil" size={13} />
              Редактировать
            </button>
          </div>

          <h1 className="text-lg font-semibold">{currentUser.name}</h1>
          <p className="text-sm text-muted-foreground">{currentUser.username}</p>

          {/* Bio */}
          <div className="mt-2">
            {editingBio ? (
              <div className="flex gap-2">
                <input
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="flex-1 text-sm border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/20"
                  onKeyDown={e => e.key === "Enter" && setEditingBio(false)}
                  autoFocus
                />
                <button onClick={() => setEditingBio(false)} className="p-1.5 bg-foreground text-background rounded-lg">
                  <Icon name="Check" size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingBio(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">
                {bio || <span className="italic">Добавить описание...</span>}
              </button>
            )}
          </div>

          {/* Status */}
          <div className="mt-3 relative">
            <button
              onClick={() => setShowStatusPicker(!showStatusPicker)}
              className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm hover:bg-secondary/80 transition-colors"
            >
              <span>{statusEmoji}</span>
              <span className="text-muted-foreground">{status}</span>
              <Icon name="ChevronDown" size={14} className="text-muted-foreground" />
            </button>

            {showStatusPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-xl shadow-lg py-1 z-10 animate-scale-in min-w-[180px]">
                {statusOptions.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => { setStatus(opt.label); setStatusEmoji(opt.emoji); setShowStatusPicker(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary text-sm transition-colors text-left"
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-border">
            {[
              { label: "записей", value: currentUser.posts },
              { label: "читателей", value: currentUser.followers },
              { label: "читаю", value: currentUser.following },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-base font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Мои записи</h3>
        </div>
        {myPosts.length > 0 ? (
          <div className="divide-y divide-border">
            {myPosts.map(post => (
              <div key={post.id} className="px-4 py-3">
                <p className="text-sm">{post.text}</p>
                <p className="text-xs text-muted-foreground mt-1">{post.time}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Пока нет записей
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Настройки</h3>
        </div>
        {[
          { icon: "Bell", label: "Уведомления" },
          { icon: "Lock", label: "Приватность" },
          { icon: "Shield", label: "Безопасность" },
          { icon: "HelpCircle", label: "Помощь" },
        ].map(item => (
          <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-0">
            <Icon name={item.icon} size={16} className="text-muted-foreground" />
            <span className="text-sm">{item.label}</span>
            <Icon name="ChevronRight" size={14} className="text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}
