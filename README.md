# Family Move Planner
### Des Moines, IA → Charlotte, NC

A private, real-time collaborative web app for Safal & Prativa to manage every detail of their family relocation — from selling their current home and researching neighborhoods, to tracking contacts, deadlines, and AI-powered property analysis.

---

## What's Inside

| Section | What it does |
|---|---|
| **Dashboard** | Your move at a glance — progress rings, days to move, urgent deadlines, financial snapshot, and a live journal feed |
| **To-Do List** | Priority-tiered tasks (Do First / Do Soon / Do When Ready / Later) with checkboxes that track who completed each item and when |
| **Decisions** | 6 major decision branches (neighborhood, school district, timing, etc.) with options, notes, and a clear Open → Decided status |
| **What-Ifs** | Contingency scenarios ("What if we can't find a house by May?") with mitigation notes and trigger tracking |
| **House Hunt** | Full property pipeline — add addresses, auto-fetch listing data, run proximity lookups for schools/grocery/parks, track visits and offers |
| **Schools** | Research tracker for Charlotte-area schools with ratings, grade ranges, type (Public/Private/Charter/Magnet), and AI-generated insights |
| **Contacts** | Vendors, agents, contractors — linked to properties, with a full call/email/meeting log and estimate tracking |
| **Communications** | Unified timeline of every call, email, and meeting across all contacts, filterable by type, person, or source |
| **Deadlines** | Critical dates with urgency indicators and one-click completion |
| **Selling** | Full prep guide for your current home — improvement history, readiness scores, 3 sale scenarios with net proceeds estimates, and a phase-by-phase timeline |
| **Journal** | Session notes for both of you, timestamped and attributed |
| **Profile** | Key facts (move date, kids' grades, email, etc.) — inline editable, tracks who changed what |
| **AI Reports** | One-click narrative reports: Move Overview, Home Sale readiness, or House Hunt summary — streamed live from Claude and downloadable as HTML |

---

## How to Use It

### Getting started

1. Open the app in your browser
2. On first visit you'll be asked **who you are** — pick Safal or Prativa
3. Your choice is saved in the browser — you won't be asked again on this device
4. All changes you make are **instantly visible to the other person** — no refresh needed

### Navigating

The left sidebar groups everything into four areas:

- **Planning** — To-Do, Decisions, What-Ifs, Deadlines
- **Real Estate** — House Hunt, Schools, Selling Your Home
- **Notes & Info** — Contacts, Communications, Journal, Profile
- **AI Tools** — Reports

On mobile, tap the menu icon (top-left) to open the sidebar.

### Dark mode

Click the sun/moon icon in the top-right corner. Your preference is remembered per device.

---

## Feature Highlights

### House Hunt

**Adding a property:**
1. Go to **House Hunt** and click **Add property**
2. Paste the address — then click **Lookup** to auto-fill beds, baths, sqft, price, and Zillow link
3. The lookup also finds nearby grocery stores, pharmacies, parks, and schools within 5 miles, and checks the FEMA flood zone

**Tracking a property:**
- Use the status dropdown to move a property through: Considering → Visit Scheduled → Visited → Offer Made → Ruled Out → Secured
- Click **Analyze with AI** to get a Claude-written assessment based on your family's profile and priorities
- Log offer details in the Offer Tracker panel

**Linking schools:**
- Schools discovered during property lookup are automatically linked
- You can manually link/unlink schools from the school detail panel

---

### Communications

The Communications view is a unified inbox for your professional conversations:

- **Filtering:** Use the dropdowns to filter by contact, note type (Call/Email/Meeting/Estimate), or source (Auto-logged vs Manual)
- **Deleting:** Hover any entry to reveal a trash icon — click to remove it instantly
- **Long emails:** Emails over ~220 characters are truncated — click **Show more** to expand, **Show less** to collapse
- **Inbound email:** Emails sent to your Cloudmailin address are automatically logged here as "Email" entries tagged *auto*

---

### Selling Your Home

The Selling section covers the full preparation journey for 6805 Brookview Dr:

- **Improvements** — All completed upgrades (quartz countertops, repaint, deck, etc.) with estimated value add
- **Readiness Scores** — Category-by-category score (Kitchen, Curb Appeal, Bathrooms, etc.)
- **Sale Scenarios** — Three preparation paths with side-by-side cost and net proceeds estimates:
  - Sell As-Is
  - Cosmetic Bathroom Refresh (recommended)
  - Full Bathroom Remodel
- **Timeline** — 5 phases from Immediate Actions through Active Listing, with individual task checkboxes

---

### AI Reports

1. Go to **Reports** in the sidebar
2. Choose a report type: **Move Overview**, **Home Sale**, or **House Hunt**
3. Click **Generate** — the report streams live (takes ~15–20 seconds)
4. When done, click **Download** to save it as an HTML file you can open offline or share

Reports are saved — you can re-read previous ones without regenerating.

---

### Contacts & Comms Log

Each contact card expands to show:
- Contact details (phone, email, website, linked property)
- Full conversation history (calls, emails, meetings, estimates)
- A form to log a new note on the spot

Estimates logged here automatically roll up into the financial snapshot on the dashboard.

---

## Collaboration Notes

- **No login required** — name selection on first visit, stored in `localStorage`
- **Real-time sync** — both of you see changes live via Supabase subscriptions
- Every edit records who made it (shown in timestamps and note footers)
- Works on any device — phone, tablet, or desktop

---

## Export

- **Move calendar** — From the Dashboard, export a `.ics` file of all your deadlines to import into Google Calendar or Apple Calendar
- **AI Reports** — Download as `.html` to share or archive

---

*For technical setup, architecture, and developer notes see [docs/DEVELOPER.md](./docs/DEVELOPER.md)*
