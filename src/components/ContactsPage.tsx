import { useState } from "react";
import { contacts } from "@/data/mockData";
import Icon from "@/components/ui/icon";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState<number[]>([2, 4, 5]);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const online = filtered.filter(c => c.status === "online");
  const offline = filtered.filter(c => c.status === "offline");

  const toggleFollow = (id: number) => {
    setFollowing(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const ContactCard = ({ contact }: { contact: typeof contacts[0] }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors group animate-fade-in">
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ background: contact.avatarColor }}>
          {contact.avatar}
        </div>
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${contact.status === "online" ? "bg-green-500" : "bg-gray-300"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{contact.name}</p>
        <p className="text-xs text-muted-foreground">{contact.username}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {contact.status === "online" ? (
            <span className="text-green-600">онлайн</span>
          ) : (
            <span>{contact.lastSeen}</span>
          )}
          {" · "}{contact.mutualFriends} общих
        </p>
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="MessageCircle" size={15} />
        </button>
        <button
          onClick={() => toggleFollow(contact.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${following.includes(contact.id) ? "bg-secondary text-muted-foreground hover:bg-red-50 hover:text-red-600" : "bg-foreground text-background hover:opacity-80"}`}
        >
          {following.includes(contact.id) ? "Отписаться" : "Читать"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      {/* Search */}
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск контактов..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Всего", value: contacts.length },
          { label: "Онлайн", value: contacts.filter(c => c.status === "online").length },
          { label: "Читаю", value: following.length },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Online */}
      {online.length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <h3 className="text-sm font-medium">Сейчас онлайн · {online.length}</h3>
          </div>
          <div className="p-2">
            {online.map(c => <ContactCard key={c.id} contact={c} />)}
          </div>
        </div>
      )}

      {/* Offline */}
      {offline.length > 0 && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <h3 className="text-sm font-medium text-muted-foreground">Не в сети · {offline.length}</h3>
          </div>
          <div className="p-2">
            {offline.map(c => <ContactCard key={c.id} contact={c} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Контакты не найдены
        </div>
      )}
    </div>
  );
}
