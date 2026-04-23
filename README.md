# 🎾 טורניר פאדל — Mexican Padel Tournament Manager

A full-stack web application for managing a live Mexican Padel tournament.
Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- 20 players, 4 courts, 5 rounds
- Each player rests exactly once
- Automatic round generation based on standings
- Partner/opponent repeat minimization
- Hebrew UI with full RTL layout
- Mobile-first design for live tournament use

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/padel-tournament.git
cd padel-tournament
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once the project is ready, go to **SQL Editor**
4. Copy the contents of `supabase/schema.sql` and run it
5. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public** key

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
padel-tournament/
├── app/
│   ├── layout.tsx                    # Root layout (RTL, Hebrew)
│   ├── page.tsx                      # Home — list tournaments
│   ├── globals.css
│   └── tournament/
│       ├── new/
│       │   └── page.tsx              # Create new tournament
│       └── [id]/
│           ├── page.tsx              # Tournament dashboard
│           ├── setup/
│           │   ├── page.tsx          # Review players & start
│           │   └── StartTournamentButton.tsx
│           └── summary/
│               └── page.tsx          # Final standings
├── components/
│   ├── TournamentHeader.tsx
│   ├── RestingPlayersCard.tsx
│   ├── CourtMatchCard.tsx
│   ├── ResultsEntryForm.tsx          # Client component
│   ├── StandingsTable.tsx
│   ├── RoundHistory.tsx
│   ├── FinalSummaryTable.tsx
│   ├── LoadingState.tsx
│   └── EmptyState.tsx
├── lib/
│   ├── supabase/
│   │   └── client.ts                 # Supabase browser client
│   └── tournament/
│       ├── scheduling.ts             # Core scheduling logic
│       └── db.ts                     # All DB operations
├── types/
│   └── index.ts                      # TypeScript types
├── supabase/
│   └── schema.sql                    # Database schema
└── .env.local.example
```

---

## Tournament Flow

1. **Home** → Create new tournament
2. **New Tournament** → Enter name + 20 player names (or use demo fill)
3. **Setup** → Review players → Start tournament
4. **Dashboard** (repeat for rounds 1–5):
   - View resting players and 4 court matchups
   - Enter scores for all 4 courts
   - App updates standings and generates next round automatically
5. **Summary** → Final standings, podium, round history, rest schedule

---

## Scoring Rules

- Each player receives points equal to their team's games won
- Game difference is tracked (winner: +diff, loser: -diff)
- Standings sorted by: total points → game difference → wins

---

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/padel-tournament.git
git push -u origin main
```

---

## Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click **Deploy**

Vercel will auto-detect Next.js and deploy correctly.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Supabase | Database & persistence |
| React | UI components |
