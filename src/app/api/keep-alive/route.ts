import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Perform a lightweight query to keep the database active
    // Fetching exactly 1 row from the users table is very cheap
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Keep-alive ping failed:', error);
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      status: 'success', 
      message: 'Supabase pinged successfully to prevent pausing',
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    console.error('Keep-alive error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
