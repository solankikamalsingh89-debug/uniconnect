"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserCircle, Hash, Grid3X3, MessageCircle, X, Play, Film, Send } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  handle: string;
  batch_year: number;
  branch_code: number;
  role: string;
  is_mentor: boolean;
}

interface Post {
  id: string;
  author_id: string;
  content: string | null;
  video_url: string | null;
  created_at: string;
}

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
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

function PostThumbnail({ post }: { post: Post }) {
  const ytId = post.video_url ? getYouTubeId(post.video_url) : null;
  if (ytId) return (
    <div className="relative w-full h-full">
      <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
      <div className="absolute top-1.5 right-1.5"><Play className="w-4 h-4 text-white drop-shadow" /></div>
    </div>
  );
  if (post.video_url) return (
    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-1">
      <Film className="w-7 h-7 text-gray-500" /><span className="text-[10px] text-gray-600">Video</span>
    </div>
  );
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-3">
      <p className="text-white text-[11px] text-center line-clamp-4 leading-snug">{post.content}</p>
    </div>
  );
}

export default function PublicProfilePage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [myGroups, setMyGroups] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: { user } }, profileRes, postsRes, groupsRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('posts').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
        supabase.from('group_members').select('group_id').eq('user_id', userId),
      ]);

      setCurrentUserId(user?.id ?? null);

      if (!profileRes.data) { setNotFound(true); setLoading(false); return; }
      setProfile(profileRes.data);
      if (postsRes.data) setPosts(postsRes.data);

      if (groupsRes.data && groupsRes.data.length > 0) {
        const ids = groupsRes.data.map(m => m.group_id);
        const { data: gData } = await supabase.from('groups').select('name').in('id', ids);
        if (gData) setMyGroups(gData);
      }

      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !profile) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <UserCircle className="w-16 h-16 text-gray-700" />
      <p className="text-white font-semibold text-lg">User Not Found</p>
      <p className="text-gray-500 text-sm">This profile doesn't exist or hasn't been set up.</p>
    </div>
  );

  const branchName = profile.branch_code === 100 ? 'CSE' : profile.branch_code === 101 ? 'ECE' : profile.branch_code === 102 ? 'DSAI' : 'N/A';
  const isOwnProfile = currentUserId === profile.id;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="glass-panel rounded-2xl p-6 border border-gray-800 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neonCyan to-neonPurple flex items-center justify-center shadow-[0_0_25px_rgba(0,255,255,0.3)] shrink-0">
            <span className="text-3xl font-black text-black uppercase">{profile.handle.substring(0, 2)}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">@{profile.handle}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-neonCyan/10 text-neonCyan border border-neonCyan/20 text-xs uppercase font-semibold">{profile.role}</span>
              {profile.is_mentor && (
                <span className="px-2 py-0.5 rounded-full bg-neonPurple/10 text-neonPurple border border-neonPurple/20 text-xs uppercase font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Mentor
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 text-xs">{branchName}</span>
              {profile.batch_year > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 text-xs">Class of {profile.batch_year}</span>
              )}
            </div>
            {isOwnProfile && (
              <p className="text-xs text-neonCyan mt-2 italic">This is your public profile</p>
            )}
          </div>
          <div className="text-center sm:text-right">
            <p className="text-3xl font-black text-white">{posts.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Posts</p>
          </div>
        </div>

        {/* ── Channels (public) ── */}
        {myGroups.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-neonPurple" /> Channels
            </h2>
            <div className="flex flex-wrap gap-2">
              {myGroups.map((g, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-xs">
                  # {g.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Posts Grid ── */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-neonCyan" /> Posts
          </h2>
          {posts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-gray-800 text-center">
              <p className="text-4xl mb-3 opacity-20">🎬</p>
              <p className="text-gray-500">No posts yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map(post => (
                <motion.button
                  key={post.id}
                  whileHover={{ scale: 0.97 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square rounded-lg overflow-hidden border border-gray-800 hover:border-neonCyan/40 transition-all"
                >
                  <PostThumbnail post={post} />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Public Post View Modal ── */}
      <AnimatePresence>
        {selectedPost && (
          <PublicPostModal
            post={selectedPost}
            currentUserId={currentUserId}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Read-only post viewer with comments ──────────────────────────────────────
function PublicPostModal({ post, currentUserId, onClose }: {
  post: Post;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const ytId = post.video_url ? getYouTubeId(post.video_url) : null;

  useEffect(() => {
    supabase.from('post_comments').select('*').eq('post_id', post.id).order('created_at').then(({ data }) => {
      if (data) setComments(data);
    });

    const ch = supabase.channel(`pub:cmt:${post.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${post.id}`
      }, (p) => setComments(prev => [...prev, p.new as PostComment]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [post.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId || !text.trim()) return;
    setSending(true);
    await supabase.from('post_comments').insert({ post_id: post.id, user_id: currentUserId, content: text.trim() });
    setText('');
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Media */}
        <div className="h-52 relative bg-gray-950 overflow-hidden shrink-0">
          {ytId ? (
            <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
          ) : post.video_url ? (
            <video src={post.video_url} className="w-full h-full object-cover" muted playsInline autoPlay loop />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-6">
              <p className="text-white text-lg font-semibold text-center">{post.content}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent pointer-events-none" />
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Caption */}
        {post.content && (
          <div className="px-5 pt-4 pb-2 shrink-0">
            <p className="text-sm text-gray-300">{post.content}</p>
            <p className="text-[11px] text-gray-600 mt-1">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* Comments */}
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-1">
            <MessageCircle className="w-3 h-3" /> {comments.length} Comments
          </p>
          {comments.length === 0 ? (
            <p className="text-gray-600 text-sm italic">No comments yet.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-neonCyan shrink-0">
                  {c.user_id.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">@{c.user_id.slice(0, 10)}</p>
                  <p className="text-sm text-gray-200 leading-snug">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        {currentUserId ? (
          <form onSubmit={submit} className="flex gap-2 px-4 py-3 border-t border-gray-800 shrink-0">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neonCyan transition-colors placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="p-2.5 bg-neonCyan text-black rounded-full disabled:opacity-40 hover:bg-neonPurple hover:text-white transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <p className="text-center text-sm text-gray-600 py-3">Login to comment</p>
        )}
      </motion.div>
    </div>
  );
}
