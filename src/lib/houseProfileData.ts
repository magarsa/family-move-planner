// Shared house profile criteria — no JSX, safe to import anywhere.
// Categories are persisted to the `profile` table (key = 'house_profile_categories').
// HouseProfile.tsx writes on every change; consumers (e.g. Properties.tsx) read via loadProfileItems().

import { supabase } from './supabase'

export type PriorityId = 'must' | 'dealbreak' | 'strong' | 'nice' | 'remodelable' | 'skip'

export interface ProfileItem {
  id: string
  label: string
  priority: PriorityId
}

export const PROFILE_ITEMS: ProfileItem[] = [
  // Location & Community
  { id: 'l1',  label: 'Indian Land / Fort Mill / Waxhaw / Tega Cay area',   priority: 'must' },
  { id: 'l2',  label: 'Max 35-min commute to Charlotte uptown',              priority: 'strong' },
  { id: 'l3',  label: 'Low-traffic, residential street',                     priority: 'strong' },
  { id: 'l4',  label: 'No HOA or reasonable HOA (<$100/mo)',                priority: 'must' },
  { id: 'l5',  label: 'Outside flood zone (FEMA Zone X preferred)',          priority: 'must' },
  { id: 'l6',  label: 'Close to grocery / essentials (<10 min)',             priority: 'strong' },
  { id: 'l7',  label: 'Safe, walkable neighborhood feel',                    priority: 'strong' },
  { id: 'l8',  label: 'Sidewalks / trails / greenways nearby',              priority: 'nice' },
  { id: 'l9',  label: 'Not on busy arterial or highway',                    priority: 'must' },
  { id: 'l10', label: 'Established neighborhood (not new construction HOA)', priority: 'nice' },
  // Schools
  { id: 'sc1', label: 'Zoned for top-rated elementary (Lancaster County)',   priority: 'must' },
  { id: 'sc2', label: 'No charter lottery required (in-zone school quality)',priority: 'strong' },
  { id: 'sc3', label: 'Strong public middle school district',                priority: 'must' },
  { id: 'sc4', label: 'Good public high school or nearby private option',    priority: 'strong' },
  { id: 'sc5', label: 'School within safe biking/walking distance',          priority: 'nice' },
  // Lot & Exterior
  { id: 'lo1',  label: 'Lot size ≥ 0.25 acres',                             priority: 'must' },
  { id: 'lo2',  label: 'Fenced backyard (or feasible to fence)',             priority: 'must' },
  { id: 'lo3',  label: 'Private backyard, not overlooked',                  priority: 'strong' },
  { id: 'lo4',  label: 'Flat or gently sloped yard (kid-friendly)',          priority: 'strong' },
  { id: 'lo5',  label: 'South / west-facing backyard (afternoon sun)',       priority: 'nice' },
  { id: 'lo6',  label: 'Mature trees for shade',                             priority: 'nice' },
  { id: 'lo7',  label: 'No major drainage issues or low-lying areas',        priority: 'must' },
  { id: 'lo8',  label: 'Space for potential pool addition',                  priority: 'nice' },
  { id: 'lo9',  label: 'Attached 2-car garage minimum',                      priority: 'must' },
  { id: 'lo10', label: 'Garage with EV charging outlet (or conduit ready)',  priority: 'strong' },
  { id: 'lo11', label: 'Covered front porch or welcoming entry',             priority: 'nice' },
  { id: 'lo12', label: 'Good curb appeal (or fixable)',                      priority: 'remodelable' },
  // Structure & Age
  { id: 'st1',  label: 'Built after 2000 (preferred after 2005)',            priority: 'strong' },
  { id: 'st2',  label: 'Roof < 10 years old or seller replaces',             priority: 'must' },
  { id: 'st3',  label: 'Foundation: slab or crawl (no known issues)',        priority: 'must' },
  { id: 'st4',  label: 'No polybutylene piping',                             priority: 'must' },
  { id: 'st5',  label: 'Sq footage ≥ 2,200 sqft',                            priority: 'must' },
  { id: 'st6',  label: 'Sq footage ≥ 2,800 sqft (ideal)',                    priority: 'strong' },
  { id: 'st7',  label: 'Two-story (preferred for separation of space)',       priority: 'strong' },
  { id: 'st8',  label: 'No major structural red flags in inspection',         priority: 'must' },
  { id: 'st9',  label: 'Brick, hardie board, or quality siding (not vinyl)', priority: 'nice' },
  { id: 'st10', label: 'No history of flooding or water intrusion',           priority: 'must' },
  // Floor Plan & Layout
  { id: 'fp1',  label: '4 bedrooms minimum',                                 priority: 'must' },
  { id: 'fp2',  label: '5 bedrooms or bonus room (ideal)',                   priority: 'strong' },
  { id: 'fp3',  label: '2.5 bathrooms minimum',                              priority: 'must' },
  { id: 'fp4',  label: 'Primary suite on main floor (or acceptable upstairs)',priority: 'strong' },
  { id: 'fp5',  label: 'Dedicated home office or flex room',                 priority: 'must' },
  { id: 'fp6',  label: 'Open concept kitchen / living area',                 priority: 'strong' },
  { id: 'fp7',  label: 'Formal dining or dedicated dining space',            priority: 'nice' },
  { id: 'fp8',  label: 'Mudroom or drop zone off garage entry',              priority: 'strong' },
  { id: 'fp9',  label: 'Kids bedrooms clustered together',                   priority: 'strong' },
  { id: 'fp10', label: 'Laundry on same floor as bedrooms',                  priority: 'strong' },
  { id: 'fp11', label: 'No awkward floor plan or wasted hallway space',      priority: 'nice' },
  { id: 'fp12', label: 'Basement (or crawl space — SC common)',              priority: 'nice' },
  // Kitchen
  { id: 'k1',  label: 'Large island with seating',                           priority: 'strong' },
  { id: 'k2',  label: 'Gas range or dual-fuel range',                        priority: 'strong' },
  { id: 'k3',  label: 'Stone countertops (quartz/granite — or upgradable)',  priority: 'remodelable' },
  { id: 'k4',  label: 'Ample cabinet storage',                               priority: 'must' },
  { id: 'k5',  label: 'Walk-in pantry',                                      priority: 'strong' },
  { id: 'k6',  label: 'Double oven or oven + microwave drawer',              priority: 'nice' },
  { id: 'k7',  label: 'Opens to family room (sight line to kids)',           priority: 'must' },
  { id: 'k8',  label: 'Stainless or panel-front appliances',                 priority: 'nice' },
  { id: 'k9',  label: 'Good natural light',                                  priority: 'strong' },
  { id: 'k10', label: 'Under-cabinet lighting (or easily added)',             priority: 'remodelable' },
  // Primary Suite
  { id: 'ps1', label: 'Large enough for king bed + furniture',               priority: 'must' },
  { id: 'ps2', label: 'His & hers walk-in closets (or one large)',           priority: 'strong' },
  { id: 'ps3', label: 'En-suite bath with double vanity',                    priority: 'must' },
  { id: 'ps4', label: 'Walk-in shower (separate from tub preferred)',        priority: 'strong' },
  { id: 'ps5', label: 'Soaking tub',                                         priority: 'nice' },
  { id: 'ps6', label: 'Private sitting area or reading nook',                priority: 'nice' },
  { id: 'ps7', label: 'Good natural light in bedroom',                       priority: 'strong' },
  // Systems & Mechanicals
  { id: 'sy1',  label: 'HVAC < 7 years old (dual zone preferred)',           priority: 'must' },
  { id: 'sy2',  label: 'Tankless water heater (or <5 years tank)',           priority: 'strong' },
  { id: 'sy3',  label: '200-amp electrical panel (or upgradable)',           priority: 'must' },
  { id: 'sy4',  label: 'Updated plumbing (no galvanized / polybutylene)',    priority: 'must' },
  { id: 'sy5',  label: 'Smart thermostat (or compatible wiring)',            priority: 'nice' },
  { id: 'sy6',  label: 'Fiber internet available at address',                priority: 'must' },
  { id: 'sy7',  label: 'Solar-ready roof orientation / panel install',       priority: 'nice' },
  { id: 'sy8',  label: 'Whole-home water filtration (or space for it)',      priority: 'nice' },
  { id: 'sy9',  label: 'Generator hookup / transfer switch',                 priority: 'nice' },
  { id: 'sy10', label: 'Ring / smart doorbell wiring',                       priority: 'remodelable' },
  // Interior Finishes
  { id: 'i1',  label: 'Hardwood or LVP throughout main floor',              priority: 'strong' },
  { id: 'i2',  label: 'Carpet in bedrooms (or can add rugs)',               priority: 'skip' },
  { id: 'i3',  label: '9-ft ceilings minimum on main floor',                priority: 'strong' },
  { id: 'i4',  label: 'Crown molding or clean trim detail',                 priority: 'nice' },
  { id: 'i5',  label: 'Neutral paint (or we\'ll repaint anyway)',            priority: 'remodelable' },
  { id: 'i6',  label: 'Plenty of natural light / large windows',            priority: 'must' },
  { id: 'i7',  label: 'Updated bathrooms (or fixable)',                     priority: 'remodelable' },
  { id: 'i8',  label: 'No popcorn ceilings',                                priority: 'dealbreak' },
  { id: 'i9',  label: 'Fireplace (gas preferred)',                          priority: 'nice' },
  { id: 'i10', label: 'Built-ins or shelving in office/flex room',          priority: 'nice' },
  // Kid & Family Life
  { id: 'kd1', label: 'Safe play area / yard for kids 5 & 2',              priority: 'must' },
  { id: 'kd2', label: 'Neighbor kids / family-friendly street',             priority: 'strong' },
  { id: 'kd3', label: 'Playroom, loft, or bonus room for kids',             priority: 'strong' },
  { id: 'kd4', label: 'Secondary full bath near kids rooms',                priority: 'must' },
  { id: 'kd5', label: 'Near parks, trails, or playground',                  priority: 'strong' },
  { id: 'kd6', label: 'Proximity to pediatrician / urgent care',            priority: 'strong' },
  { id: 'kd7', label: 'Short drive to indoor kids activities',              priority: 'nice' },
  // Financial Parameters
  { id: 'fi1', label: 'Purchase price ≤ $550K',                              priority: 'must' },
  { id: 'fi2', label: 'Purchase price ≤ $475K (ideal)',                      priority: 'strong' },
  { id: 'fi3', label: 'HOA ≤ $100/month',                                    priority: 'must' },
  { id: 'fi4', label: 'Property taxes ≤ 1% effective rate (SC advantage)',   priority: 'strong' },
  { id: 'fi5', label: 'Qualifies for Palmetto Heroes program (RN)',           priority: 'strong' },
  { id: 'fi6', label: 'No major deferred maintenance at closing',            priority: 'must' },
  { id: 'fi7', label: 'Seller concessions negotiable if needed',             priority: 'nice' },
  { id: 'fi8', label: 'Below market comps (value play)',                     priority: 'nice' },
  // Hard No's (deal breakers)
  { id: 'db1', label: 'Back of house directly on busy road/highway',        priority: 'dealbreak' },
  { id: 'db2', label: 'Less than 3 beds',                                   priority: 'dealbreak' },
  { id: 'db3', label: 'In flood zone AE or higher',                         priority: 'dealbreak' },
  { id: 'db4', label: 'HOA > $200/month or overly restrictive covenants',   priority: 'dealbreak' },
  { id: 'db5', label: 'Known foundation issues or structural damage',       priority: 'dealbreak' },
  { id: 'db6', label: 'No fiber internet available',                        priority: 'dealbreak' },
  { id: 'db7', label: 'Major mold / environmental issues',                  priority: 'dealbreak' },
  { id: 'db8', label: 'Within 500ft of power lines',                        priority: 'dealbreak' },
]

