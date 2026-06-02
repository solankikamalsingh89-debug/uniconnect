import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Only protect /dashboard routes
  // Skip auth check if Supabase is not configured yet
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
    // Supabase not configured — allow all routes for development
    return NextResponse.next();
  }

  // Import dynamically to avoid crashing when env vars aren't set
  const { updateSession } = await import('@/lib/supabase/middleware');
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
