import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      const email = user.email || '';

      // FORCE RESTRICTION to @iiitnr.edu.in
      if (!email.endsWith('@iiitnr.edu.in')) {
         // Log them out immediately
         await supabase.auth.signOut();
         return NextResponse.redirect(`${origin}/auth?error=invalid_domain`);
      }

      // Check if user profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Try to parse the iiitnr email for auto-profile creation
        const { parseIIITNREmail } = await import('@/lib/identity-parser');
        const identity = parseIIITNREmail(email);

        if (identity) {
          // IIITNR email — create full profile
          await supabase.from('users').insert({
            id: user.id,
            email,
            handle: identity.handle,
            batch_year: identity.batch_year,
            branch_code: identity.branch_code,
            role: 'student',
            is_mentor: false,
          });

          // Auto-join default groups
          const { data: groups } = await supabase
            .from('groups')
            .select('id, name')
            .in('name', ['All College', `Batch ${identity.batch_year}`, identity.branch_name]);

          if (groups && groups.length > 0) {
            await supabase.from('group_members').insert(
              groups.map(g => ({ group_id: g.id, user_id: user.id }))
            );
          }
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to auth page with error
  return NextResponse.redirect(`${new URL(request.url).origin}/auth?error=auth_failed`);
}
