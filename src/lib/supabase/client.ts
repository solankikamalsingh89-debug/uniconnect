import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === 'your_supabase_url_here') {
    // Return a no-op proxy so the app doesn't crash without Supabase configured
    console.warn('[UniConnect] Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient(url, key);
}