export const MUST_ITEMS   = PROFILE_ITEMS.filter(i => i.priority === 'must')
export const DEAL_BREAKERS = PROFILE_ITEMS.filter(i => i.priority === 'dealbreak')

/**
 * Extracts a few representative keywords from a criteria label for fuzzy matching
 * against free-text AI analysis output.
 */
function extractKeywords(label: string): string[] {
  // Strip parenthetical notes, lowercase, split to words ≥ 4 chars
  return label
    .replace(/\(.*?\)/g, '')
    .toLowerCase()
    .split(/[\s,/–—<>≥≤]+/)
    .filter(w => w.length >= 4)
}

/**
 * Returns true if the criteria label has at least one keyword that appears
 * in the analysis text corpus.
 */
export function labelMatchesText(label: string, corpus: string): string[] {
  const lower = corpus.toLowerCase()
  return extractKeywords(label).filter(kw => lower.includes(kw))
}

export interface ProfileFitResult {
  mustMatches: ProfileItem[]      // must-haves mentioned positively in analysis
  dealBreakHits: ProfileItem[]    // deal-breakers mentioned (flagged as concern)
  mustUnknown: ProfileItem[]      // must-haves not mentioned at all
  score: number                   // 0–100 rough fit score
}

/**
 * Scores a property analysis against the home profile criteria.
 * Uses the full text of pros + summary for must-have matching,
 * and cons + warnings for deal-breaker detection.
 * Pass `liveItems` to score against the user's saved profile instead of defaults.
 */
