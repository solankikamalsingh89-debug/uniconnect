"use client";
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * This component listens for real-time inserts on 
 * `messages` and `notices` tables and shows Sonner toasts.
 * Mount this inside the dashboard layout.
 */
export default function RealtimeNotifications() {
  useEffect(() => {
    const supabase = createClient();

    // Listen for new notices
    const noticeChannel = supabase
      .channel('realtime:notices')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notices' },
        (payload) => {
          const notice = payload.new as any;
          toast('📢 New Notice', {
            description: notice.title,
            duration: 6000,
          });
        }
      )
      .subscribe();

    // Listen for new messages
    const messageChannel = supabase
      .channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any;
          toast('💬 New Message', {
            description: msg.content?.slice(0, 80),
            duration: 4000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(noticeChannel);
      supabase.removeChannel(messageChannel);
    };
  }, []);

  return null; // Invisible listener component
}
