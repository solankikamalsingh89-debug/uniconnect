"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Post } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Plus, X,
  Upload, Play, Volume2, VolumeX, Send
} from 'lucide-react';
import { toast } from 'sonner';

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface PostWithStats extends Post {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/watch\?.*v=([^&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReelsFeedPage() {
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchPosts = useCallback(async (uid: string | null) => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const enriched = await Promise.all(data.map(async post => {
      const [lr, cr, mr] = await Promise.all([
        supabase.from('post_likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        uid ? supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', uid).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { ...post, likeCount: lr.count ?? 0, commentCount: cr.count ?? 0, isLiked: !!mr.data };
    }));
    setPosts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setCurrentUserId(uid);
      fetchPosts(uid);
    });
    const ch = supabase.channel('posts:page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        supabase.auth.getUser().then(({ data }) => fetchPosts(data.user?.id ?? null));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleLike = async (postId: string) => {
    if (!currentUserId) { toast.error('Login required'); return; }
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 }
      : p));
    if (post.isLiked) await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
    else await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
  };

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-4 pb-14
                      bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
        <h1 className="text-base font-bold text-white/90 tracking-wider uppercase pointer-events-auto">Feed</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20
                     text-white rounded-full font-semibold text-xs hover:bg-white hover:text-black transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New Post
        </button>
      </div>

      {/* Scroll container — each item is snap-start and fills the viewport */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <p className="text-4xl opacity-20">📸</p>
            <p className="text-gray-500 text-sm">No posts yet</p>
            <button onClick={() => setIsModalOpen(true)} className="text-neonCyan text-xs hover:underline">
              Create the first post
            </button>
          </div>
        ) : (
          posts.map(post => (
            <ReelCard
              key={post.id}
              post={post}
              onLike={() => handleLike(post.id)}
              onComment={() => setCommentPostId(post.id)}
            />
          ))
        )}
      </div>

      {/* Comments modal — fixed, outside scroll tree */}
      <AnimatePresence>
        {commentPostId && (
          <CommentsModal postId={commentPostId} currentUserId={currentUserId} onClose={() => setCommentPostId(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} currentUserId={currentUserId} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Reel Card (9:16 aspect ratio, centered) ─────────────────────────────────
function ReelCard({ post, onLike, onComment }: {
  post: PostWithStats;
  onLike: () => void;
  onComment: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ytMuted, setYtMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const youtubeId = post.video_url ? getYouTubeId(post.video_url) : null;
  const isDirectVideo = !!post.video_url && !youtubeId;

  const ytCmd = useCallback((fn: string) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: fn, args: [] }), '*');
  }, []);

  // Auto-play / pause on visibility
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (isDirectVideo) {
        if (entry.isIntersecting) videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
        else { videoRef.current?.pause(); setIsPlaying(false); }
      } else if (youtubeId && !entry.isIntersecting) {
        ytCmd('pauseVideo');
        setIsPlaying(false);
      }
    }, { threshold: 0.55 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isDirectVideo, youtubeId, ytCmd]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
      else videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    // Outer container: full viewport height, centers the 9:16 reel
    <div
      ref={cardRef}
      className="w-full snap-start flex items-center justify-center bg-black relative"
      style={{ height: '100%' }}
    >
      {/* Inner 9:16 card — max width constrained, rounded, with shadow */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl bg-gray-950"
        style={{
          aspectRatio: '9 / 16',
          height: '95%',
          maxWidth: '100%',
        }}
      >
        {/* ── Media ── */}
        {youtubeId ? (
          // YouTube embed — iv_load_policy=3 hides annotations, disablekb=1 prevents keyboard nav
          <iframe
            ref={iframeRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0`}
            allow="autoplay; fullscreen"
            allowFullScreen
            title="Reel"
            style={{ border: 'none' }}
          />
        ) : isDirectVideo ? (
          <video
            ref={videoRef}
            src={post.video_url!}
            loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // Text post — gradient background
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950 flex items-center justify-center px-8">
            <p className="text-white text-xl md:text-3xl font-semibold text-center leading-relaxed">{post.content}</p>
          </div>
        )}

        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Tap to play/pause — native video */}
        {isDirectVideo && (
          <div className="absolute inset-0 z-[5] cursor-pointer" onClick={togglePlay}>
            <AnimatePresence>
              {!isPlaying && (
                <motion.div
                  key="play"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center">
                    <Play className="w-7 h-7 text-white ml-0.5" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Tap to play/pause — YouTube */}
        {youtubeId && (
          <div
            className="absolute inset-0 z-[5] cursor-pointer"
            onClick={() => {
              if (isPlaying) { ytCmd('pauseVideo'); setIsPlaying(false); }
              else { ytCmd('playVideo'); setIsPlaying(true); }
            }}
          >
            <AnimatePresence>
              {!isPlaying && (
                <motion.div
                  key="yt-play"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center">
                    <Play className="w-7 h-7 text-white ml-0.5" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Mute button (top right, inside the card) ── */}
        <div className="absolute top-4 right-4 z-20">
          {isDirectVideo && (
            <button
              onClick={e => { e.stopPropagation(); setIsMuted(m => !m); }}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          )}
          {youtubeId && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (ytMuted) { ytCmd('unMute'); setYtMuted(false); }
                else { ytCmd('mute'); setYtMuted(true); }
              }}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all"
            >
              {ytMuted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
            </button>
          )}
        </div>

        {/* ── Post info (bottom left) ── */}
        <div className="absolute bottom-16 left-4 right-16 z-10 pointer-events-none">
          <p className="font-semibold text-white text-sm drop-shadow-lg">@{post.author_id?.slice(0, 10) ?? 'student'}</p>
          {post.content && post.video_url && (
            <p className="text-white/70 text-xs line-clamp-2 leading-relaxed mt-1">{post.content}</p>
          )}
          <p className="text-white/30 text-[10px] mt-1.5">
            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>

        {/* ── Action buttons (bottom right, inside the card) ── */}
        <div className="absolute right-3 bottom-14 z-20 flex flex-col gap-4 items-center">
          {/* Like */}
          <button onClick={e => { e.stopPropagation(); onLike(); }} className="flex flex-col items-center gap-0.5">
            <motion.div
              whileTap={{ scale: 1.4 }}
              className={`p-2.5 rounded-full transition-all ${post.isLiked
                ? 'bg-red-500/25 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-black/40 backdrop-blur-md hover:bg-red-500/10'}`}
            >
              <Heart className={`w-5 h-5 ${post.isLiked ? 'text-red-400 fill-red-400' : 'text-white'}`} />
            </motion.div>
            <span className="text-[10px] text-white/80 font-medium">{post.likeCount}</span>
          </button>

          {/* Comment */}
          <button onClick={e => { e.stopPropagation(); onComment(); }} className="flex flex-col items-center gap-0.5">
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/10 transition-all">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium">{post.commentCount}</span>
          </button>

          {/* Share */}
          <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }} className="flex flex-col items-center gap-0.5">
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/10 transition-all">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] text-white/80 font-medium">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────
function CommentsModal({ postId, currentUserId, onClose }: {
  postId: string;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at').then(({ data }) => {
      if (data) setComments(data);
    });
    const ch = supabase.channel(`cmt:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}`
      }, (p) => setComments(prev => [...prev, p.new as PostComment]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId || !text.trim()) return;
    setSending(true);
    await supabase.from('post_comments').insert({ post_id: postId, user_id: currentUserId, content: text.trim() });
    setText('');
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="absolute inset-x-0 bottom-0 bg-[#0a0a0a] border-t border-gray-800/50 rounded-t-3xl flex flex-col"
        style={{ maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-800/50">
          <h3 className="text-white font-semibold text-sm">Comments</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4">
          {comments.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-8">No comments yet</p>
          ) : comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-[9px] font-bold text-white/50 shrink-0">
                {c.user_id.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] text-gray-500">@{c.user_id.slice(0, 8)}
                  <span className="ml-1.5 text-gray-700">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
                <p className="text-sm text-gray-200 mt-0.5 leading-snug">{c.content}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {currentUserId ? (
          <form onSubmit={submit} className="flex gap-2 px-4 py-3 border-t border-gray-800/40">
            <input
              value={text} onChange={e => setText(e.target.value)}
              placeholder="Add a comment…" autoFocus
              className="flex-1 bg-gray-900/80 border border-gray-800 rounded-full px-4 py-2 text-sm text-white
                         focus:outline-none focus:border-white/30 transition-colors placeholder:text-gray-600"
            />
            <button type="submit" disabled={!text.trim() || sending}
              className="p-2 bg-white text-black rounded-full disabled:opacity-30 hover:bg-neonCyan transition-all">
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : <p className="text-center text-xs text-gray-600 py-3">Login to comment</p>}
      </motion.div>
    </div>
  );
}

// ─── Create Post Modal ────────────────────────────────────────────────────────
function CreatePostModal({ isOpen, onClose, currentUserId }: {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
}) {
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) { toast.error('Login required'); return; }
    if (!content.trim() && !videoUrl.trim() && !file) { toast.error('Add content'); return; }
    setLoading(true);
    let finalUrl = videoUrl.trim() || null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${currentUserId}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('reels').upload(path, file);
      if (error) { toast.error(error.message); setLoading(false); return; }
      const { data: pub } = supabase.storage.from('reels').getPublicUrl(path);
      finalUrl = pub.publicUrl;
    }
    const { error } = await supabase.from('posts').insert({
      author_id: currentUserId, content: content.trim() || null, video_url: finalUrl, is_recommended: false,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success('Posted!'); setContent(''); setVideoUrl(''); setFile(null); onClose(); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md bg-[#0a0a0a] border border-gray-800/50 rounded-t-3xl p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">New Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="file" accept="video/mp4,video/webm,video/quicktime"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setVideoUrl(''); } }}
            />
            <div className={`border border-dashed rounded-xl p-5 flex flex-col items-center gap-1.5 transition-colors
              ${file ? 'border-neonCyan/50 bg-neonCyan/5' : 'border-gray-800 bg-gray-900/30 hover:border-gray-600'}`}>
              {file ? (
                <><Play className="w-6 h-6 text-neonCyan" /><p className="text-white text-xs font-medium truncate w-full text-center">{file.name}</p></>
              ) : (
                <><Upload className="w-6 h-6 text-gray-600" /><p className="text-gray-400 text-xs">Select video</p></>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-800/50" /><span className="text-[10px] text-gray-600 uppercase">or link</span><div className="flex-1 h-px bg-gray-800/50" />
          </div>
          <input
            type="url" value={videoUrl}
            onChange={e => { setVideoUrl(e.target.value); if (e.target.value) setFile(null); }}
            placeholder="YouTube or .mp4 URL"
            className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
          />
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="Caption…"
            className="w-full bg-gray-900/50 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors resize-none min-h-[60px]"
          />
          <button
            type="submit" disabled={loading || (!content.trim() && !videoUrl.trim() && !file)}
            className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-30 bg-white text-black hover:bg-neonCyan transition-all"
          >
            {loading ? 'Uploading…' : file ? 'Upload & Post' : 'Post'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
