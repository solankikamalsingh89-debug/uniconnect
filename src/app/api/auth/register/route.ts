import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseIIITNREmail } from '@/lib/identity-parser';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // 1. Validate domain
    if (!email || !email.endsWith('@iiitnr.edu.in')) {
      return NextResponse.json(
        { error: 'Only @iiitnr.edu.in emails are allowed.' },
        { status: 403 }
      );
    }

    // 2. Parse identity
    const identity = parseIIITNREmail(email);
    if (!identity) {
      return NextResponse.json(
        { error: 'Invalid email format. Expected: nameYYCCC@iiitnr.edu.in' },
        { status: 400 }
      );
    }

    // Use direct Supabase client (not SSR cookie-based) for API routes
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_url_here') {
      return NextResponse.json(
        { error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Sign up via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Auth signup succeeded but no user ID returned.' }, { status: 500 });
    }

    // 4. Insert user profile
    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      email,
      handle: identity.handle,
      batch_year: identity.batch_year,
      branch_code: identity.branch_code,
      role: 'student',
      is_mentor: false,
    });

    if (profileError) {
      console.error('[Register] Profile insert error:', profileError);
      // Don't fail completely — auth user was created, profile can be retried
    }

    // 5. Auto-join default groups
    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .in('name', ['All College', `Batch ${identity.batch_year}`, identity.branch_name]);

    if (groups && groups.length > 0) {
      const memberships = groups.map(g => ({
        group_id: g.id,
        user_id: userId,
      }));
      await supabase.from('group_members').insert(memberships);
    }

    return NextResponse.json({
      success: true,
      message: 'User registered and auto-joined default groups.',
      parsed: identity,
    });

  } catch (error: any) {
    console.error('[Register] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
