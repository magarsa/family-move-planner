#!/usr/bin/env node
// ============================================================
// Family Move Planner — Database Seed Script
// Usage: node scripts/seed.js
// Requires: .env with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// Idempotent: safe to re-run (skips tables that already have data)
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// Load .env manually (no dotenv dependency required)
function loadEnv() {
  const envPath = resolve(rootDir, '.env')
  if (!existsSync(envPath)) {
    console.error('❌  .env file not found. Copy .env.example to .env and fill in your values.')
    process.exit(1)
  }
  const env = readFileSync(envPath, 'utf-8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    process.env[key] = val
  }
}

loadEnv()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// ─── Seed data ──────────────────────────────────────────────

const profileData = [
  { key: 'current_home',           value: 'Des Moines, IA — owned with mortgage' },
  { key: 'destination',            value: 'Charlotte, NC suburbs (TBD)' },
  { key: 'timeline',               value: '~6 months (target move by Sep 2026)' },
  { key: 'move_drivers',           value: 'Family proximity to relatives + lifestyle/climate' },
  { key: 'kids',                   value: 'Yes — school-age (K-12)' },
  { key: 'kids_grades',            value: 'TBD' },
  { key: 'charlotte_housing_plan', value: 'Buy right away' },
  { key: 'employment',             value: 'One spouse needs to find work in Charlotte — affects mortgage pre-approval' },
  { key: 'des_moines_sale_price',  value: 'TBD' },
  { key: 'mortgage_balance',       value: 'TBD' },
  { key: 'equity_to_deploy',       value: 'TBD' },
  { key: 'charlotte_budget',       value: 'TBD' },
  { key: 'target_suburbs',         value: 'TBD — candidates: Waxhaw, Weddington, Ballantyne, Huntersville, Fort Mill SC' },
]

