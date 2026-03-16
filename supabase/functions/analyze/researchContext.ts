// AI analysis system prompt and user prompt builders
// Deno-compatible — no Vite imports

// ---------------------------------------------------------------------------
// Metro detection — determined in code, not left to Claude's inference.
// ---------------------------------------------------------------------------
const METRO_MAP: Array<{ metro: string; suburbs: string[]; employers: string }> = [
  {
    metro: 'Greenville SC',
    suburbs: ['greenville, sc', 'simpsonville', 'mauldin', 'greer', 'taylors', 'fountain inn', 'powdersville'],
    employers: 'Downtown Greenville, BMW Manufacturing (Greer/Spartanburg), Michelin North America HQ (Greenville), Prisma Health / GHS, Donaldson Industrial Park',
  },
  {
    metro: 'Charlotte NC',
    suburbs: ['fort mill', 'tega cay', 'clover', 'lake wylie', 'indian land', 'waxhaw', 'huntersville', 'concord', 'monroe, nc', 'mooresville'],
    employers: 'Charlotte CBD (Uptown), Ballantyne Corporate Park, SouthPark, I-485 corridor employers',
  },
  {
    metro: 'Raleigh NC',
    suburbs: ['raleigh', 'cary', 'apex', 'morrisville', 'wake forest', 'holly springs', 'fuquay', 'chapel hill', 'durham'],
    employers: 'Research Triangle Park (RTP), Downtown Raleigh, RDU Airport corridor, Durham/Chapel Hill medical and university employers',
  },
]

