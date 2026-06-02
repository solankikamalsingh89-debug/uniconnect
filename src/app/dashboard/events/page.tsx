"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface EventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  organizer_id: string;
  created_at: string;
}

type EventCategory = 'upcoming' | 'present' | 'previous';

function categorizeEvent(eventDate: string): EventCategory {
  const now = new Date();
  const date = new Date(eventDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (eventDay.getTime() === today.getTime()) return 'present';
  if (eventDay > today) return 'upcoming';
  return 'previous';
}

const categoryConfig = {
  upcoming: { label: 'Upcoming', icon: Calendar, color: 'neonCyan', border: 'border-neonCyan/30' },
  present: { label: 'Happening Now', icon: Clock, color: 'green-400', border: 'neon-border-cyan' },
  previous: { label: 'Previous', icon: CheckCircle, color: 'gray-500', border: 'border-gray-800' },
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });

    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });
      if (data) setEvents(data);
      setLoading(false);
    }
    fetchEvents();

    // Listen for new events dynamically
    const channel = supabase
      .channel('public:events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        setEvents(prev => {
           // insert and sort
           const newEvents = [...prev, payload.new as EventItem];
           return newEvents.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const categorized = {
    upcoming: events.filter(e => categorizeEvent(e.event_date) === 'upcoming'),
    present: events.filter(e => categorizeEvent(e.event_date) === 'present'),
    previous: events.filter(e => categorizeEvent(e.event_date) === 'previous'),
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 h-full overflow-y-auto relative">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neonCyan to-neonPurple">
          🎯 Campus Events
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-neonCyan hover:text-neonCyan text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-neonCyan/20"
        >
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 flex-1">
          <div className="w-8 h-8 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 flex-1 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-lg">No events yet</p>
          <p className="text-gray-600 text-sm mt-1">Events will appear once added to the database</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 text-neonCyan hover:underline text-sm font-medium"
          >
            Create the first campus event!
          </button>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-3 pb-20">
          {(['upcoming', 'present', 'previous'] as EventCategory[]).map(cat => {
            const config = categoryConfig[cat];
            const Icon = config.icon;
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 rounded-2xl flex flex-col gap-4 self-start"
              >
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
                  <Icon className={`w-5 h-5 text-${config.color}`} />
                  <h2 className="text-lg font-bold text-white">{config.label}</h2>
                  <span className="text-xs text-gray-600 ml-auto">{categorized[cat].length}</span>
                </div>
                {categorized[cat].length === 0 ? (
                  <p className="text-gray-600 text-sm italic py-4 text-center">None</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {categorized[cat].map(event => (
                      <motion.div
                        key={event.id}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${config.border} hover:bg-gray-800/60`}
                      >
                        <h3 className="font-bold text-white text-sm">{event.title}</h3>
                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{event.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <span className="text-[10px] text-gray-600">By @{event.organizer_id ? event.organizer_id.slice(0, 8) : 'admin'}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <CreateEventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
}

function CreateEventModal({ isOpen, onClose, currentUserId }: { isOpen: boolean, onClose: () => void, currentUserId: string | null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) {
      toast.error('You must be logged in to create an event');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.from('events').insert({
      title: title.trim(),
      description: description.trim(),
      event_date: new Date(eventDate).toISOString(),
      organizer_id: currentUserId,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Event created and broadcasted!');
      setTitle('');
      setDescription('');
      setEventDate('');
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel w-full max-w-md rounded-2xl p-6 border border-gray-700 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">Create Campus Event</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Event Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hackathon Kickoff"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonCyan transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Date & Time</label>
            <input
              required
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonCyan transition-all [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this event about?"
              maxLength={500}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neonCyan transition-all min-h-[100px] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !description.trim() || !eventDate}
            className="mt-2 w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 bg-neonCyan text-black hover:bg-neonPurple hover:text-white"
          >
            {loading ? 'Creating...' : 'Publish Event'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
