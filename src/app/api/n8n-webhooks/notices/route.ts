import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Verify n8n webhook secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.N8N_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content_summary, original_link } = await request.json();

    if (!title || !content_summary) {
      return NextResponse.json({ error: 'Missing required fields: title, content_summary' }, { status: 400 });
    }

    // Use service-role level client for webhook inserts
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from('notices').insert({
      title,
      content_summary,
      original_link: original_link || null,
      posted_by: 'n8n_bot',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Supabase Realtime will auto-broadcast this INSERT to all connected clients,
    // which triggers the Sonner toast in RealtimeNotifications component.

    return NextResponse.json({ success: true, message: 'Notice published and broadcast to all users.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
