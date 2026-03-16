// AI analysis system prompt and user prompt builders
// Deno-compatible — no Vite imports

// Hardcoded metro knowledge — suburb list and employment centers stay constant.
// This is domain knowledge about the metros, not user-specific data.
const METRO_KNOWLEDGE = `
METRO IDENTIFICATION — use the suburb list below to determine which metro a property or school belongs to:
- Charlotte NC metro: Fort Mill SC, Tega Cay SC, Clover SC, Lake Wylie SC, Indian Land SC, Waxhaw NC, Huntersville NC, Concord NC, Monroe NC, Mooresville NC
- Greenville SC metro: Greenville SC, Simpsonville SC, Mauldin SC, Greer SC, Taylors SC, Fountain Inn SC, Powdersville SC
- Raleigh NC metro: Raleigh NC, Cary NC, Apex NC, Morrisville NC, Wake Forest NC, Holly Springs NC, Fuquay-Varina NC, Durham NC, Chapel Hill NC

KEY EMPLOYMENT CENTERS BY METRO — grade commute ONLY against the property's own metro. Never cross-compare metros:
- Charlotte NC metro: Charlotte CBD (Uptown), Ballantyne Corporate Park, SouthPark, I-485 corridor employers
- Greenville SC metro: Downtown Greenville, BMW Manufacturing (Greer/Spartanburg), Michelin North America HQ (Greenville), Prisma Health, GHS, Donaldson Industrial Park
- Raleigh NC metro: Research Triangle Park (RTP), Downtown Raleigh, RDU Airport corridor, Durham/Chapel Hill medical and university employers

CRITICAL COMMUTE RULE: A property in Simpsonville SC, Mauldin SC, Greer SC, or any other Greenville SC metro suburb must have its commute graded against Greenville SC employment centers — never against Charlotte. A Fort Mill or Waxhaw property is graded against Charlotte employers. A Cary or Apex property is graded against RTP/Raleigh employers. If unsure which metro a property is in based on the area field, use your best judgment from the suburb name, then apply the correct employment centers.`

// Build dynamic system prompt from live profile data.
// Falls back to sensible defaults when profile fields are not yet set.
export function buildResearchContext(profile: Record<string, string> = {}): string {
  const destinations  = profile.destination        || 'Charlotte NC suburbs, Greenville SC area, Raleigh NC area'
  const budget        = profile.destination_budget  || '$400K–$630K'
  const kids          = profile.kids                || 'Two school-age children'
  const kidsGrades    = profile.kids_grades         || ''
  const targetSuburbs = profile.target_suburbs      || ''
  const employment    = profile.employment          || ''

  const profileLines = [
    `- Evaluating: ${destinations}`,
    `- Top priority: School quality (K–12) — this outweighs all other factors`,
    `- Budget: ${budget}`,
    `- ${kids}`,
    kidsGrades    ? `- Children's grades/schools: ${kidsGrades}`    : '',
    targetSuburbs ? `- Target suburbs: ${targetSuburbs}`            : '',
    employment    ? `- Employment situation: ${employment}`         : '',
  ].filter(Boolean).join('\n')

  return `You are a relocation advisor helping a family evaluate homes and schools across multiple destination cities.
Use your knowledge of US real estate markets, school district rankings, property taxes, commute patterns, and neighborhood characteristics to provide accurate, specific analysis.

FAMILY PROFILE:
${profileLines}

When analyzing, draw on your knowledge of:
- Local school district rankings (state and national), GreatSchools ratings, math/reading proficiency
- Property tax rates by county (SC counties are typically lower than NC counties)
- Typical commute patterns and distances within the metro area
- Neighborhood safety, walkability, and amenity access
- Market trends, typical price-per-sqft, and days on market for the area
- State income tax differences: SC (graduated, up to 7%) vs NC (flat 4.75%)
- Flood zones, environmental risks, and HOA norms for the specific suburb

Be specific to the area and address provided — do not give generic responses.
Grade each property relative to its own metro market — a "B" for budget fit means it's good value for that specific metro's market, not relative to a different metro.
${METRO_KNOWLEDGE}`
}

// Property-specific user prompt template
export function buildPropertyPrompt(data: Record<string, unknown>, profile: Record<string, string> = {}): string {
  const budget = profile.destination_budget || '$400K–$630K'
  return `Analyze this property for a family evaluating relocation options.
Return ONLY a valid JSON object — no markdown, no explanation, just the JSON.

PROPERTY:
Address: ${data.address || 'Unknown'}
Area: ${data.area || 'Unknown'}
Asking Price: ${data.price ? '$' + Number(data.price).toLocaleString() : 'Unknown'}
Beds: ${data.beds || '?'} | Baths: ${data.baths || '?'} | Sq Ft: ${data.sqft ? Number(data.sqft).toLocaleString() : '?'}
Notes: ${data.notes || 'none'}

JSON shape (return EXACTLY this structure):
{
  "overallGrade": "A"|"B"|"C"|"D"|"F",
  "summary": "2-3 sentence overall take on this specific property and its location",
  "categories": {
    "schools": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Schools", "icon": "🎓", "text": "1-2 sentences about school district quality for this specific area" },
    "budget":  { "grade": "A"|"B"|"C"|"D"|"F", "label": "Budget Fit", "icon": "💰", "text": "1-2 sentences about value vs ${budget} budget and the local market" },
    "commute": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Commute", "icon": "🚗", "text": "1-2 sentences about commute to the nearest major employment center in this property's metro" },
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

// School-specific user prompt template
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
