"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Search, Home, MessageSquare, Bell, Calendar, LogOut, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import RealtimeNotifications from '@/components/realtime-notifications';

interface SearchResult {
  id: string;
  handle: string;
  role: string;
  is_mentor: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  // Search users on input change
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('users')
        .select('id, handle, role, is_mentor')
        .ilike('handle', `%${query.trim()}%`)
        .limit(6);
      if (data) setResults(data);
      setShowDropdown(true);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function goToProfile(userId: string) {
    setShowDropdown(false);
    setQuery('');
    setResults([]);
    router.push(`/dashboard/profile/${userId}`);
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <RealtimeNotifications />

      {/* TopBar */}
      <header className="glass-panel border-b border-gray-800 px-4 py-3 z-50 flex items-center justify-between gap-4 shrink-0">
        <Link href="/dashboard" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neonCyan to-neonPurple whitespace-nowrap">
          UniConnect
        </Link>

        {/* Search with live dropdown */}
        <div ref={searchRef} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 z-10" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            placeholder="Search users by handle…"
            className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-10 pr-8 text-sm text-white focus:outline-none focus:border-neonCyan transition-colors"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dropdown results */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-[60]">
              {searching ? (
                <div className="flex items-center justify-center py-4 gap-2 text-gray-500 text-sm">
                  <div className="w-4 h-4 border-2 border-neonCyan border-t-transparent rounded-full animate-spin" />
                  Searching…
                </div>
              ) : results.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-4">No users found for &quot;{query}&quot;</p>
              ) : (
                results.map(user => (
                  <button
                    key={user.id}
                    onClick={() => goToProfile(user.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-900 transition-colors text-left border-b border-gray-900 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neonCyan/30 to-neonPurple/30 border border-gray-700 flex items-center justify-center text-sm font-bold text-white uppercase shrink-0">
                      {user.handle.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">@{user.handle}</p>
                      <div className="flex gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-500 uppercase">{user.role}</span>
                        {user.is_mentor && <span className="text-[10px] text-neonPurple">• Mentor</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/profile" className="text-gray-400 hover:text-neonCyan transition-colors p-2" title="Profile">
            <User className="w-5 h-5" />
          </Link>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors p-2" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      <nav className="glass-panel border-t border-gray-800 w-full z-50 px-2 py-2 flex justify-around shrink-0">
        <NavItem href="/dashboard/feed" icon={<Home className="w-5 h-5" />} label="Feed" active={pathname === '/dashboard/feed'} />
        <NavItem href="/dashboard/groups" icon={<MessageSquare className="w-5 h-5" />} label="Chats" active={pathname === '/dashboard/groups'} />
        <NavItem href="/dashboard" icon={<Bell className="w-5 h-5" />} label="Notices" active={pathname === '/dashboard'} />
        <NavItem href="/dashboard/events" icon={<Calendar className="w-5 h-5" />} label="Events" active={pathname === '/dashboard/events'} />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${active ? 'text-neonCyan' : 'text-gray-500 hover:text-gray-300'}`}>
      <div className={`p-1.5 rounded-lg transition-all ${active ? 'bg-neonCyan/10' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