const branchesData = [
  {
    title: 'Sell Before You Buy vs. Buy Before You Sell',
    description: 'Highest-stakes decision given the 6-month window. Affects financing, timing, and family stability.',
    status: 'Open',
    sort_order: 1,
    options: [
      {
        label: 'Option A: Sell first, then buy',
        pros: [
          'No risk of carrying two mortgages',
          'Know exact equity available for Charlotte purchase',
          'Stronger buying position (no home-sale contingency)',
        ],
        cons: [
          'May need temporary housing in Charlotte gap period',
          'Pressure to buy quickly once Des Moines closes',
        ],
      },
      {
        label: 'Option B: Buy Charlotte first, then sell',
        pros: ['No gap in housing — kids stay stable during transition'],
        cons: [
          'Need to qualify for two mortgages simultaneously',
          'Risky with one spouse job-searching (lender will scrutinize income)',
          'Carrying costs if Des Moines sits on market',
        ],
      },
      {
        label: 'Option C: Negotiate simultaneous close (contingency offer)',
        pros: ['Ideal outcome — closes same day or within days'],
        cons: [
          'Sellers in Charlotte may reject contingent offers in competitive market',
          'Requires very careful coordination',
        ],
      },
      {
        label: 'Option D: Bridge loan',
        pros: ['Lets you buy before selling without needing two mortgages simultaneously'],
        cons: [
          'Higher interest and fees',
          'Still need to qualify for bridge financing',
        ],
      },
    ],
    notes: 'Recommended starting point: Option A or C depending on Des Moines sale speed and Charlotte market conditions. Discuss with a lender ASAP given job situation.',
  },
  {
    title: 'Mortgage Pre-Approval (Job Search Complication)',
    description: 'One spouse needs to find Charlotte employment. Lenders typically want 2 years of employment history or a signed offer letter.',
    status: 'Open',
    sort_order: 2,
    options: [
      {
        label: 'Scenario A: Job offer secured BEFORE applying for Charlotte mortgage',
        pros: ['Clean pre-approval', 'Full borrowing power', 'Best case scenario'],
        cons: ['Requires securing a job offer first — timeline pressure'],
      },
      {
        label: 'Scenario B: Applying on one income only',
        pros: ['Can start process immediately without waiting for job offer'],
        cons: [
          'May qualify for a reduced loan amount',
          'Limits Charlotte home price range',
        ],
      },
      {
        label: 'Scenario C: Job offer in hand but not started yet',
        pros: ['Many lenders will accept a signed offer letter'],
        cons: [
          'Some require start date within 60–90 days of closing',
          'Need to clarify with multiple lenders',
        ],
      },
    ],
    notes: 'To-Do: Schedule lender consultation to understand borrowing scenarios. Do this before committing to a Charlotte price range.',
  },
  {
    title: 'Charlotte Suburb Selection',
    description: 'School district quality is the primary filter given school-age kids. Final choice also depends on where relatives live.',
    status: 'Open',
    sort_order: 3,
    options: [
      {
        label: 'Waxhaw / Weddington (Union County)',
        pros: ['Top-rated schools (Union County Public Schools)', 'More land and space', 'Quieter, family-oriented'],
        cons: ['Farther from Uptown Charlotte', 'Less walkable'],
      },
      {
        label: 'Ballantyne (South Charlotte / Mecklenburg)',
        pros: ['Family-friendly', 'Newer builds', 'Good amenities and restaurants'],
        cons: ['CMS school district (varies by school)', 'More expensive per sq ft'],
      },
      {
        label: 'Huntersville (Lake Norman / Mecklenburg)',
        pros: ['Lake Norman access', 'Growing area', 'More affordable than south Charlotte'],
        cons: ['CMS district', 'Farther north from potential job centers'],
      },
      {
        label: 'Fort Mill / Tega Cay (York County, SC)',
        pros: ['Very popular with families', 'Excellent Fort Mill schools', 'Slightly lower taxes (SC)'],
        cons: ['South Carolina — different state taxes, plates, etc.', 'HOA heavy'],
      },
    ],
    notes: 'Need to confirm: (1) Where do relatives live? — narrows shortlist significantly. (2) Kids\' grades — to match specific schools. Also research: Matthews, Mooresville.',
  },
  {
    title: 'Des Moines Home Sale Prep',
    description: 'With 6 months, there is time to prep properly — but not unlimited time. Getting this right maximizes equity.',
    status: 'Open',
    sort_order: 4,
    options: [
      {
        label: 'Full market listing (realtor)',
        pros: ['Likely highest sale price', 'Professional marketing and negotiation'],
        cons: ['Takes more time', 'Requires showings and prep work', 'Realtor commission (~3%)'],
      },
      {
        label: 'Cash buyer / iBuyer (Opendoor, etc.)',
        pros: ['Fast closing', 'No showings or prep stress'],
        cons: ['Below market price (typically 5–10% less)', 'Less negotiation leverage'],
      },
    ],
    notes: 'Month 1–2 actions: Get CMA from local realtor, walk through and identify repairs, declutter, consider pre-listing inspection, interview 2–3 listing agents.',
  },
  {
    title: "Kids — School Transition Planning",
    description: 'Timing the move around the school year significantly affects the kids\' social and academic experience.',
    status: 'Open',
    sort_order: 5,
    options: [
      {
        label: 'Move aligns with end of school year (May/June)',
        pros: ['Kids finish current school year', 'Fresh start in Charlotte for fall', 'Least disruptive'],
        cons: ['Constrains move timing to May-June window', 'Tighter closing coordination'],
      },
      {
        label: 'Mid-year move',
        pros: ['More flexible on timing', 'Could happen earlier if needed'],
        cons: ['Harder socially for kids', 'Mid-year enrollment complexity'],
      },
      {
        label: 'Split household temporarily',
        pros: ['Kids finish school year in Des Moines', 'One parent sets up Charlotte home first'],
        cons: ['Family separated for weeks or months', 'Logistically complex'],
      },
    ],
    notes: 'Actions: Confirm Des Moines withdrawal process, research Charlotte enrollment deadlines, check for magnet/choice schools that require applications, request records ready for transfer.',
  },
  {
    title: 'Job Search — Charlotte',
    description: 'On the critical path for mortgage qualification. Getting an offer letter before applying for a mortgage is the best-case scenario.',
    status: 'Open',
    sort_order: 6,
    options: [
      {
        label: 'Secure remote-first role (work from Charlotte day 1)',
        pros: ['Can start immediately', 'No geographic constraint', 'Solves mortgage complication fastest'],
        cons: ['Remote roles competitive', 'May not match career goals'],
      },
      {
        label: 'Target Charlotte-area employers directly',
        pros: ['Local network building', 'Clearest path to offer letter for lender'],
        cons: ['May require in-person interviews', 'Slower than remote'],
      },
      {
        label: 'Freelance/contract bridge while searching',
        pros: ['Generates income during transition', 'Keeps resume active'],
        cons: ['Lenders may not count contract income the same way'],
      },
    ],
    notes: 'Charlotte job market strengths: Finance/Banking (BofA, Truist HQ), Healthcare (Atrium, Novant), Tech (Ballantyne hub), Manufacturing/Logistics. Timeline: aim for offer letter 60–90 days before target closing.',
  },
]

