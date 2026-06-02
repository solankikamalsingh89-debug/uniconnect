"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Trash2, Hash, User, Plus, X, Search, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Group {
  id: string;
  name: string;
  description: string | null;
  is_direct_message: boolean;
}

interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  handle: string;
  role: string;
}

export default function GroupsPage() {
  const supabase = createClient();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Map of userId -> handle for all message senders
  const [handleCache, setHandleCache] = useState<Record<string, string>>({});
  // DM group metadata: groupId -> other user's handle
  const [dmHandles, setDmHandles] = useState<Record<string, string>>({});
  const [showNewDM, setShowNewDM] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Fetch groups the user belongs to
  const fetchGroups = useCallback(async (uid: string) => {
    const { data: memberships } = await supabase
      .from('group_members').select('group_id').eq('user_id', uid);
    if (!memberships?.length) return;

    const groupIds = memberships.map(m => m.group_id);
    const { data: gData } = await supabase
      .from('groups').select('*').in('id', groupIds).order('created_at', { ascending: true });
    if (!gData) return;

    setMyGroups(gData);
    if (!selectedGroup && gData.length > 0) setSelectedGroup(gData[0].id);

    // For DM groups, find the other person's handle
    const dmGroups = gData.filter(g => g.is_direct_message);
    if (dmGroups.length > 0 && uid) {
      const dmMap: Record<string, string> = {};
      await Promise.all(dmGroups.map(async (g) => {
        const { data: members } = await supabase
          .from('group_members').select('user_id').eq('group_id', g.id);
        const otherUserId = members?.find(m => m.user_id !== uid)?.user_id;
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('users').select('handle').eq('id', otherUserId).single();
          if (profile) dmMap[g.id] = profile.handle;
        }
      }));
      setDmHandles(dmMap);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (currentUserId) fetchGroups(currentUserId);
  }, [currentUserId]);

  // Fetch messages + realtime
  useEffect(() => {
    if (!selectedGroup) return;
    async function fetchMessages() {
      const { data } = await supabase
        .from('messages').select('*').eq('group_id', selectedGroup)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        // Fetch handles for all senders we don't have yet
        const unknownIds = Array.from(new Set(data.map(m => m.sender_id)))
          .filter(id => !handleCache[id]);
        if (unknownIds.length > 0) {
          const { data: profiles } = await supabase
            .from('users').select('id, handle').in('id', unknownIds);
          if (profiles) {
            setHandleCache(prev => {
              const next = { ...prev };
              profiles.forEach(p => { next[p.id] = p.handle; });
              return next;
            });
          }
        }
      }
    }
    fetchMessages();

    const channel = supabase.channel(`room:${selectedGroup}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${selectedGroup}` },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          // Fetch handle for new sender if not cached
          if (!handleCache[msg.sender_id]) {
            const { data } = await supabase
              .from('users').select('handle').eq('id', msg.sender_id).single();
            if (data) setHandleCache(prev => ({ ...prev, [msg.sender_id]: data.handle }));
          }
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${selectedGroup}` },
        (payload) => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !currentUserId) return;
    const content = newMessage.trim();
    setNewMessage('');
    await supabase.from('messages').insert({ group_id: selectedGroup, sender_id: currentUserId, content });
  }

  async function deleteMessage(messageId: string) {
    if (!currentUserId) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
    await supabase.from('messages').delete().eq('id', messageId).eq('sender_id', currentUserId);
  }

  // Start or open existing DM
  async function startDM(otherUserId: string, otherHandle: string) {
    if (!currentUserId) return;
    setShowNewDM(false);

    // Check if DM already exists between these two users
    const { data: myDMs } = await supabase
      .from('group_members').select('group_id').eq('user_id', currentUserId);
    const myDMIds = myDMs?.map(m => m.group_id) ?? [];

    if (myDMIds.length > 0) {
      const { data: existingDMs } = await supabase
        .from('groups').select('id').eq('is_direct_message', true).in('id', myDMIds);
      for (const dm of existingDMs ?? []) {
        const { data: members } = await supabase
          .from('group_members').select('user_id').eq('group_id', dm.id);
        const memberIds = members?.map(m => m.user_id) ?? [];
        if (memberIds.includes(otherUserId)) {
          setSelectedGroup(dm.id);
          return;
        }
      }
    }

    // Create new DM group
    const { data: newGroup } = await supabase.from('groups').insert({
      name: `dm_${currentUserId}_${otherUserId}`,
      description: null,
      is_direct_message: true,
    }).select().single();

    if (newGroup) {
      await supabase.from('group_members').insert([
        { group_id: newGroup.id, user_id: currentUserId },
        { group_id: newGroup.id, user_id: otherUserId },
      ]);
      setDmHandles(prev => ({ ...prev, [newGroup.id]: otherHandle }));
      setMyGroups(prev => [...prev, newGroup]);
      setSelectedGroup(newGroup.id);
    }
  }

  const selectedGroupData = myGroups.find(g => g.id === selectedGroup);
  const channelGroups = myGroups.filter(g => !g.is_direct_message);
  const dmGroups = myGroups.filter(g => g.is_direct_message);

  function getDisplayName(group: Group) {
    return group.is_direct_message ? (dmHandles[group.id] ?? 'DM') : group.name;
  }

  function getSenderName(senderId: string) {
    if (senderId === currentUserId) return 'You';
    return handleCache[senderId] ? `@${handleCache[senderId]}` : `@${senderId.slice(0, 8)}`;
  }

  return (
    <div className="flex h-full bg-background relative overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 glass-panel border-r border-gray-800 flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Messages</h2>
            <button
              onClick={() => setShowNewDM(true)}
              className="p-1.5 rounded-lg bg-neonCyan/10 text-neonCyan hover:bg-neonCyan/20 transition-all border border-neonCyan/20"
              title="New Direct Message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Channels */}
          {channelGroups.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest px-3 mb-1">Channels</p>
              <div className="space-y-1">
                {channelGroups.map(group => {
                  const isSelected = selectedGroup === group.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                        isSelected ? 'bg-neonCyan/10 text-white border border-neonCyan/30' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                      }`}
                    >
                      <Hash className={`w-4 h-4 shrink-0 ${isSelected ? 'text-neonCyan' : ''}`} />
                      <span className="text-sm font-medium truncate">{group.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DMs */}
          {dmGroups.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest px-3 mb-1">Direct Messages</p>
              <div className="space-y-1">
                {dmGroups.map(group => {
                  const isSelected = selectedGroup === group.id;
                  const handle = dmHandles[group.id] ?? '...';
                  return (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                        isSelected ? 'bg-neonPurple/10 text-white border border-neonPurple/30' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isSelected ? 'bg-neonPurple/30 text-white' : 'bg-gray-800 text-gray-500'}`}>
                        {handle.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate">@{handle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {myGroups.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-8">No chats yet</p>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col h-full bg-black/40 overflow-hidden">
        {/* Header */}
        {selectedGroupData ? (
          <div className="glass-panel border-b border-gray-800 px-5 py-3.5 shrink-0 flex items-center gap-3">
            {selectedGroupData.is_direct_message ? (
              <>
                <div className="w-9 h-9 rounded-full bg-neonPurple/20 border border-neonPurple/30 flex items-center justify-center text-sm font-bold text-neonPurple">
                  {(dmHandles[selectedGroupData.id] ?? '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">@{dmHandles[selectedGroupData.id] ?? '...'}</p>
                  <p className="text-[10px] text-gray-500">Direct Message</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-full bg-neonCyan/10 border border-neonCyan/20 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-neonCyan" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{selectedGroupData.name}</p>
                  {selectedGroupData.description && (
                    <p className="text-[10px] text-gray-500">{selectedGroupData.description}</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <MessageCircle className="w-12 h-12 text-gray-800" />
            <p className="text-gray-500 text-sm">Select a chat to start messaging</p>
            <button onClick={() => setShowNewDM(true)} className="text-neonCyan text-xs hover:underline">
              Or start a new direct message
            </button>
          </div>
        )}

        {/* Messages */}
        {selectedGroupData && (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-600 text-sm">No messages yet — say hello!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative flex flex-col max-w-[72%] ${isMine ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      {/* Sender handle */}
                      <span className={`text-[10px] mb-1 px-1 ${isMine ? 'text-neonCyan' : 'text-gray-500'}`}>
                        {getSenderName(msg.sender_id)}
                      </span>

                      <div className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? 'bg-neonCyan/15 border border-neonCyan/25 text-white rounded-tr-sm'
                          : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-[9px] text-gray-600 mt-1 block text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {isMine && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="absolute -left-9 top-1/2 -translate-y-1/2 p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-800 flex gap-2 shrink-0 bg-black/60">
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={selectedGroupData.is_direct_message
                  ? `Message @${dmHandles[selectedGroupData.id] ?? '...'}…`
                  : `Message #${selectedGroupData.name}…`}
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neonCyan transition-colors placeholder:text-gray-600"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2.5 bg-neonCyan text-black rounded-xl disabled:opacity-30 hover:bg-neonPurple hover:text-white transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>

      {/* New DM Modal */}
      <AnimatePresence>
        {showNewDM && (
          <NewDMModal
            currentUserId={currentUserId}
            onSelect={startDM}
            onClose={() => setShowNewDM(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── New DM Modal ─────────────────────────────────────────────────────────────
function NewDMModal({ currentUserId, onSelect, onClose }: {
  currentUserId: string | null;
  onSelect: (userId: string, handle: string) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('users').select('id, handle, role')
        .ilike('handle', `%${query.trim()}%`)
        .neq('id', currentUserId ?? '')
        .limit(8);
      if (data) setResults(data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">New Direct Message</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by handle…"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-neonCyan transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto border-t border-gray-800/50">
          {searching ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 && query ? (
            <p className="text-center text-gray-600 text-xs py-6">No users found</p>
          ) : (
            results.map(user => (
              <button
                key={user.id}
                onClick={() => onSelect(user.id, user.handle)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors border-b border-gray-900/50 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-neonPurple/20 border border-neonPurple/30 flex items-center justify-center text-xs font-bold text-white">
                  {user.handle.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">@{user.handle}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{user.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
