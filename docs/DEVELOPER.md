# Developer Reference — Family Move Planner

Technical knowledgebase for future development, debugging, and onboarding.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Supabase Edge Functions](#supabase-edge-functions)
6. [Authentication Model](#authentication-model)
7. [Real-Time Sync](#real-time-sync)
8. [Frontend Patterns](#frontend-patterns)
9. [Environment Variables](#environment-variables)
10. [Local Development](#local-development)
11. [CI/CD & Deployment](#cicd--deployment)
12. [External API Integrations](#external-api-integrations)
13. [Known Limitations](#known-limitations)
14. [Debugging Guide](#debugging-guide)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React + TypeScript | 18.x |
| Build tool | Vite | 6.x |
| Styling | Tailwind CSS | 3.x |
| Animations | Framer Motion | latest |
| Icons | Lucide React | latest |
| Routing | React Router v6 | 6.x |
| Database | Supabase (PostgreSQL) | — |
| Backend functions | Supabase Edge Functions (Deno) | — |
| AI | Anthropic Claude (claude-sonnet-4-6) | — |
| Hosting | Vercel | — |
| CI/CD | GitHub Actions | — |

---

## Project Structure

```
family-move-planner/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Type-check → build → Vercel deploy
├── docs/
│   ├── DEVELOPER.md                # This file
│   └── report-feature/             # Reference implementation snapshot for Reports feature
├── scripts/
│   └── seed.js                     # Idempotent DB seed script
├── supabase/
│   ├── migration.sql               # Full DB schema — run once in Supabase SQL Editor
│   ├── seed_schools.sql            # Charlotte-area school data seed
│   └── functions/
│       ├── analyze/
│       │   ├── index.ts            # Claude analysis for properties & schools
│       │   └── researchContext.ts  # System prompt builder (fetches live profile data)
│       ├── lookup-property/
│       │   └── index.ts            # Address → RentCast + Google Places + FEMA + EPA
│       ├── generate-report/
│       │   └── index.ts            # Streaming report generation (SSE)
│       └── inbound-email/
│           ├── index.ts            # Cloudmailin webhook handler
│           └── SETUP.md            # Cloudmailin configuration guide
├── src/
│   ├── App.tsx                     # HashRouter + route definitions
│   ├── main.tsx                    # React entry point, StrictMode
│   ├── index.css                   # Tailwind directives + custom utilities
│   ├── components/
│   │   ├── Layout.tsx              # Shell: sidebar + topbar + outlet
│   │   ├── Sidebar.tsx             # Nav groups (collapsible, localStorage state)
│   │   ├── UserSetup.tsx           # Name picker dialog (first visit)
│   │   ├── AiAnalysisPanel.tsx     # Shared Claude insight display (property + school)
│   │   ├── FinancialSnapshot.tsx   # Net proceeds widget (dashboard)
│   │   ├── DeadlinesWidget.tsx     # Urgent deadlines (dashboard)
│   │   ├── OfferTracker.tsx        # Offer management UI (properties)
│   │   ├── ReportViewer.tsx        # SSE streaming report iframe
│   │   └── ProgressRing.tsx        # SVG circular progress indicator
│   ├── hooks/
│   │   ├── useUser.tsx             # Context: current user name
│   │   └── useTheme.ts             # Dark mode toggle + localStorage persistence
│   ├── lib/
│   │   ├── supabase.ts             # Supabase browser client (anon key)
│   │   ├── lookupProperty.ts       # Wrapper for lookup-property edge function
│   │   ├── metroAreas.ts           # Charlotte metro area / filter definitions
│   │   ├── exportCalendar.ts       # Deadlines → .ics file download
│   │   └── reportStream.ts         # SSE stream reader for generate-report
│   ├── types/
│   │   ├── database.ts             # Auto-generated Supabase table types (Tables<'x'>)
│   │   └── reports.ts              # ReportType, ReportRow interfaces
│   └── views/                      # One file per page/route
│       ├── Dashboard.tsx
│       ├── Todos.tsx
│       ├── Branches.tsx
│       ├── Whatifs.tsx
│       ├── Notes.tsx
│       ├── Profile.tsx
│       ├── Properties.tsx
│       ├── Schools.tsx
│       ├── Contacts.tsx
│       ├── Communications.tsx
│       ├── Deadlines.tsx
│       ├── Selling.tsx
│       └── Reports.tsx
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vercel.json                     # SPA rewrite: /* → /index.html
```

---

## Architecture Overview

```
Browser (React SPA)
    │
    ├── Supabase JS client (anon key)
    │       ├── Direct table reads/writes  (CRUD via PostgREST)
    │       └── Realtime subscriptions     (postgres_changes events)
    │
    └── Supabase Edge Functions (Deno, service role key)
            ├── analyze          → Anthropic API → writes ai_analysis to DB
            ├── lookup-property  → RentCast + Google Places + FEMA + EPA → returns JSON
            ├── generate-report  → Anthropic API (SSE stream) → writes HTML to DB
            └── inbound-email    → Cloudmailin webhook → inserts contact_notes row
```

### Data flow: Property lookup

```
User clicks "Lookup" on property form
  → src/lib/lookupProperty.ts
  → POST /functions/v1/lookup-property  { address, propertyId }
  → Edge function:
      1. RentCast API: beds, baths, sqft, price, year built, lot size
      2. Google Places: nearby schools, grocery, pharmacy, parks (8 km radius)
      3. FEMA API: flood zone code
      4. EPA FRS: hazard facilities within 1 mile
      5. Auto-upserts schools into schools table + property_schools junction
      6. Returns: autofill fields + proximity JSON
  → Frontend patches property form + stores proximity JSONB
```

### Data flow: Report generation

```
User clicks "Generate" in Reports view
  → src/lib/reportStream.ts
  → POST /functions/v1/generate-report  { reportType, requestedBy }
  → Edge function:
      1. Inserts reports row (status: 'generating')
      2. Fetches all relevant tables in parallel (lean column selection)
      3. Builds HTML data tables server-side (no AI tokens)
      4. Opens Anthropic streaming session (claude-sonnet-4-6, max 1000 tokens)
      5. Emits SSE chunks: { type: 'chunk', text } and { type: 'done', reportId }
      6. Saves complete HTML to reports.content (status: 'complete')
  → ReportViewer.tsx reads SSE chunks, renders into <iframe srcdoc>
```

### Data flow: Inbound email

```
Email → Cloudmailin (webhook target: /functions/v1/inbound-email)
  → Edge function (--no-verify-jwt required):
      1. Parses multipart form body
      2. Extracts: from address, subject, plain text body
      3. Looks up contact by email in contacts table
      4. Inserts contact_notes row:
           { contact_id, note_type: 'Email', content, added_by: 'inbound-email' }
  → Realtime subscription in Communications.tsx fires → UI updates live
```

---

## Database Schema

All tables include `created_at` (timestamptz, default now()). Most include `updated_at`, `updated_by`, `created_by`.

### Core planning tables

| Table | Key columns | Notes |
|---|---|---|
| `profile` | `key`, `value`, `updated_by`, `updated_at` | Key-value store. Upsert on `key`. Stores move_date, email, children names, etc. |
| `branches` | `title`, `description`, `status` (Open/In Progress/Decided), `options` (JSONB), `decision_made` | 6 decision branches |
| `todos` | `content`, `tier`, `done`, `done_by`, `done_at`, `parent_id`, `property_id`, `branch_id` | `parent_id` FK for subtasks. `tier` values: DoFirst/DoSoon/WhenReady/Later + sell_ prefixed variants |
| `notes` | `content`, `author` | Journal entries. Simple. |
| `whatifs` | `scenario`, `status` (Unplanned/Monitoring/Triggered/Resolved), `mitigation`, `branch_id` | Contingency tracker |
| `deadlines` | `title`, `deadline_at`, `category`, `notes`, `property_id`, `completed`, `completed_at`, `completed_by` | |

### Real estate tables

| Table | Key columns | Notes |
|---|---|---|
| `properties` | `address`, `area`, `status`, `price`, `beds`, `baths`, `sqft`, `zillow_url`, `notes`, `ai_analysis` (JSONB), `proximity` (JSONB), `visit_date`, `branch_id` | `status` drives the pipeline UI |
| `offers` | `property_id`, `amount`, `status` (Draft→Submitted→Countered→Accepted→Rejected→Withdrawn), `notes`, `submitted_at` | |
| `schools` | `name`, `district`, `area`, `grades`, `type`, `status`, `greatschools_url`, `notes`, `ai_analysis` (JSONB) | `type`: Public/Private/Charter/Magnet |
| `property_schools` | `property_id`, `school_id` | Many-to-many junction. Auto-populated by lookup-property. |
| `contacts` | `name`, `role`, `company`, `phone`, `email`, `website`, `status`, `linked_property_id` | `role` is free text (Listing Agent, Contractor, etc.) |
| `contact_notes` | `contact_id`, `note_type`, `content`, `amount`, `note_date`, `added_by` | `note_type`: Note/Call/Email/Meeting/Estimate/Other. `added_by: 'inbound-email'` marks auto-logged entries. |

### Selling phase tables (6805 Brookview Dr)

| Table | Key columns | Notes |
|---|---|---|
| `property_improvements` | `name`, `description`, `icon`, `value_add_low`, `value_add_high`, `status` | Completed upgrades with estimated ROI range |
| `property_readiness_scores` | `category`, `score` (0–100) | One row per room/category |
| `sale_scenarios` | `name`, `timeline_weeks`, `prep_cost_low`, `prep_cost_high`, `prep_cost_mid`, `projected_sale_price`, `net_proceeds`, `notes` | 3 scenarios side-by-side |
| `sale_scenario_items` | `scenario_id`, `item`, `cost_low`, `cost_high`, `notes` | Line items per scenario |
| `sale_timeline_phases` | `name`, `phase_number`, `week_range`, `status` | 5 phases (Immediate Actions → Active Listing) |
| `sale_timeline_tasks` | `phase_id`, `task`, `done`, `done_by`, `done_at`, `priority` | Individual checklist items per phase |

### AI/Reports table

| Table | Key columns | Notes |
|---|---|---|
| `reports` | `report_type`, `status` (pending/generating/complete/error), `content` (HTML), `requested_by`, `metadata` (JSONB) | SSE target. Realtime used for live status polling. |

---

## Supabase Edge Functions

All functions live in `supabase/functions/`. Deploy with:

```bash
npx supabase functions deploy <function-name> --project-ref <project-ref>
```

### `analyze`

- **Trigger:** Frontend button click (property or school detail)
- **Input:** `{ entityType: 'property' | 'school', entityId: string, entityData: object }`
- **Process:** Fetches profile key facts → builds system prompt via `researchContext.ts` → calls Claude → patches `ai_analysis` JSONB field on the entity
- **Model:** `claude-sonnet-4-6`, max 1200 tokens
- **Auth:** Requires service role (Supabase Auth header)

### `lookup-property`

- **Trigger:** Frontend "Lookup" button on property form
- **Input:** `{ address: string, propertyId?: string }`
- **External APIs:**
  - RentCast (`api.rentcast.io`) — listing data
  - Google Places Nearby Search — amenities + schools
  - FEMA National Flood Hazard Layer
  - EPA FRS (Facility Registry Service)
- **Output:** Merged JSON of autofill fields + `proximity` object
- **Auth:** Requires service role

### `generate-report`

- **Trigger:** Frontend "Generate" button in Reports view
- **Input:** `{ reportType: 'full' | 'sale' | 'hunt', requestedBy: string }`
- **Transport:** Server-Sent Events (SSE) — `Content-Type: text/event-stream`
- **Model:** `claude-sonnet-4-6`, max 1000 tokens (streaming)
- **Pattern:** Pre-builds HTML tables server-side, passes only to Claude as context. Claude writes only the narrative analysis (~400–800 words). Avoids large token counts.
- **Auth:** Requires service role

### `inbound-email`

- **Trigger:** Cloudmailin HTTP webhook POST
- **IMPORTANT:** Must be deployed with `--no-verify-jwt` flag (Cloudmailin cannot send Supabase JWT)
- **Input:** Cloudmailin multipart form (from, to, subject, plain, html)
- **Process:** Looks up contact by sender email → inserts `contact_notes` row
- **Auth:** No JWT verification (public webhook endpoint)
- **Setup:** See `supabase/functions/inbound-email/SETUP.md`

Deploy command:
```bash
npx supabase functions deploy inbound-email --project-ref <project-ref> --no-verify-jwt
```

---

## Authentication Model

**There is no traditional authentication.** The app is designed for a single private household.

- On first visit, `UserSetup.tsx` prompts the user to select their name (Safal or Prativa)
- The selection is stored in `localStorage` as `fmp_user_name`
- `useUser` hook provides `userName` throughout the app
- `userName` is passed as `updated_by` / `created_by` / `added_by` on writes
- Supabase uses the **anon key** for all browser-side operations
- **No RLS (Row Level Security) policies** are active — all authenticated requests can read/write all tables
- Edge functions use the **service role key** (server-side only, never exposed to browser)

> If you ever need to make this multi-tenant, the primary changes needed are: add Supabase Auth, enable RLS policies per table, and swap the anon client for an authenticated session.

---

## Real-Time Sync

Every major view subscribes to its relevant tables via Supabase Realtime:

```ts
const channel = supabase
  .channel('todos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => reload())
  .subscribe()

// cleanup:
return () => { supabase.removeChannel(channel) }
```

**Pattern:** All subscriptions call a full reload (`load()`) on any change event, rather than applying diffs. This is simple and correct but means any remote change triggers a full table fetch. For the data volumes in this app (tens to low hundreds of rows), this is fine.

**Tables with Realtime enabled:**
`profile`, `branches`, `todos`, `notes`, `whatifs`, `properties`, `schools`, `contacts`, `contact_notes`, `property_improvements`, `property_readiness_scores`, `sale_scenarios`, `sale_scenario_items`, `sale_timeline_phases`, `sale_timeline_tasks`, `reports`, `deadlines`, `offers`

---

## Frontend Patterns

### State management

No external state library. Each view manages its own state with `useState` + `useEffect`. Shared user identity comes from `useUser` context.

### Data loading

Standard pattern in every view:

```ts
const [data, setData] = useState<Row[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function load() {
    const { data } = await supabase.from('table').select('*')
    setData(data ?? [])
    setLoading(false)
  }
  load()
  const ch = supabase.channel('x').on('postgres_changes', { ... }, load).subscribe()
  return () => { supabase.removeChannel(ch) }
}, [])
```

### Optimistic updates

Used selectively for deletes (e.g. delete contact_note, delete contact). Pattern:

```ts
// Remove from local state immediately, then fire DB delete
setItems(prev => prev.filter(i => i.id !== id))
await supabase.from('table').delete().eq('id', id)
```

### TypeScript types

All database types are in `src/types/database.ts`, generated from the Supabase schema. Use `Tables<'table_name'>` to type rows:

```ts
import type { Tables } from '../types/database'
type ContactRow = Tables<'contacts'>
```

To regenerate after schema changes:
```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```

### Routing

Uses `HashRouter` (configured in `App.tsx`) to support static hosting without server-side routing. All routes start with `#/`. `vercel.json` rewrites `/*` to `/index.html` for direct URL access.

### Dark mode

`useTheme` hook toggles the `dark` class on `<html>`. Tailwind's `darkMode: 'class'` config enables dark variants. Initial value reads from `localStorage` with system preference fallback.

---

## Environment Variables

### Frontend (Vite — prefix `VITE_`)

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Supabase anon key (safe to expose in browser) |

### Edge Functions (Supabase secrets)

Set via Supabase dashboard (Project Settings → Edge Functions → Secrets) or CLI:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
npx supabase secrets set RENTCAST_API_KEY=...
npx supabase secrets set GOOGLE_PLACES_API_KEY=...
```

| Variable | Used by | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | `analyze`, `generate-report` | Claude API |
| `SUPABASE_SERVICE_ROLE_KEY` | all functions | Service role for DB writes |
| `RENTCAST_API_KEY` | `lookup-property` | Property listing data |
| `GOOGLE_PLACES_API_KEY` | `lookup-property` | Nearby places + schools |

FEMA and EPA APIs are public and require no key.

### GitHub Actions secrets (for CI/CD)

| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Injected at Vite build time |
| `VITE_SUPABASE_ANON_KEY` | Injected at Vite build time |
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
# → http://localhost:5173/

# Type check (no emit)
npm run tsc

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Database setup (first time)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Open the SQL Editor and run `supabase/migration.sql` (full schema)
3. Optionally run `supabase/seed_schools.sql` for Charlotte school data
4. Optionally run `node scripts/seed.js` for demo planning data (idempotent)
5. Copy `.env.example` to `.env` and fill in your project URL and anon key

### Edge function local dev

```bash
npx supabase start           # local Supabase stack (Docker required)
npx supabase functions serve # local function server at http://localhost:54321
```

Set local secrets in `supabase/.env` (gitignored).

---

## CI/CD & Deployment

### GitHub Actions workflow (`.github/workflows/deploy.yml`)

Runs on every push to `main`:

1. `npm ci` — install dependencies
2. `npx tsc --noEmit` — type check (fails build on type errors)
3. `npm run build` — Vite production build
4. Deploy to Vercel via `vercel --prod`

### Vercel configuration

`vercel.json` contains a single catch-all rewrite rule:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures direct URL navigation and browser refreshes work with the HashRouter SPA.

### Deploying Edge Functions

Edge functions are deployed manually (not via GitHub Actions):

```bash
# Deploy all functions
npx supabase functions deploy --project-ref <project-ref>

# Deploy a specific function
npx supabase functions deploy analyze --project-ref <project-ref>

# inbound-email MUST use --no-verify-jwt
npx supabase functions deploy inbound-email --project-ref <project-ref> --no-verify-jwt
```

---

## External API Integrations

### Anthropic Claude (`claude-sonnet-4-6`)

Used in: `analyze`, `generate-report`

- Client: `@anthropic-ai/sdk` (Deno-compatible import)
- `analyze`: non-streaming, max 1200 tokens, writes result to DB
- `generate-report`: streaming (`stream: true`), max 1000 tokens, SSE to client

### RentCast

Used in: `lookup-property`

- Endpoint: `https://api.rentcast.io/v1/properties?address=...`
- Returns: beds, baths, sqft, lot size, year built, listing price
- Fails gracefully — property can still be saved without lookup data

### Google Places API

Used in: `lookup-property`

- Nearby Search endpoint, radius 8 km
- Categories: grocery, pharmacy, park, restaurant, shopping_mall, school
- School results are deduped by name and auto-upserted into the `schools` table
- Grade range inferred from place type keywords (primary → K-5, secondary → 9-12)

### FEMA National Flood Hazard Layer

Used in: `lookup-property`

- Public REST API, no key required
- Returns flood zone code (e.g. AE, X, VE)
- Failures are caught silently — `flood_zone` returns null

### EPA FRS (Facility Registry Service)

Used in: `lookup-property`

- Public JSON API, no key required
- Searches for hazard facilities within 1 mile of coordinates
- Failures are caught silently

### Cloudmailin

Used with: `inbound-email`

- Receives inbound emails and POSTs to your edge function URL
- Configure target URL in Cloudmailin dashboard to:
  `https://<project-ref>.supabase.co/functions/v1/inbound-email`
- No auth header — function must be deployed with `--no-verify-jwt`
- See `supabase/functions/inbound-email/SETUP.md` for full setup

---

## Known Limitations

### No Row Level Security

All Supabase table operations use the anon key with no RLS. Anyone with the anon key can read and write all data. Acceptable for a private two-person household app, but not suitable for multi-user or public deployment without adding auth + RLS.

### Proximity data staleness

Property proximity data (schools, nearby places, flood zone) is fetched once on lookup and cached in the `proximity` JSONB column. There is no refresh mechanism — if a property's surroundings change or the initial lookup failed, you must delete and re-add the property or patch the DB directly.

### Report token budget

`generate-report` caps Claude's output at 1000 tokens (~700–800 words). This keeps latency to ~15–20 seconds and cost low, but means reports are summaries rather than exhaustive analyses. Increase `max_tokens` in the function if longer output is needed (note: each additional 500 tokens adds ~5–8 seconds).

### Inbound email: contact matching

`inbound-email` matches the sender's email address against the `contacts.email` column. If the contact doesn't exist in the database, or has a different email address on file, the note will not be logged (the function silently returns 200 without inserting). Future improvement: create a contact automatically if no match is found.

### No offline support

The app requires an active internet connection. There is no service worker, caching strategy, or optimistic UI that would work offline. All reads go directly to Supabase.

### Single household scope

Profile data (move dates, children's names, addresses) is hard-coded into the seed script and referenced directly in edge function prompts (`researchContext.ts`). Adapting for a different family requires updating seed data and the research context builder.

---

## Debugging Guide

### "Realtime not updating"

1. Check the Supabase dashboard → Database → Replication — ensure the table has the `supabase_realtime` publication enabled
2. Check browser console for WebSocket errors
3. Verify the channel name matches what you expect — multiple components can subscribe to the same table

### "Edge function returns 401 Unauthorized"

- All functions except `inbound-email` require a valid Supabase JWT in the `Authorization` header
- The browser client sends this automatically when using `supabase.functions.invoke()`
- If calling from curl/Postman, add: `Authorization: Bearer <anon-key>`
- For `inbound-email`: it must be deployed with `--no-verify-jwt`

### "AI analysis / report generation not working"

1. Check Supabase Edge Function logs (Dashboard → Edge Functions → Logs)
2. Verify `ANTHROPIC_API_KEY` is set as a Supabase secret
3. Check for Deno import errors — the Anthropic SDK must use its Deno-compatible CDN import
4. Confirm the function is deployed (list with `npx supabase functions list --project-ref <ref>`)

### "Property lookup returns partial data"

Each external API in `lookup-property` is wrapped in try-catch. Partial failures are normal:
- RentCast may not have data for new or unlisted addresses
- FEMA / EPA failures are always silent
- Google Places requires the key to have the "Places API" enabled in Google Cloud Console

Check the function logs to see which step failed.

### "TypeScript type errors after schema change"

Regenerate types:
```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.ts
```

### Adding a new view/route

1. Create `src/views/MyView.tsx`
2. Add route in `src/App.tsx`: `<Route path="/my-view" element={<MyView />} />`
3. Add nav entry in `src/components/Sidebar.tsx` under the appropriate group

### Seed script (`scripts/seed.js`)

The seed is idempotent — it checks for existing rows before inserting. To fully reset and re-seed:

```sql
-- Run in Supabase SQL Editor
TRUNCATE todos, branches, whatifs, notes CASCADE;
```

Then re-run `node scripts/seed.js`.
