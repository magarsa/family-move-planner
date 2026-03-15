# AI Report Feature — Drop-in Guide

## Files

```
supabase/
  migrations/
    20260315_create_reports.sql    ← run once to create the reports table
  functions/
    generate-report/
      index.ts                     ← Edge Function (Deno)

src/
  types/
    reports.ts                     ← shared TypeScript types + UI config
  lib/
    reportStream.ts                ← SSE stream helper (calls Edge Function)
  components/
    ReportViewer.tsx               ← live streaming iframe + progress bar
  pages/
    Reports.tsx                    ← /reports page (picker + viewer + history)
```

## Setup

### 1. Run the migration
```bash
supabase db push
# or paste supabase/migrations/20260315_create_reports.sql into the Supabase SQL editor
```

### 2. Set Edge Function secrets
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
```

### 3. Deploy the Edge Function
```bash
supabase functions deploy generate-report
```

### 4. Add the route
In your router (adjust to match your existing pattern):
```tsx
import Reports from "./pages/Reports";

// inside your <Routes>
<Route path="/reports" element={<Reports />} />
```

### 5. Add a nav link
Wherever you list your 10 pages, add:
```tsx
{ path: "/reports", label: "Reports", icon: "📊" }
```

## How it works

```
User clicks "Generate"
  → Reports.tsx calls streamReport()
    → reportStream.ts POSTs to /functions/v1/generate-report
      → Edge Function creates a `reports` row (status: generating)
      → Fetches all relevant DB tables
      → Streams Claude's HTML response as SSE chunks
  → Each chunk appended to streamedHtml state
  → ReportViewer writes accumulated HTML to iframe every render
  → Edge Function saves completed HTML to DB (status: complete)
  → Supabase Realtime fires → history sidebar updates for BOTH users
```

## Report types

| Type | Data pulled | Focus |
|------|------------|-------|
| `move-overview` | Everything | Full picture — sell + buy + schools + decisions |
| `home-sale` | sell-side todos, contacts, profile | Listing readiness, improvements, net proceeds |
| `house-hunt` | properties, schools, buy-side todos | Pipeline, school districts, Charlotte-area research |

## Adding a new report type

1. Add a new `ReportType` value to `src/types/reports.ts`
2. Add a config entry to `REPORT_TYPE_CONFIGS`
3. In the Edge Function, add to `REPORT_TITLES` and add a case in `buildPrompt()`
4. That's it — the UI picks it up automatically

## Customising the prompt

Edit `buildPrompt()` in `supabase/functions/generate-report/index.ts`.
The `system` string controls the visual design (colors, layout style).
The `reportDescriptions` map controls what each report type emphasises.

## Assumptions

- Your existing Supabase client is exported from `src/lib/supabase.ts`
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are in your `.env`
- `localStorage.getItem("userName")` returns the current user (matches your existing pattern)
- Framer Motion and TailwindCSS are already installed