const todosData = [
  // Do First
  { text: 'Determine home equity estimate — get a CMA from a local Des Moines realtor', tier: 'Do First', sort_order: 1 },
  { text: 'Consult with lender about mortgage scenarios given job situation (one income vs. offer letter)', tier: 'Do First', sort_order: 2 },
  { text: 'Confirm where Charlotte relatives are located — this narrows the suburb shortlist significantly', tier: 'Do First', sort_order: 3 },
  { text: "Identify kids' current grades and specific school needs", tier: 'Do First', sort_order: 4 },
  // Do Soon
  { text: 'Interview 2–3 Des Moines listing agents', tier: 'Do Soon', sort_order: 1 },
  { text: 'Research top 3 Charlotte suburbs and their specific school ratings (GreatSchools, state rankings)', tier: 'Do Soon', sort_order: 2 },
  { text: 'Begin Charlotte job search actively — update resume and LinkedIn', tier: 'Do Soon', sort_order: 3 },
  { text: 'Create a household move budget (moving costs, overlap carrying costs, closing costs x2)', tier: 'Do Soon', sort_order: 4 },
  // Do When Ready
  { text: 'List Des Moines home', tier: 'Do When Ready', sort_order: 1 },
  { text: 'Begin Charlotte home search trips — plan at least 1–2 scouting visits', tier: 'Do When Ready', sort_order: 2 },
  { text: 'Enroll kids in Charlotte activities/sports to begin social integration before the school year', tier: 'Do When Ready', sort_order: 3 },
  { text: 'Research SC vs NC tax implications if considering Fort Mill or Tega Cay', tier: 'Do When Ready', sort_order: 4 },
  // Later
  { text: 'Manage Des Moines closing', tier: 'Later', sort_order: 1 },
  { text: 'Manage Charlotte closing', tier: 'Later', sort_order: 2 },
  { text: "Kids' school enrollment and academic record transfer", tier: 'Later', sort_order: 3 },
  { text: 'Utilities, address changes, voter registration, driver\'s licenses (NC or SC)', tier: 'Later', sort_order: 4 },
]

const whatifsData = [
  { scenario: 'Des Moines home sells fast (under 30 days)', branch: 'Des Moines Home Sale Prep', status: 'Unplanned', notes: 'Need Charlotte offer ready — accelerate suburb search and be prepared to make an offer quickly.' },
  { scenario: 'Des Moines home sits on market (30+ days with no offers)', branch: 'Des Moines Home Sale Prep', status: 'Unplanned', notes: 'Options: price reduction, explore bridge loan, explore iBuyer/cash offer, or consider temporary rental.' },
  { scenario: 'Job offer takes longer than expected (no offer by mortgage application time)', branch: 'Job Search — Charlotte', status: 'Unplanned', notes: 'Options: apply on single income (reduced loan), delay move timeline, explore remote/contract bridge work.' },
  { scenario: 'Charlotte home prices exceed budget', branch: 'Charlotte Suburb Selection', status: 'Unplanned', notes: 'Options: expand suburb radius (consider Mooresville, further Union County), look at SC side (lower taxes), adjust expectations on size/age of home.' },
  { scenario: 'School enrollment deadline passed for fall', branch: "Kids — School Transition Planning", status: 'Unplanned', notes: 'Options: mid-year transfer plan, check for open enrollment policies, explore private school options for the transition year.' },
  { scenario: 'Relatives are in a specific Charlotte suburb', branch: 'Charlotte Suburb Selection', status: 'Unplanned', notes: 'This should immediately reprioritize the suburb shortlist. Proximity to family is a primary move driver.' },
  { scenario: 'Charlotte market is very competitive in chosen suburb', branch: 'Sell Before You Buy vs. Buy Before You Sell', status: 'Unplanned', notes: 'Offer strategy options: escalation clauses, shorter inspection periods, pre-approval letter ready. Be cautious about waiving inspection entirely.' },
  { scenario: 'Need temporary housing between Des Moines close and Charlotte close', branch: 'Sell Before You Buy vs. Buy Before You Sell', status: 'Unplanned', notes: 'Options: short-term rental in Charlotte area, extended stay hotel, stay with relatives temporarily.' },
]

