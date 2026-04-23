import { createClient as _createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single shared client with no-store cache for server components
export const supabase = _createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
      fetch(url, { ...options, cache: 'no-store' }),
  },
});

// Browser client for auth operations only (login/logout)
export function createClient() {
  const { createBrowserClient } = require('@supabase/ssr');
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
