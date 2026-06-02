"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, GraduationCap, Shield, UserCircle, Hash,
  Grid3X3, Trash2, Edit3, MessageCircle, X, Check, Play, Film
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  handle: string;
  batch_year: number;
  branch_code: number;
  role: string;
  is_mentor: boolean;
  created_at: string;
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

  if (ytId) {
    return (
      <div className="relative w-full h-full">
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          alt="thumbnail"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1.5 right-1.5">
          <Play className="w-4 h-4 text-white drop-shadow" />
        </div>
      </div>
    );
  }

  if (post.video_url) {
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-1">
        <Film className="w-7 h-7 text-gray-500" />
        <span className="text-[10px] text-gray-600">Video</span>
      </div>
    );
  }

  // Text post
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-3">
      <p className="text-white text-[11px] text-center line-clamp-4 leading-snug">{post.content}</p>
    </div>
  );
}

export default function OwnProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myGroups, setMyGroups] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [profileRes, postsRes, membersRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('posts').select('*').eq('author_id', user.id).order('created_at', { ascending: false }),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (postsRes.data) setMyPosts(postsRes.data);

      if (membersRes.data && membersRes.data.length > 0) {
        const ids = membersRes.data.map(m => m.group_id);
        const { data: groups } = await supabase.from('groups').select('id, name, description').in('id', ids);
        if (groups) setMyGroups(groups);
      }

      setLoading(false);
    }
    load();
  }, []);

  function onPostDeleted(postId: string) {
    setMyPosts(prev => prev.filter(p => p.id !== postId));
    setSelectedPost(null);
  }

  function onPostUpdated(postId: string, newContent: string) {
    setMyPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent } : p));
    if (selectedPost?.id === postId) setSelectedPost(prev => prev ? { ...prev, content: newContent } : prev);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <UserCircle className="w-16 h-16 text-gray-700" />
        <p className="text-white font-semibold">Profile not found</p>
        <p className="text-gray-500 text-sm">Please login again.</p>
      </div>
    );
  }

  const branchName = profile.branch_code === 100 ? 'CSE' : profile.branch_code === 101 ? 'ECE' : profile.branch_code === 102 ? 'DSAI' : 'N/A';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 flex flex-col gap-6">

        {/* ── Profile Header ── */}
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
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <p className="text-sm text-gray-400">{profile.email}</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-3xl font-black text-white">{myPosts.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Posts</p>
          </div>
        </div>

        {/* ── Posts Grid ── */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-neonCyan" /> My Posts
          </h2>

          {myPosts.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 border border-gray-800 text-center">
              <p className="text-5xl mb-3 opacity-20">🎬</p>
              <p className="text-gray-500">No posts yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {myPosts.map(post => (
                <motion.button
                  key={post.id}
                  whileHover={{ scale: 0.97 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square rounded-lg overflow-hidden border border-gray-800 hover:border-neonCyan/40 transition-all relative"
                >
                  <PostThumbnail post={post} />
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* ── Channels ── */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-neonPurple" /> My Channels
          </h2>
          {myGroups.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No channels joined.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {myGroups.map(g => (
                <div key={g.id} className="glass-panel px-4 py-3 rounded-xl border border-gray-800">
                  <p className="text-sm font-medium text-white"># {g.name}</p>
                  {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Post Management Modal ── */}
      <AnimatePresence>
        {selectedPost && (
          <PostManageModal
            post={selectedPost}
            currentUserId={profile.id}
            onClose={() => setSelectedPost(null)}
            onDeleted={onPostDeleted}
            onUpdated={onPostUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Post Management Modal ─────────────────────────────────────────────────────
function PostManageModal({ post, currentUserId, onClose, onDeleted, onUpdated }: {
  post: Post;
  currentUserId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, content: string) => void;
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.content ?? '');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const ytId = post.video_url ? getYouTubeId(post.video_url) : null;

  useEffect(() => {
    supabase.from('post_comments').select('*').eq('post_id', post.id).order('created_at').then(({ data }) => {
      if (data) setComments(data);
      setLoadingComments(false);
    });
  }, [post.id]);

  async function deletePost() {
    if (!confirm('Delete this post permanently?')) return;
    setDeleting(true);
    const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('author_id', currentUserId);
    if (error) { toast.error(error.message); setDeleting(false); }
    else { toast.success('Post deleted.'); onDeleted(post.id); }
  }

  async function saveCaption() {
    setSaving(true);
    const { error } = await supabase.from('posts').update({ content: editCaption }).eq('id', post.id).eq('author_id', currentUserId);
    if (error) { toast.error(error.message); }
    else { toast.success('Caption updated!'); onUpdated(post.id, editCaption); setIsEditing(false); }
    setSaving(false);
  }

  async function deleteComment(commentId: string) {
    await supabase.from('post_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    toast.success('Comment removed.');
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Media Preview */}
        <div className="h-52 relative bg-gray-950 overflow-hidden">
          {ytId ? (
            <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" className="w-full h-full object-cover" />
          ) : post.video_url ? (
            <video src={post.video_url} className="w-full h-full object-cover" muted playsInline />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-6">
              <p className="text-white text-lg font-semibold text-center line-clamp-5">{post.content}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Caption</p>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-xs text-neonCyan hover:text-white transition-colors">
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-neonCyan rounded-xl px-3 py-2 text-sm text-white resize-none min-h-[70px] transition-colors outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={saveCaption} disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neonCyan text-black rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-white transition-all">
                    <Check className="w-3 h-3" /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditCaption(post.content ?? ''); }}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs hover:bg-gray-700 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300">{post.content ?? <span className="italic text-gray-600">No caption</span>}</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" /> Comments ({comments.length})
            </p>
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-gray-600 text-sm italic">No comments yet.</p>
            ) : (
              <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-neonCyan shrink-0">
                      {c.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-500">@{c.user_id.slice(0, 10)}</p>
                      <p className="text-sm text-gray-200 leading-snug truncate">{c.content}</p>
                    </div>
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-400 transition-all shrink-0"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Posted date */}
          <p className="text-[11px] text-gray-600">
            Posted {new Date(post.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Delete button */}
          <button
            onClick={deletePost}
            disabled={deleting}
            className="w-full py-3 rounded-xl border border-red-800/50 bg-red-900/10 text-red-400 hover:bg-red-900/30 hover:text-red-300 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting…' : 'Delete Post'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
