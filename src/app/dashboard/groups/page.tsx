"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Group, Message } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { Send, Trash2, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GroupsPage() {
  const supabase = createClient();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Fetch only the groups the user is a member of (normal flat list)
  useEffect(() => {
    if (!currentUserId) return;
    async function fetchMyChats() {
      // Get memberships
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId);

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map(m => m.group_id);
        // Get the detailed group info for these IDs
        const { data: gData } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)
          .order('created_at', { ascending: true });
        
        if (gData) {
          setMyGroups(gData);
          // Auto-select the first one if nothing is selected
          if (!selectedGroup && gData.length > 0) {
            setSelectedGroup(gData[0].id);
          }
        }
      }
    }
    fetchMyChats();
  }, [currentUserId]);

  // Fetch messages for selected group + realtime subscription
  useEffect(() => {
    if (!selectedGroup) return;

    // Fetch existing messages
    async function fetchMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', selectedGroup)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    }
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`room:${selectedGroup}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${selectedGroup}` },
        (payload) => {
          setMessages(prev => {
            // prevent duplication if optimistic update was fast
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${selectedGroup}` },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroup]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !currentUserId) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // clear input early for UX

    await supabase.from('messages').insert({
      group_id: selectedGroup,
      sender_id: currentUserId,
      content: messageContent,
    });
  }

  async function deleteMessage(messageId: string) {
    if (!currentUserId) return;
    // Optimistic remove
    setMessages(prev => prev.filter(m => m.id !== messageId));
    // Supabase delete
    await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUserId);
  }

  const selectedGroupData = myGroups.find(g => g.id === selectedGroup);

  return (
    <div className="flex h-full bg-background relative overflow-hidden">
      {/* Sidebar - Flat List of Normal Chats */}
      <div className="w-80 glass-panel border-r border-gray-800 flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-gray-800 shrink-0 shadow-sm">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neonCyan to-neonPurple flex items-center gap-2">
            Messages
          </h2>
          <p className="text-xs text-gray-500 mt-1">Your registered channels</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {myGroups.length === 0 && (
            <div className="text-center p-4">
              <p className="text-gray-500 text-sm italic">You don't have any active chats yet.</p>
            </div>
          )}
          {myGroups.map(group => {
            const isSelected = selectedGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-neonCyan/10 to-transparent border-neonCyan/40 shadow-[inset_2px_0_0_#00ffff]'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-neonCyan/20 text-neonCyan' : 'bg-gray-800 text-gray-400'}`}>
                     <Hash className="w-5 h-5" />
                   </div>
                   <div className="text-left flex flex-col">
                     <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                       {group.name}
                     </span>
                     {group.description && (
                       <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{group.description}</span>
                     )}
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full h-full bg-black/40">
        {/* Chat header */}
        {selectedGroupData && (
          <div className="glass-panel border-b border-gray-800 px-6 py-4 shrink-0 z-10 flex items-center justify-between bg-black/60 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neonCyan/10 text-neonCyan flex items-center justify-center border border-neonCyan/30">
                 <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg tracking-wide">
                  {selectedGroupData.name}
                </h3>
                {selectedGroupData.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{selectedGroupData.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {!selectedGroup ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Hash className="w-16 h-16 text-gray-800 mb-4" />
              <p className="text-gray-400 text-lg font-medium">Select a Chat to Start Messaging</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                 <Send className="w-6 h-6 text-gray-600" />
               </div>
               <p className="text-gray-400 font-medium tracking-wide">Say Hello!</p>
               <p className="text-gray-600 text-sm mt-1">Be the first one to drop a message here.</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === currentUserId;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id}
                  className={`group relative max-w-[75%] p-4 rounded-2xl text-sm shadow-sm ${
                    isMine
                      ? 'ml-auto bg-neonCyan/20 border border-neonCyan/30 text-white rounded-tr-sm shadow-[0_4px_20px_rgba(0,255,255,0.05)]'
                      : 'mr-auto glass-panel border border-gray-800 text-gray-200 rounded-tl-sm'
                  }`}
                >
                  {/* Delete Button (visible on hover for user's own messages) */}
                  {isMine && (
                    <button 
                      onClick={() => deleteMessage(msg.id)}
                      className="absolute -left-12 top-1/2 -transform -translate-y-1/2 p-2 bg-gray-900 text-red-500 hover:text-red-400 hover:bg-gray-800 rounded-full opacity-0 group-hover:opacity-100 transition-all border border-gray-800 shadow-md flex items-center justify-center"
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-center gap-2 mb-1.5 border-b border-gray-700/30 pb-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isMine ? 'bg-neonCyan/40 text-black' : 'bg-gray-700 text-white'}`}>
                      {isMine ? 'Me' : msg.sender_id.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isMine ? 'text-neonCyan' : 'text-gray-500'}`}>
                      {isMine ? 'You' : `User_${msg.sender_id.slice(0, 6)}`}
                    </span>
                  </div>
                  
                  <p className="leading-relaxed whitespace-pre-wrap text-[15px]">{msg.content}</p>
                  
                  <span className="text-[9px] text-gray-500/60 absolute bottom-1 right-2">
                     {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-1 shrink-0" />
        </div>

        {/* Message Input Form */}
        {selectedGroup && (
          <form onSubmit={sendMessage} className="p-4 glass-panel border-t border-gray-800 flex gap-3 shrink-0 z-10 bottom-0 relative bg-black/80 backdrop-blur-2xl">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-gray-950 border border-gray-700 rounded-2xl py-4 px-5 text-white text-[15px] focus:outline-none focus:border-neonCyan transition-all shadow-inner placeholder:text-gray-600"
              placeholder="Start typing your message..."
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-neonCyan text-black px-6 py-4 rounded-2xl font-bold hover:bg-neonPurple hover:text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,255,0.2)] disabled:shadow-none min-w-[100px]"
            >
              <Send className="w-5 h-5" /> 
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