const notesData = [
  {
    content: `Session 1 — March 2026

Established project scope and key profile details for the Des Moines → Charlotte move.

Key complications identified:
• One spouse is job-seeking — this directly affects mortgage pre-approval. Need to clarify whether we apply on single income or wait for offer letter.
• 6-month timeline with school-age kids requires careful school-year alignment. Ideal scenario: move by end of school year (May/June) for a clean fall start in Charlotte.
• Sell-before-buy vs. simultaneous close is the highest-stakes decision — need lender input before committing.

Open questions for next session:
1. Where exactly do relatives live in the Charlotte area? (Narrows suburb shortlist)
2. What grades are the kids currently in?
3. What industry is the job-seeking spouse in?
4. Ballpark home value and remaining mortgage balance?
5. Target price range for the Charlotte home?`,
    author: 'Safal',
  },
]

// ─── Seed functions ──────────────────────────────────────────

async function seedProfile() {
  console.log('  Seeding profile…')
  // Profile uses upsert — always safe to re-run
  const { error } = await supabase
    .from('profile')
    .upsert(profileData, { onConflict: 'key' })
  if (error) throw error
  console.log(`  ✓ ${profileData.length} profile fields upserted`)
}

async function seedBranches() {
  const { count } = await supabase.from('branches').select('*', { count: 'exact', head: true })
  if (count && count > 0) {
    console.log(`  ⏭  Branches already seeded (${count} rows) — skipping`)
    return
  }
  console.log('  Seeding branches…')
  const { error } = await supabase.from('branches').insert(branchesData)
  if (error) throw error
  console.log(`  ✓ ${branchesData.length} branches inserted`)
}

async function seedTodos() {
  const { count } = await supabase.from('todos').select('*', { count: 'exact', head: true })
  if (count && count > 0) {
    console.log(`  ⏭  Todos already seeded (${count} rows) — skipping`)
    return
  }
  console.log('  Seeding todos…')
  const { error } = await supabase.from('todos').insert(todosData)
  if (error) throw error
  console.log(`  ✓ ${todosData.length} todos inserted`)
}

async function seedWhatifs() {
  const { count } = await supabase.from('whatifs').select('*', { count: 'exact', head: true })
  if (count && count > 0) {
    console.log(`  ⏭  What-ifs already seeded (${count} rows) — skipping`)
    return
  }
  console.log('  Seeding what-ifs…')
  const { error } = await supabase.from('whatifs').insert(whatifsData)
  if (error) throw error
  console.log(`  ✓ ${whatifsData.length} what-if scenarios inserted`)
}

async function seedNotes() {
  const { count } = await supabase.from('notes').select('*', { count: 'exact', head: true })
  if (count && count > 0) {
    console.log(`  ⏭  Notes already seeded (${count} rows) — skipping`)
    return
  }
  console.log('  Seeding session notes…')
  const { error } = await supabase.from('notes').insert(notesData)
  if (error) throw error
  console.log(`  ✓ ${notesData.length} note(s) inserted`)
}

// ─── Run ────────────────────────────────────────────────────

console.log('\n🏡  Family Move Planner — Database Seed\n')
console.log(`  Supabase URL: ${supabaseUrl}\n`)

try {
  await seedProfile()
  await seedBranches()
  await seedTodos()
  await seedWhatifs()
  await seedNotes()
  console.log('\n✅  Seed complete! Your app is ready to use.\n')
} catch (err) {
  console.error('\n❌  Seed failed:', err.message || err)
  process.exit(1)
}
