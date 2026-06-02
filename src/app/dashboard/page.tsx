"use client";
import React, { useEffect, useState } from 'react';
import { Notice } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });

    async function fetchNotices() {
      const { data } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setNotices(data);
      setLoading(false);
    }
    fetchNotices();

    // Listen for new notices in real-time
    const channel = supabase
      .channel('realtime:notices-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notices' },
        (payload) => {
          setNotices(prev => [payload.new as Notice, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6 h-full overflow-y-auto relative">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neonCyan to-neonPurple">
          📢 Notices
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500 hidden sm:inline">Live</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 hover:border-neonPurple hover:text-neonPurple text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-neonPurple/20"
          >
            <Plus className="w-4 h-4" /> Add 
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 flex-1 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-lg">No notices yet</p>
          <p className="text-gray-600 text-sm mt-1">Notices will appear here in real-time</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 text-neonPurple hover:underline text-sm font-medium"
          >
            Add the first campus notice!
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="flex flex-col gap-4 pb-20">
            {notices.map((notice, idx) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-panel p-6 rounded-2xl border border-gray-800 hover:neon-border-cyan transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notice.posted_by === 'n8n_bot' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neonPurple/20 text-neonPurple border border-neonPurple/30 font-medium">
                          AI Summary
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-medium">
                          @{notice.posted_by?.slice(0,8) || 'student'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-white group-hover:text-neonCyan transition-colors">
                      {notice.title}
                    </h2>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">{notice.content_summary}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                    {notice.original_link && (
                      <a
                        href={notice.original_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-gray-900 border border-gray-800 text-gray-500 hover:text-neonCyan hover:border-neonCyan transition-all shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <CreateNoticeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
}

function CreateNoticeModal({ isOpen, onClose, currentUserId }: { isOpen: boolean, onClose: () => void, currentUserId: string | null }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      toast.error('You must be logged in to create a notice');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.from('notices').insert({
      title: title.trim(),
      content_summary: summary.trim(),
      original_link: link.trim() || null,
      posted_by: currentUserId,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Notice broadcasted to the campus!');
      setTitle('');
      setSummary('');
      setLink('');
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel w-full max-w-md rounded-2xl p-6 border border-gray-700 shadow-2xl relative bg-gray-900/90"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-gray-800 p-1.5 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Publish Notice</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase">Notice Title</label>
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. End Semester Exams Schedule"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonPurple transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase">Content Summary</label>
            <textarea
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief details about the notice..."
              maxLength={500}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonPurple transition-all min-h-[100px] resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block uppercase">External Link (Optional)</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://iiitnr.edu.in/... (optional)"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonPurple transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !summary.trim()}
            className="mt-4 w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 bg-neonPurple text-white hover:bg-white hover:text-black shadow-[0_0_15px_rgba(188,40,255,0.3)]"
          >
            {loading ? 'Publishing...' : 'Broadcast Notice'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
