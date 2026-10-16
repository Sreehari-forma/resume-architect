import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';

function redirectWithinBrowserOrigin(path: '/dashboard' | '/login?error=confirmation') {
  // A relative Location preserves the host receiving the auth cookies, even if
  // Next's internal request URL uses a different loopback alias. Paths are fixed.
  return new NextResponse(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code && hasSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectWithinBrowserOrigin('/dashboard');
  }
  return redirectWithinBrowserOrigin('/login?error=confirmation');
}