export function scoreProfileFit(
  analysis: {
    summary?: string
    pros?: string[]
    cons?: string[]
    warnings?: string[]
  },
  liveItems: ProfileItem[] = PROFILE_ITEMS,
): ProfileFitResult {
  const mustItems    = liveItems.filter(i => i.priority === 'must')
  const dealBreakers = liveItems.filter(i => i.priority === 'dealbreak')

  const positiveCorpus = [
    analysis.summary ?? '',
    ...(analysis.pros ?? []),
  ].join(' ')

  const negativeCorpus = [
    ...(analysis.cons ?? []),
    ...(analysis.warnings ?? []),
  ].join(' ')

  const allCorpus = positiveCorpus + ' ' + negativeCorpus

  const mustMatches: ProfileItem[] = []
  const mustUnknown: ProfileItem[] = []
  for (const item of mustItems) {
    const hits = labelMatchesText(item.label, positiveCorpus)
    if (hits.length > 0) {
      mustMatches.push(item)
    } else {
      mustUnknown.push(item)
    }
  }

  const dealBreakHits: ProfileItem[] = []
  for (const item of dealBreakers) {
    const hits = labelMatchesText(item.label, allCorpus)
    if (hits.length > 0) {
      dealBreakHits.push(item)
    }
  }

  const mustScore = mustItems.length > 0
    ? (mustMatches.length / mustItems.length) * 70
    : 70
  const dealPenalty = Math.min(dealBreakHits.length * 15, 40)
  const score = Math.max(0, Math.round(mustScore + 30 - dealPenalty))

  return { mustMatches, dealBreakHits, mustUnknown, score }
}