export function detectMetro(area: string): { metro: string; employers: string } | null {
  const a = (area || '').toLowerCase()
  for (const entry of METRO_MAP) {
    if (entry.suburbs.some(s => a.includes(s))) {
      return { metro: entry.metro, employers: entry.employers }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// System prompt — built dynamically from live profile data.
// ---------------------------------------------------------------------------
export function buildResearchContext(profile: Record<string, string> = {}): string {
  const destinations  = profile.destination        || 'Charlotte NC suburbs, Greenville SC area, Raleigh NC area'
  const budget        = profile.destination_budget  || '$400K–$630K'
  const kids          = profile.kids                || 'Two school-age children'
  const kidsGrades    = profile.kids_grades         || ''
  const targetSuburbs = profile.target_suburbs      || ''
  const employment    = profile.employment          || ''

  const profileLines = [
    `- Evaluating properties across ALL of these areas (each is a valid option, not a conflict): ${destinations}`,
    `- Top priority: School quality (K–12) — this outweighs all other factors`,
    `- Budget: ${budget}`,
    `- ${kids}`,
    kidsGrades    ? `- Children's grades/schools: ${kidsGrades}`  : '',
    targetSuburbs ? `- Target suburbs: ${targetSuburbs}`          : '',
    employment    ? `- Employment situation: ${employment}`       : '',
  ].filter(Boolean).join('\n')

  return `You are a relocation advisor helping a family evaluate homes and schools across multiple destination cities.
Use your knowledge of US real estate markets, school district rankings, property taxes, commute patterns, and neighborhood characteristics to provide accurate, specific analysis.

FAMILY PROFILE:
${profileLines}

IMPORTANT: This family is actively considering ALL metros listed above simultaneously. A property in the Greenville SC area is NOT a conflict with their goals — it is one of their target options. Do not penalize a property for being in Greenville SC, Raleigh NC, or any other listed metro. Grade each property purely on its own merits within its own local market.

When analyzing, draw on your knowledge of:
- Local school district rankings (state and national), GreatSchools ratings, math/reading proficiency
- Property tax rates by county (SC counties are typically lower than NC counties)
- Typical commute patterns and distances within the metro area
- Neighborhood safety, walkability, and amenity access
- Market trends, typical price-per-sqft, and days on market for the area
- State income tax differences: SC (graduated, up to 7%) vs NC (flat 4.75%)
- Flood zones, environmental risks, and HOA norms for the specific suburb

Grade each property relative to its own metro market — a "B" for budget fit means it's good value for that specific metro's market, not relative to a different metro. Never compare a Greenville SC property against Charlotte employers or vice versa.`
}

// ---------------------------------------------------------------------------
// Property user prompt — includes explicit metro + employment center lookup
// so Claude cannot confuse which metro to use for commute grading.
// ---------------------------------------------------------------------------
export function buildPropertyPrompt(data: Record<string, unknown>, profile: Record<string, string> = {}): string {
  const budget   = profile.destination_budget || '$400K–$630K'
  const areaStr  = String(data.area || '')
  const metroHit = detectMetro(areaStr)

  const metroLine = metroHit
    ? `Metro: ${metroHit.metro} (grade commute ONLY against: ${metroHit.employers})`
    : `Metro: unknown — infer from address/area and use the matching metro's employment centers`

  return `Analyze this property for a family evaluating relocation options across multiple metros.
Return ONLY a valid JSON object — no markdown, no explanation, just the JSON.

PROPERTY:
Address: ${data.address || 'Unknown'}
Area: ${areaStr || 'Unknown'}
${metroLine}
Asking Price: ${data.price ? '$' + Number(data.price).toLocaleString() : 'Unknown'}
Beds: ${data.beds || '?'} | Baths: ${data.baths || '?'} | Sq Ft: ${data.sqft ? Number(data.sqft).toLocaleString() : '?'}
Notes: ${data.notes || 'none'}

JSON shape (return EXACTLY this structure):
{
  "overallGrade": "A"|"B"|"C"|"D"|"F",
  "summary": "2-3 sentence overall take on this specific property and its location within its own metro",
  "categories": {
    "schools": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Schools", "icon": "🎓", "text": "1-2 sentences about school district quality for this specific area" },
    "budget":  { "grade": "A"|"B"|"C"|"D"|"F", "label": "Budget Fit", "icon": "💰", "text": "1-2 sentences about value vs ${budget} budget and the local market" },
    "commute": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Commute", "icon": "🚗", "text": "1-2 sentences about commute to the employment centers listed in the Metro line above" },
    "taxes":   { "grade": "A"|"B"|"C"|"D"|"F", "label": "Property Tax", "icon": "🧾", "text": "1-2 sentences about estimated annual property tax burden in this county" }
  },
  "pros": ["string", "string", "string"],
  "cons": ["string", "string"],
  "warnings": [],
  "verdict": "One sentence bottom line recommendation",
  "analyzedAt": "${new Date().toISOString()}",
  "modelUsed": "claude-sonnet-4-5"
}`
}

// ---------------------------------------------------------------------------
// School user prompt
// ---------------------------------------------------------------------------
export function buildSchoolPrompt(data: Record<string, unknown>, profile: Record<string, string> = {}): string {
  const kids = profile.kids || 'two school-age children'
  return `Evaluate this school for a family with ${kids} considering relocation.
Return ONLY a valid JSON object — no markdown, no explanation, just the JSON.

SCHOOL:
Name: ${data.name || 'Unknown'}
District: ${data.district || 'Unknown'}
Area: ${data.area || 'Unknown'}
Grades: ${data.grades || 'Unknown'}
Type: ${data.school_type || 'Unknown'}
Notes: ${data.notes || 'none'}

JSON shape (return EXACTLY this structure):
{
  "overallGrade": "A"|"B"|"C"|"D"|"F",
  "summary": "2-3 sentence overview of this school and its district",
  "categories": {
    "academics":  { "grade": "A"|"B"|"C"|"D"|"F", "label": "Academics", "icon": "📚", "text": "1-2 sentences on academic performance and curriculum" },
    "ratings":    { "grade": "A"|"B"|"C"|"D"|"F", "label": "District Rank", "icon": "⭐", "text": "1-2 sentences on state/national ranking and test scores" },
    "enrollment": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Enrollment", "icon": "🏫", "text": "1-2 sentences on enrollment zone, accessibility, zoning or lottery notes" },
    "diversity":  { "grade": "A"|"B"|"C"|"D"|"F", "label": "Diversity", "icon": "🌎", "text": "1-2 sentences on student diversity and community" }
  },
  "pros": ["string", "string", "string"],
  "cons": ["string", "string"],
  "warnings": [],
  "verdict": "One sentence bottom line on whether this school fits a family prioritizing K–12 school quality",
  "analyzedAt": "${new Date().toISOString()}",
  "modelUsed": "claude-sonnet-4-5"
}`
}
