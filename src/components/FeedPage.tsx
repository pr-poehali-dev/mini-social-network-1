import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import FileAttachment from "@/components/FileAttachment";
import { fetchFeed, createPost, toggleLike, fetchComments, addComment, Post, Comment } from "@/lib/posts";
import { uploadFile, UploadedFile, isImage } from "@/lib/upload";
import { getToken } from "@/lib/auth";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachment, setAttachment] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const isAuth = !!getToken();

  useEffect(() => {
    fetchFeed().then(p => { setPosts(p); setLoading(false); });
  }, []);

  const handleLike = async (id: number) => {
    if (!isAuth) return;
    const result = await toggleLike(id);
    if (result) {
      setPosts(posts.map(p => p.id === id ? { ...p, liked: result.liked, likes: result.likes } : p));
    }
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

  const handlePost = async () => {
    if ((!newPost.trim() && !attachment) || posting) return;
    setPosting(true);

    const params: Parameters<typeof createPost>[0] = { text: newPost.trim() };
    if (attachment) {
      if (isImage(attachment.mimeType)) {
        params.imageUrl = attachment.url;
      } else {
        params.fileUrl = attachment.url;
        params.fileName = attachment.fileName;
        params.fileMime = attachment.mimeType;
        params.fileSize = attachment.size;
      }
    }

    const post = await createPost(params);
    setPosting(false);
    if (post) {
      setPosts([post, ...posts]);
      setNewPost("");
      setAttachment(null);
    }
  };

  const toggleComments = async (postId: number) => {
    if (openComments === postId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(postId);
    const comments = await fetchComments(postId);
    setCommentsMap(prev => ({ ...prev, [postId]: comments }));
  };

  useEffect(() => {
    if (!openComments) return;
    const timer = setInterval(async () => {
      const comments = await fetchComments(openComments);
      setCommentsMap(prev => ({ ...prev, [openComments]: comments }));
    }, 5000);
    return () => clearInterval(timer);
  }, [openComments]);

  const handleAddComment = async (postId: number) => {
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    const comment = await addComment(postId, commentText.trim());
    if (comment) {
      setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), comment] }));
      setPosts(posts.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p));
      setCommentText("");
    }
    setSendingComment(false);
  };

  const filtered = searchQuery
    ? posts.filter(p =>
        p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

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
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon name="Pencil" size={15} className="text-muted-foreground" />
          </div>
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder="Что нового?"
            rows={(newPost.length > 60 || !!attachment) ? 3 : 1}
            className="flex-1 resize-none text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground leading-relaxed"
          />
        </div>

        {/* Attachment preview */}
        {attachment && (
          <div className="relative animate-fade-in">
            {isImage(attachment.mimeType) ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={attachment.url} alt={attachment.fileName} className="w-full max-h-48 object-cover" />
                <button
                  onClick={() => setAttachment(null)}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <Icon name="Paperclip" size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{attachment.fileName}</span>
                <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
                  <Icon name="X" size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-1 border-t border-border">
          <div className="flex gap-1">
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Прикрепить файл"
            >
              {uploading
                ? <Icon name="Loader2" size={16} className="animate-spin" />
                : <Icon name="Paperclip" size={16} />
              }
            </button>
          </div>
          {(newPost.trim() || attachment) && (
            <button
              onClick={handlePost}
              disabled={posting}
              className="px-4 py-1.5 bg-foreground text-background text-sm font-medium rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1.5 animate-fade-in"
            >
              {posting && <Icon name="Loader2" size={13} className="animate-spin" />}
              Опубликовать
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-border p-4 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-secondary rounded w-32" />
                  <div className="h-2.5 bg-secondary rounded w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-secondary rounded w-full" />
                <div className="h-3 bg-secondary rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {!loading && filtered.map((post, i) => (
        <div
          key={post.id}
          className="bg-white rounded-2xl border border-border overflow-hidden animate-fade-in"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-center gap-3 p-4 pb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: post.userAvatarColor }}>
              {post.userAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">{post.userName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{post.userUsername} · {formatTime(post.createdAt)}</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <Icon name="MoreHorizontal" size={16} />
            </button>
          </div>

          {post.text && (
            <div className="px-4 pb-3">
              <p className="text-sm leading-relaxed text-foreground">{post.text}</p>
            </div>
          )}

          {post.imageUrl && (
            <div className="mx-4 mb-3 rounded-xl overflow-hidden">
              <img src={post.imageUrl} alt="" className="w-full object-cover max-h-72" />
            </div>
          )}

          {post.fileUrl && post.fileName && post.fileMime && (
            <div className="mx-4 mb-3">
              <FileAttachment
                url={post.fileUrl}
                fileName={post.fileName}
                mimeType={post.fileMime}
                size={post.fileSize ?? undefined}
              />
            </div>
          )}

          <div className="flex items-center gap-1 px-3 pb-3 border-t border-border pt-2.5">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary ${post.liked ? "text-red-500" : "text-muted-foreground"}`}
            >
              <Icon name="Heart" size={15} className={post.liked ? "fill-red-500" : ""} />
              {post.likes}
            </button>
            <button
              onClick={() => toggleComments(post.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${openComments === post.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"}`}
            >
              <Icon name="MessageCircle" size={15} />
              {post.comments}
            </button>
          </div>

          {openComments === post.id && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {(commentsMap[post.id] || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Комментариев пока нет</p>
              )}
              {(commentsMap[post.id] || []).map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: c.userAvatarColor }}>
                    {c.userAvatar}
                  </div>
                  <div className="bg-secondary rounded-xl px-3 py-2 flex-1">
                    <p className="text-xs font-semibold">{c.userName}</p>
                    <p className="text-sm mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
              {isAuth && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddComment(post.id)}
                    placeholder="Написать комментарий..."
                    className="flex-1 px-3 py-2 text-sm bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    disabled={sendingComment || !commentText.trim()}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    <Icon name="Send" size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
            <Icon name="LayoutList" size={18} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "Ничего не найдено" : "Лента пустая — будьте первым!"}
          </p>
        </div>
      )}
    </div>
  );
}