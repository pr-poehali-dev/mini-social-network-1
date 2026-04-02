import { useState } from "react";
import { feedPosts, currentUser } from "@/data/mockData";
import Icon from "@/components/ui/icon";

export default function FeedPage() {
  const [posts, setPosts] = useState(feedPosts);
  const [newPost, setNewPost] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const toggleLike = (id: number) => {
    setPosts(posts.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const filtered = searchQuery
    ? posts.filter(p =>
        p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.includes(searchQuery.toLowerCase())) ||
        p.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  const handlePost = () => {
    if (!newPost.trim()) return;
    const post = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      avatarColor: currentUser.avatarColor,
      time: "только что",
      text: newPost,
      image: null,
      likes: 0,
      comments: 0,
      liked: false,
      tags: [],
    };
    setPosts([post, ...posts]);
    setNewPost("");
  };

  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      {/* Search */}
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск по ленте..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
        />
      </div>

      {/* New post */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: currentUser.avatarColor }}>
            {currentUser.avatar}
          </div>
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="Что нового?"
            rows={newPost.length > 60 ? 3 : 1}
            className="flex-1 resize-none text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground leading-relaxed"
          />
        </div>
        {newPost.trim() && (
          <div className="flex justify-between items-center pt-1 border-t border-border animate-fade-in">
            <div className="flex gap-1">
              <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Image" size={16} />
              </button>
              <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="Smile" size={16} />
              </button>
            </div>
            <button
              onClick={handlePost}
              className="px-4 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-80 transition-opacity"
            >
              Опубликовать
            </button>
          </div>
        )}
      </div>

      {/* Posts */}
      {filtered.map((post, i) => (
        <div
          key={post.id}
          className="bg-white rounded-2xl border border-border overflow-hidden animate-fade-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 pb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: post.avatarColor }}>
              {post.userAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">{post.userName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{post.time}</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <Icon name="MoreHorizontal" size={16} />
            </button>
          </div>

          {/* Text */}
          <div className="px-4 pb-3">
            <p className="text-sm leading-relaxed text-foreground">{post.text}</p>
            {post.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {post.tags.map(tag => (
                  <span key={tag} className="text-xs text-blue-600 hover:underline cursor-pointer">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          {post.image && (
            <div className="mx-4 mb-3 rounded-xl overflow-hidden">
              <img src={post.image} alt="" className="w-full object-cover max-h-72" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 px-3 pb-3 border-t border-border pt-2.5">
            <button
              onClick={() => toggleLike(post.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary ${post.liked ? "text-red-500" : "text-muted-foreground"}`}
            >
              <Icon name={post.liked ? "Heart" : "Heart"} size={15} className={post.liked ? "fill-red-500" : ""} />
              {post.likes}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              <Icon name="MessageCircle" size={15} />
              {post.comments}
            </button>
            <div className="flex-1" />
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              <Icon name="Share2" size={15} />
            </button>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}
