import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseConfig, supabaseConfig } from '@/lib/supabase/config';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasSupabaseConfig()) return response;
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser verifies the token with Supabase; getSession alone is not authorization.
  await supabase.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/dashboard/:path*', '/studio/:path*', '/login', '/auth/:path*', '/api/:path*'] };
