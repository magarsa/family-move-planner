# 🏡 Family Move Planner
### Des Moines, IA → Charlotte, NC

A private collaborative web app for Safal & Prativa to manage every aspect of their family relocation — decision branches, to-do lists, what-if scenarios, session notes, and key facts — all synced in real-time between both users.

---

## Stack

- **Framework:** React + TypeScript (Vite)
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (Postgres + real-time subscriptions)
- **Hosting:** GitHub Pages (static SPA)

---

## Setup Guide

### 1. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Once created, go to **SQL Editor** and run the contents of [`supabase/migration.sql`](./supabase/migration.sql)
3. Note your project URL and keys (Project Settings → API)

### 2. Clone and configure

```bash
git clone https://github.com/your-username/family-move-planner.git
cd family-move-planner
npm install
```

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> ⚠️ **Never commit `.env` to git.** It's already in `.gitignore`.

### 3. Seed the database

This imports all decision branches, to-do items, what-if scenarios, and session notes from the markdown source file:

```bash
node scripts/seed.js
```

The seed script is **idempotent** — safe to re-run. It skips tables that already have data (profile fields are always upserted).

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173/family-move-planner/](http://localhost:5173/family-move-planner/)

### 5. Deploy to GitHub Pages

#### Add secrets to GitHub

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add two repository secrets:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

#### Enable GitHub Pages

1. Go to **Settings → Pages**
2. Set Source to **GitHub Actions**

#### Push to deploy

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will build and deploy automatically. Your app will be live at:

```
https://your-username.github.io/family-move-planner/
```

---

## Features

| Section | Description |
|---|---|
| **Dashboard** | Progress overview, timeline, quick stats, recent notes |
| **To-Do List** | Priority tiers (🔴🟡🟢🔵), checkboxes with who/when, real-time sync |
| **Decisions** | 6 decision branches with options, pros/cons, status tracking |
| **What-Ifs** | Scenario planning with status (Unplanned → Triggered → Resolved) |
| **Journal** | Chronological session notes, attributed to Safal or Prativa |
| **Our Profile** | Key facts table, inline editable, tracks who updated each field |

## Collaboration

- No login required — choose your name (Safal or Prativa) on first visit, stored in `localStorage`
- All changes sync in **real-time** via Supabase subscriptions — no refresh needed
- Changes show who made them and when

---

## Project Structure

```
family-move-planner/
├── .github/workflows/deploy.yml   # Auto-deploy to GitHub Pages
├── scripts/seed.js                # One-time DB seed from markdown data
├── supabase/migration.sql         # Run once in Supabase SQL editor
├── src/
│   ├── components/                # Layout, Sidebar, UserSetup
│   ├── hooks/useUser.ts           # localStorage user state
│   ├── lib/supabase.ts            # Supabase client
│   ├── types/database.ts          # TypeScript types for all tables
│   └── views/                     # Dashboard, Todos, Branches, Whatifs, Notes, Profile
└── .env.example                   # Copy to .env and fill in
```
