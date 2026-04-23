'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleLogin() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('אימייל או סיסמה שגויים');
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl overflow-hidden mb-8 shadow-2xl">
          <Image
            src="/padel.png"
            alt="Mixing Padel"
            width={600}
            height={300}
            className="w-full object-cover max-h-44"
            priority
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">MIXING PADEL</h1>
          <p className="text-blue-400 mt-1">כניסה למערכת ניהול טורניר</p>
        </div>

        <div className="bg-[#0f2347] border border-blue-900 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-blue-300 mb-2">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="your@email.com"
              className="w-full bg-blue-950 border border-blue-800 rounded-xl px-4 py-3 text-white placeholder-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-300 mb-2">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-blue-950 border border-blue-800 rounded-xl px-4 py-3 text-white placeholder-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-lg py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-bold py-3.5 rounded-xl text-lg transition-colors mt-2"
          >
            {loading ? 'מתחבר...' : 'כניסה'}
          </button>
        </div>
      </div>
    </main>
  );
}