// ─── Supabase persistence ──────────────────────────────────────────────────────

const PROFILE_KEY = 'house_profile_categories'

/**
 * Saves the current categories state to Supabase.
 * Strips JSX icons before serializing (icons are re-attached on load).
 */
export async function saveProfileCategories(
  categories: Array<{ id: string; title: string; items: ProfileItem[] }>
): Promise<void> {
  const serializable = categories.map(c => ({
    id: c.id,
    title: c.title,
    items: c.items.map(i => ({ id: i.id, label: i.label, priority: i.priority })),
  }))
  await supabase
    .from('profile')
    .update({ value: JSON.stringify(serializable), updated_by: 'app' })
    .eq('key', PROFILE_KEY)
}

/**
 * Loads saved profile items from Supabase.
 * Falls back to PROFILE_ITEMS defaults if no data is stored yet.
 */
export async function loadProfileItems(): Promise<ProfileItem[]> {
  const { data } = await supabase
    .from('profile')
    .select('value')
    .eq('key', PROFILE_KEY)
    .single()

  if (!data?.value) return PROFILE_ITEMS

  try {
    const parsed = JSON.parse(data.value) as Array<{
      id: string
      title: string
      items: ProfileItem[]
    }>
    return parsed.flatMap(c => c.items)
  } catch {
    return PROFILE_ITEMS
  }
}
