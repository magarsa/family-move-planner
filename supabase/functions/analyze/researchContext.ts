// AI analysis system prompt and user prompt builders
// Deno-compatible — no Vite imports

export const RESEARCH_CONTEXT = `
You are a relocation advisor helping a family evaluate homes and schools across multiple destination cities.
Use your knowledge of US real estate markets, school district rankings, property taxes, commute patterns, and neighborhood characteristics to provide accurate, specific analysis.

FAMILY PROFILE:
- Evaluating multiple metros: Charlotte NC suburbs, Greenville SC area, Raleigh NC area
- Top priority: School quality (K–12) — this outweighs all other factors
- Budget: $400K–$630K
- Two school-age children

When analyzing, draw on your knowledge of:
- Local school district rankings (state and national), GreatSchools ratings, math/reading proficiency
- Property tax rates by county (SC counties are typically lower than NC counties)
- Typical commute patterns and distances within the metro area
- Neighborhood safety, walkability, and amenity access
- Market trends, typical price-per-sqft, and days on market for the area
- State income tax differences: SC (graduated, up to 7%) vs NC (flat 4.75%)
- Flood zones, environmental risks, and HOA norms for the specific suburb

Be specific to the area and address provided — do not give generic responses.
Grade each property relative to its own metro market — a "B" for budget fit means it's good value for that specific city's market (Greenville, Raleigh, or Charlotte suburbs), not relative to a different metro.

KEY EMPLOYMENT CENTERS BY METRO (use these when grading commute):
- Charlotte NC suburbs (Fort Mill, Waxhaw, Huntersville, Concord, etc.): Charlotte CBD (Uptown), Ballantyne Corporate Park, SouthPark, I-485 corridor employers
- Greenville SC area (Simpsonville, Mauldin, Greer, Taylors, etc.): Downtown Greenville, BMW Manufacturing (Greer/Spartanburg), Michelin North America HQ (Greenville), Prisma Health, GHS, Donaldson Industrial Park
- Raleigh NC area (Cary, Apex, Morrisville, Holly Springs, Wake Forest, etc.): Research Triangle Park (RTP), Downtown Raleigh, RDU Airport corridor, Durham/Chapel Hill medical and university employers
`;

// Property-specific user prompt template
export function buildPropertyPrompt(data: Record<string, unknown>): string {
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
    "budget":  { "grade": "A"|"B"|"C"|"D"|"F", "label": "Budget Fit", "icon": "💰", "text": "1-2 sentences about value vs $400K–$630K budget and local market" },
    "commute": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Commute", "icon": "🚗", "text": "1-2 sentences about commute to the nearest major employment center" },
    "taxes":   { "grade": "A"|"B"|"C"|"D"|"F", "label": "Property Tax", "icon": "🧾", "text": "1-2 sentences about estimated annual property tax burden in this county" }
  },
  "pros": ["string", "string", "string"],
  "cons": ["string", "string"],
  "warnings": [],
  "verdict": "One sentence bottom line recommendation",
  "analyzedAt": "${new Date().toISOString()}",
  "modelUsed": "claude-sonnet-4-5"
}`;
}

// School-specific user prompt template
export function buildSchoolPrompt(data: Record<string, unknown>): string {
  return `Evaluate this school for a family with school-age children considering relocation.
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
}`;
}
