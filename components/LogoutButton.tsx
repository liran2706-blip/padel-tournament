'use client';

import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-blue-400 hover:text-white border border-blue-800 hover:border-blue-500 px-3 py-1.5 rounded-lg transition-colors"
    >
      התנתק
    </button>
  );
}
