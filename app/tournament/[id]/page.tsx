'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';
import { Tournament, RegistrationWithProfile, TournamentRegistration, Profile } from '@/types';

type Tab = 'overview' | 'players' | 'standings';

const statusLabel: Record<string, string> = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
};

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

function Countdown({ date, time }: { date: string; time: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(`${date}T${time}:00`);
    function update() {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [date, time]);

  return (
    <div className="grid grid-cols-4 gap-2 my-4">
      {[
        { val: timeLeft.days, label: 'ימים' },
        { val: timeLeft.hours, label: 'שעות' },
        { val: timeLeft.minutes, label: 'דקות' },
        { val: timeLeft.seconds, label: 'שניות' },
      ].map((item) => (
        <div key={item.label} className="bg-blue-900/40 rounded-xl py-3 text-center">
          <p className="text-2xl font-black text-white tabular-nums">{String(item.val).padStart(2, '0')}</p>
          <p className="text-xs text-blue-300 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

type Player = {
  id: string;
  name: string;
  total_points: number;
  wins: number;
  losses: number;
  games_played: number;
  total_diff: number;
};

type Round = {
  id: string;
  round_number: number;
  status: string;
};

type Match = {
  id: string;
  round_id: string;
  court_number: number;
  team_a_player_1_id: string;
  team_a_player_2_id: string;
  team_b_player_1_id: string;
  team_b_player_2_id: string;
  score_a: number | null;
  score_b: number | null;
};

export default function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithProfile[]>([]);
  const [myReg, setMyReg] = useState<TournamentRegistration | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [medicalApproved, setMedicalApproved] = useState(false);
  const [showDeclaration, setShowDeclaration] = useState(false);

  // Standings
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [appTournamentId, setAppTournamentId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: t } = await supabase.from('tournaments').select('*').eq('id', id).single();
      setTournament(t);
      if (t?.app_tournament_id) setAppTournamentId(t.app_tournament_id);
      const { data: regs } = await supabase
        .from('tournament_registrations')
        .select('*, profile:profiles(*)')
        .eq('tournament_id', id)
        .order('created_at', { ascending: true });
      setRegistrations(regs ?? []);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        setProfile(p);
        const myR = regs?.find((r: any) => r.player_id === user.id) ?? null;
        setMyReg(myR);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (tab !== 'standings' || !appTournamentId) return;
    async function loadStandings() {
      setStandingsLoading(true);
      const supabase = createClient();
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('tournament_id', appTournamentId)
        .order('total_points', { ascending: false });
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('*')
        .eq('tournament_id', appTournamentId)
        .order('round_number', { ascending: true });
      if (roundsData && roundsData.length > 0) {
        const roundIds = roundsData.map((r: Round) => r.id);
        const { data: matchesData } = await supabase.from('matches').select('*').in('round_id', roundIds);
        setMatches(matchesData ?? []);
      }
      setPlayers(playersData ?? []);
      setRounds(roundsData ?? []);
      setStandingsLoading(false);
    }
    loadStandings();
    const interval = setInterval(loadStandings, 15000);
    return () => clearInterval(interval);
  }, [tab, appTournamentId]);

  async function handleRegister() {
    if (!profile) { window.location.href = `/login?next=/tournament/${id}`; return; }
    if (!medicalApproved) { setError('יש לאשר את ההצהרה הרפואית'); return; }
    setRegistering(true);
    setError('');
    const supabase = createClient();
    const { data, error: regError } = await supabase
      .from('tournament_registrations')
      .insert({ tournament_id: id, player_id: profile.id, status: 'pending' })
      .select('*, profile:profiles(*)')
      .single();
    if (regError) {
      setError('שגיאה בהרשמה. נסה שוב.');
    } else {
      setMyReg(data);
      setRegistrations((prev) => [...prev, data]);
      if ((tournament as any)?.paybox_url) {
        window.location.href = (tournament as any).paybox_url;
      }
    }
    setRegistering(false);
  }

  if (loading) return (<><Navbar /><div className="text-center py-20 text-slate-400">טוען...</div></>);
  if (!tournament) return (<><Navbar /><div className="text-center py-20 text-slate-400">טורניר לא נמצא</div></>);

  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const totalCount = registrations.length;
  const maxPlayers = tournament.max_players;
  const available = maxPlayers - approvedCount;
  const isFull = available <= 0;
  const fillPercent = Math.min(100, Math.round((approvedCount / maxPlayers) * 100));
  const isLow = available > 0 && available <= 4;
  const isPast = new Date(tournament.date) < new Date();
  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6" dir="rtl">

        <div className="bg-[#0a1628] text-white rounded-2xl p-5 mb-6 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400" />
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-black leading-tight">{tournament.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-blue-300 text-sm">
                <span>📍</span><span>{tournament.location}</span>
                <span className="text-blue-700">·</span>
                <span>רמה {tournament.level_min}–{tournament.level_max}</span>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              tournament.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
              isPast ? 'bg-slate-500/20 text-slate-300' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {tournament.status === 'active' ? '🔴 פעיל' : isPast ? 'הסתיים' : 'קרוב'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-300 text-xs mb-0.5">תאריך</p>
              <p className="font-bold text-sm">{new Date(tournament.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-blue-300 text-xs mb-0.5">שעות</p>
              <p className="font-bold text-sm">{tournament.time_start}–{tournament.time_end}</p>
            </div>
          </div>

          {!isPast && tournament.status !== 'active' && (
            <><p className="text-blue-300 text-xs text-center mb-1">מתחיל בעוד</p><Countdown date={tournament.date} time={tournament.time_start} /></>
          )}

          <div className="mb-4">
            <div className="flex justify-between text-xs text-blue-300 mb-1.5">
              <span>{approvedCount} נרשמו</span>
              <span>
                {isFull ? <span className="text-red-400 font-semibold">הטורניר מלא</span>
                  : isLow ? <span className="text-orange-400 font-semibold">נותרו {available} מקומות בלבד!</span>
                  : <span>נותרו {available} מקומות</span>}
              </span>
            </div>
            <div className="bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-blue-400'}`} style={{ width: `${fillPercent}%` }} />
            </div>
            <p className="text-right text-xs text-blue-500 mt-1">{approvedCount}/{maxPlayers} זוגות</p>
          </div>

          <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2.5 mb-4">
            <span className="text-blue-300 text-sm">דמי השתתפות</span>
            <span className="font-black text-xl">₪{tournament.price}<span className="text-xs text-blue-300 font-normal mr-1">לשחקן</span></span>
          </div>

          {!myReg ? (
            <div className="space-y-3">
              {isFull ? (
                <div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-xl p-3 text-center text-sm font-semibold">הטורניר מלא — כל המקומות תפוסים</div>
              ) : (
                <>
                  <div className="border border-blue-700 rounded-xl overflow-hidden">
                    <button type="button" onClick={() => setShowDeclaration(!showDeclaration)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-blue-900/40 text-blue-200 text-sm font-semibold">
                      <span>הצהרה רפואית</span><span>{showDeclaration ? '▲' : '▼'}</span>
                    </button>
                    {showDeclaration && (
                      <div className="px-4 py-3 text-blue-200 text-xs leading-relaxed space-y-1.5 max-h-44 overflow-y-auto bg-blue-950/40">
                        <p className="font-semibold">אני החתום מטה מצהיר ומאשר בזאת כי:</p>
                        <p>1. מצבי הבריאותי תקין, וכי אין לי כל מגבלה רפואית המונעת ממני להשתתף בפעילות ספורטיבית מסוג פאדל.</p>
                        <p>2. אני מודע לכך שהשתתפות בפעילות ספורטיבית כרוכה במאמץ פיזי ובסיכונים מסוימים, לרבות פציעות, נפילות או פגיעות גוף שונות.</p>
                        <p>3. אני לוקח על עצמי את מלוא האחריות להשתתפותי בטורניר, ומאשר כי ההשתתפות נעשית על אחריותי האישית בלבד.</p>
                        <p>4. אני מתחייב להפסיק את הפעילות באופן מיידי במקרה של תחושת כאב, סחרחורת או כל סימפטום חריג אחר.</p>
                        <p>5. אני מצהיר כי אין לי מחלה, פציעה או מצב רפואי אחר אשר עלול לסכן אותי או משתתפים אחרים במהלך הפעילות.</p>
                        <p>6. ידוע לי כי מארגני הטורניר אינם אחראים לכל נזק, פציעה או אובדן שעלולים להיגרם לי במהלך ההשתתפות, למעט במקרה של רשלנות מוכחת על פי דין.</p>
                        <p>7. אני מאשר כי האחריות לביטוח אישי, לרבות ביטוח תאונות אישיות, חלה עליי בלבד.</p>
                      </div>
                    )}
                    <label className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-blue-900/20">
                      <input type="checkbox" checked={medicalApproved} onChange={(e) => setMedicalApproved(e.target.checked)} className="w-5 h-5 rounded accent-blue-500 cursor-pointer" />
                      <span className="text-blue-200 text-sm">קראתי את ההצהרה הרפואית ואני מסכים לכל התנאים</span>
                    </label>
                  </div>
                  <button onClick={handleRegister} disabled={registering || !medicalApproved}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition-colors">
                    {registering ? 'נרשם...' : 'הרשמה לטורניר ←'}
                  </button>
                </>
              )}
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <div className={`rounded-xl p-3 text-center text-sm font-semibold ${statusColor[myReg.status]}`}>
                הסטטוס שלך: {statusLabel[myReg.status]}
              </div>
              {myReg.status === 'approved' && (tournament as any).whatsapp_url && (
                <a href={(tournament as any).whatsapp_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  הצטרף לקבוצת WhatsApp של הטורניר
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {([
            { key: 'overview', label: 'סקירה' },
            { key: 'players', label: `שחקנים ${totalCount}` },
            { key: 'standings', label: 'תוצאות' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <h3 className="font-bold text-slate-800 mb-3">פרטי הטורניר</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>רמת שחקנים</span><span className="font-semibold">{tournament.level_min}–{tournament.level_max}</span></div>
                <div className="flex justify-between"><span>מקסימום שחקנים</span><span className="font-semibold">{tournament.max_players}</span></div>
                <div className="flex justify-between"><span>נרשמו</span><span className="font-semibold">{totalCount}</span></div>
                <div className="flex justify-between"><span>מקומות פנויים</span>
                  <span className={`font-semibold ${isFull ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-green-600'}`}>{isFull ? 'מלא' : available}</span>
                </div>
              </div>
            </div>
            {tournament.description && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="font-bold text-slate-800 mb-2">תיאור</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{tournament.description}</p>
              </div>
            )}
            {(tournament as any).whatsapp_url && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h3 className="font-bold text-slate-800 mb-3">קבוצת WhatsApp</h3>
                {myReg?.status === 'approved' ? (
                  <a href={(tournament as any).whatsapp_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    הצטרף לקבוצת WhatsApp של הטורניר
                  </a>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-500">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    הקישור לקבוצה יהיה זמין לאחר אישור הרשמתך
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Players */}
        {tab === 'players' && (
          <div className="relative">
            {!profile && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
                <p className="text-slate-700 font-semibold mb-3">יש להתחבר כדי לצפות ברשימת השחקנים</p>
                <a href="/login" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">כניסה / הרשמה</a>
              </div>
            )}
            <div className={!profile ? 'blur-sm pointer-events-none select-none' : ''}>
              <div className="space-y-2">
                {registrations.length === 0 ? (
                  <p className="text-center text-slate-400 py-10">אין נרשמים עדיין</p>
                ) : registrations.map((reg, i) => (
                  <div key={reg.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {reg.profile.first_name.charAt(0)}{reg.profile.last_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{reg.profile.first_name} {reg.profile.last_name.charAt(0)}.</p>
                      <p className="text-xs text-slate-400">רמה {reg.profile.level}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">#{i + 1}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[reg.status]}`}>{statusLabel[reg.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Standings */}
        {tab === 'standings' && (
          <div className="relative">
            {!profile && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
                <p className="text-slate-700 font-semibold mb-3">יש להתחבר כדי לצפות בתוצאות</p>
                <a href="/login" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">כניסה / הרשמה</a>
              </div>
            )}
            <div className={!profile ? 'blur-sm pointer-events-none select-none' : ''}>
              {!appTournamentId ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-3xl mb-3">🏆</p>
                  <p className="font-medium text-slate-600">התוצאות יתעדכנו לאחר תחילת הטורניר</p>
                </div>
              ) : standingsLoading && players.length === 0 ? (
                <div className="text-center py-16 text-slate-400">טוען תוצאות...</div>
              ) : players.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-3xl mb-3">🏆</p>
                  <p className="font-medium text-slate-600">הטורניר טרם התחיל</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* טבלת דירוג */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-[#0a1628] px-4 py-3 flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">טבלת דירוג</h3>
                      <span className="text-xs text-blue-300">מתעדכן כל 15 שניות</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold text-slate-400">
                        <span className="col-span-1">#</span>
                        <span className="col-span-5">שחקן</span>
                        <span className="col-span-2 text-center">נצ׳</span>
                        <span className="col-span-2 text-center">הפ׳</span>
                        <span className="col-span-2 text-center">נק׳</span>
                      </div>
                      {players.map((player, i) => (
                        <div key={player.id} className={`grid grid-cols-12 px-4 py-3 items-center ${i < 3 ? 'bg-blue-50/50' : ''}`}>
                          <span className={`col-span-1 font-black text-sm ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-slate-500'}`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
                          <span className="col-span-5 font-semibold text-slate-800 text-sm truncate">{player.name}</span>
                          <span className="col-span-2 text-center text-green-600 font-semibold text-sm">{player.wins}</span>
                          <span className="col-span-2 text-center text-red-400 font-semibold text-sm">{player.losses}</span>
                          <span className="col-span-2 text-center font-black text-blue-600 text-sm">{player.total_points}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* תוצאות לפי סיבובים */}
                  {rounds.map((round) => {
                    const roundMatches = matches.filter(m => m.round_id === round.id);
                    const hasScores = roundMatches.some(m => m.score_a !== null);
                    return (
                      <div key={round.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <div className={`px-4 py-3 flex items-center justify-between ${round.status === 'active' ? 'bg-blue-600' : 'bg-slate-100'}`}>
                          <h3 className={`font-bold text-sm ${round.status === 'active' ? 'text-white' : 'text-slate-700'}`}>סיבוב {round.round_number}</h3>
                          {round.status === 'active' && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">🔴 פעיל</span>}
                          {round.status === 'completed' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ הסתיים</span>}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {roundMatches.length === 0 ? (
                            <p className="text-center text-slate-400 py-4 text-sm">אין משחקים</p>
                          ) : roundMatches.map((match) => (
                            <div key={match.id} className="px-4 py-3">
                              <p className="text-xs text-slate-400 mb-2">מגרש {match.court_number}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 text-right">
                                  <p className="text-sm font-semibold text-slate-800">{playerMap[match.team_a_player_1_id] ?? '?'}</p>
                                  <p className="text-sm font-semibold text-slate-800">{playerMap[match.team_a_player_2_id] ?? '?'}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {hasScores ? (
                                    <>
                                      <span className={`text-lg font-black w-8 text-center ${(match.score_a ?? 0) > (match.score_b ?? 0) ? 'text-green-600' : 'text-slate-400'}`}>{match.score_a ?? '-'}</span>
                                      <span className="text-slate-300">:</span>
                                      <span className={`text-lg font-black w-8 text-center ${(match.score_b ?? 0) > (match.score_a ?? 0) ? 'text-green-600' : 'text-slate-400'}`}>{match.score_b ?? '-'}</span>
                                    </>
                                  ) : (
                                    <span className="text-slate-300 text-sm px-2">VS</span>
                                  )}
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-semibold text-slate-800">{playerMap[match.team_b_player_1_id] ?? '?'}</p>
                                  <p className="text-sm font-semibold text-slate-800">{playerMap[match.team_b_player_2_id] ?? '?'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
