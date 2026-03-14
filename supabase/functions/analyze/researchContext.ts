// Combined knowledge base for AI analysis
// Sources: Home-Finder RESEARCH_CONTEXT + City Compare CITIES data
// Deno-compatible — no Vite imports

export const RESEARCH_CONTEXT = `
You are a relocation advisor helping a family evaluate homes and schools in the Charlotte, NC metro area.
Use the research data below as your primary knowledge source.

FAMILY PROFILE:
- Moving from Des Moines, IA → Charlotte, NC suburbs (target: Sep 2026)
- Top priority: School quality (K–12) — this outweighs all other factors
- Budget: $400K–$630K
- Two school-age children

=== CHARLOTTE SUBURB REAL ESTATE DATA ===

FORT MILL, SC
- District: Fort Mill School District — #1 SC, #91 Nationally, Top 1% US
- Median: $435K–$540K | $/sqft: ~$222 | DOM: 62–85 | YoY: +7.3%
- Tax on $500K: ~$2,200/yr ($183/mo) | Commute: ~30 min S via I-77
- Schools: Gold Hill Elem (#1 SC), Tega Cay Elem (#2 SC), Pleasant Knoll Elem (#3 SC), Springfield Middle (#1 SC), Catawba Ridge HS (#7 SC), Fort Mill HS (#11 SC), Nation Ford HS (#14 SC) | Ratio 13:1
- $500K–$600K: 3–4 BR, 2,200–2,800 sqft newer build w/ HOA amenities
- PROS: Best schools in search, perfect budget fit, shortest SC commute, SC tax advantage
- CONS: Most competitive market, growing traffic, verify enrollment zone before offer

TEGA CAY, SC
- District: Fort Mill School District (SAME as Fort Mill) — #1 SC
- Median: $505K–$587K | $/sqft: ~$231 | DOM: 117 days (buyer leverage!) | 57% sold BELOW ask
- Tax on $500K: ~$2,200/yr | Commute: ~30 min S via I-77
- Flood: ~9% (peninsula) | Wildfire: 54% over 30 yrs
- Same schools as Fort Mill. Lake peninsula, golf cart community.
- PROS: Elite Fort Mill SD, real negotiating power, Lake Wylie lifestyle, SC taxes
- CONS: Upper budget range, some flood/wildfire risk on specific lots

CLOVER, SC
- District: Clover School District — #3 SC
- Median: $286K–$406K | $/sqft: ~$175 | DOM: 49–58 | YoY: -2.7% (buyer opp)
- Tax on $500K: ~$2,000/yr ($167/mo) — LOWEST | Commute: ~40 min SW
- Schools: Oakridge Elem (#15 SC), Crowders Creek Elem (#36 SC), Clover HS (Top 20 SC)
- $400K–$550K: 4–5 BR, 2,500–3,200 sqft — MOST HOUSE PER DOLLAR
- PROS: Best price/sqft, #3 SC schools, lowest taxes, buyer leverage, maximum space
- CONS: More rural, fewer restaurants/retail, longer commute

LAKE WYLIE, SC
- District: Clover School District — #3 SC (same as Clover)
- Median: $455K–$550K | $/sqft: ~$222 | DOM: 72–95 (buyer leverage)
- Tax on $500K: ~$2,200/yr | Commute: ~35 min W
- Flood: ⚠️ 24% significant flood risk — MUST check FEMA maps | Wildfire: 80% over 30 yrs
- Same schools as Clover. Lake lifestyle, boating, River Hills Golf.
- PROS: Lake lifestyle, strong Clover schools, SC taxes, buyer leverage
- CONS: 24% flood risk = must verify per property, elevated insurance

INDIAN LAND, SC
- District: Lancaster County R-1 — mid-tier SC, good but not elite
- Median: $442K–$525K | $/sqft: ~$210 | DOM: 57–71
- Tax on $500K: ~$2,100/yr | Commute: ~25 min S — CLOSEST SC to Charlotte
- Schools: Indian Land Elem (GS 8/10), Indian Land Middle (Niche A- but GS 4/10 — DIVERGENT), Indian Land HS (mid-tier)
- PROS: Closest SC suburb to Charlotte, SC taxes, good elem schools, lots of inventory
- CONS: NOT at Fort Mill/Clover tier, rapid growth = traffic nightmare at peak hours

MOORESVILLE, NC
- District: Mooresville Graded SD — #5 NC, nationally recognized digital learning (1:1)
- Median: $453K–$479K | $/sqft: ~$192 | DOM: 62–100 | YoY: +1%
- Tax on $470K: ~$3,500–$3,800/yr ($308/mo) | Commute: ~40 min NORTH via I-77
- DIRECTION: NORTH of Charlotte — opposite direction from SC suburbs
- Schools: Rocky River Elem (#76 NC), Mooresville HS (#130 NC), Crossroads Early College HS (#86 NC) | 1:1 digital learning | Iredell-Statesville: 53% math proficiency (top of group)
- Adjacent to Lake Norman
- PROS: #5 NC, consistent quality across all 8 schools, no zone risk, Lake Norman
- CONS: NC taxes ~$125/mo MORE than SC, NORTH of Charlotte (wrong if job is south)
- CRITICAL: Only consider if job is north of Charlotte or fully remote

HUNTERSVILLE, NC (Charlotte suburb)
- District: Charlotte-Mecklenburg Schools (North Lake Norman zone) — A-rated
- Median: $465K | Property Tax: 0.59% Mecklenburg County | Commute: 20–25 min to Charlotte
- Safest suburb: crime index 25 (among safest in NC)
- Airport: 20 min to CLT (best access of all suburbs)
- Healthcare: Novant Health Huntersville Medical Center
- PROS: Very safe, great CLT airport access, good CMS schools, Lake Norman lifestyle
- CONS: NC income tax (4.25%) applies; upper-mid price range

CONCORD, NC (Charlotte suburb)
- District: Cabarrus County Schools — B+/A rated, 48% math proficiency
- Median: $365K | Property Tax: 0.61% Cabarrus County | Commute: 25–30 min to Charlotte
- Most affordable Charlotte-area NC suburb | Most diverse suburb (52% White, 23% Black, 17% Hispanic)
- PROS: Best budget option in NC, diverse community, 25–30 min to CLT
- CONS: Schools good but not exceptional; B+ vs Fort Mill A+

MONROE, NC
- District: Union County Public Schools — HIGHLY VARIABLE by zone (A+ to C-)
- Median: $395K–$409K | $/sqft: ~$200 | YoY: +8% | Commute: ~50 min SE — LONGEST
- Tax on $400K: ~$2,800–$3,100/yr | Charter backup: Union Academy Charter (A-), Central Academy of Tech & Arts (#6 region)
- PROS: Most affordable NC option, rising appreciation
- CONS: LONGEST commute, NC taxes, severe school zone variability

WAXHAW, NC
- Median: $584K–$700K — EXCEEDS BUDGET | Tax: ~$4,200–$5,000/yr — HIGHEST
- VERDICT: NOT RECOMMENDED. Over budget, highest taxes, zone variability

=== PROPERTY TAX COMPARISON (annual on $500K home) ===
Clover SC: $2,000 | Indian Land SC: $2,100 | Fort Mill SC: $2,200 | Tega Cay SC: $2,200 | Lake Wylie SC: $2,200 | Concord NC: $3,050 | Huntersville NC: $2,950 | Monroe NC: $2,900 | Mooresville NC: $3,650 | Waxhaw NC: $4,600

=== COMMUTE TIMES TO CHARLOTTE UPTOWN ===
Indian Land: ~25 min | Fort Mill/Huntersville: ~30 min | Tega Cay: ~30 min | Lake Wylie: ~35 min | Clover: ~40 min | Mooresville: ~40 min (NORTH) | Concord: ~25–30 min | Waxhaw: ~45 min | Monroe: ~50 min

=== CITY COMPARISON DATA (Charlotte region) ===

CHARLOTTE, NC (metro)
- Housing: Median $425K, 0.62% property tax | Best suburbs: Fort Mill SC, Matthews, Weddington, Ballantyne
- Jobs (Software Engineer): $106K–$130K | Employers: Wells Fargo, Bank of America, AvidXchange, LendingTree
- Jobs (IT Support): $62K–$88K | Employers: Atrium Health, Novant, Wells Fargo
- Jobs (RN): $75K–$87K + up to $15K bonus | Employers: Atrium Health, Novant, Carolina Medical Center
- State tax: NC flat 4.25% (→ 3.99% in 2026) | BEST total tax burden in this search
- Schools: A+ in suburbs (suburb-dependent); 51% math proficiency metro-wide
- Safety: Crime index 49 (metro); safest in Fort Mill SC, Weddington, Matthews
- Climate: Winter 42°F avg, Summer 88°F avg, 9 outdoor months | Occasional ice storms
- Environment: Air quality D ozone (concern); water: Good (Lake Norman/Mountain Island Lake)
- Diversity: 38.7% White, 33.7% Black, 17% Hispanic, 6.5% Asian — most diverse in group
- Airport: CLT — American Airlines hub, 180+ nonstops, Europe direct — BEST in group

FORT MILL, SC (suburb)
- Housing: Median $390K, 0.52% property tax | Best areas: Tega Cay, Baxter Village, Springfield
- Schools: #1 SC school district | A+ rating | 58% math proficiency — HIGHEST in group
- Safety: Crime index 22 — safest in both Carolinas
- State tax: SC income tax up to 6% applies even working in Charlotte — adds $3K–$4K vs NC
- Daycare: ~$900/mo
- Airport: 20 min to CLT

MOORESVILLE, NC (suburb)
- Housing: Median $420K, 0.45% property tax — LOWEST property tax of all 8 cities
- Schools: Iredell-Statesville, #5 NC | A+ top performers | 53% math proficiency
- Safety: Crime index 28 | Safe Lake Norman suburb
- Commute: 25–35 min to Charlotte (north)
- Daycare: ~$950/mo

HUNTERSVILLE, NC (suburb)
- Housing: Median $465K, 0.59% property tax
- Schools: CMS Lake Norman zone, A-rated
- Safety: Crime index 25 — among safest NC cities
- Commute: 20–25 min to Charlotte
- Airport: 20 min to CLT — best access
- Daycare: ~$1,050/mo

CONCORD, NC (suburb)
- Housing: Median $365K, 0.61% property tax — most affordable CLT suburb
- Schools: Cabarrus County, B+/A | 48% math proficiency
- Diversity: Most diverse Charlotte suburb (52% White, 23% Black, 17% Hispanic)
- Commute: 25–30 min to Charlotte
- Daycare: ~$950/mo
`;

// Property-specific user prompt template
export function buildPropertyPrompt(data: Record<string, unknown>): string {
  return `Analyze this property for a family relocating to the Charlotte, NC metro area.
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
  "summary": "2-3 sentence overall take on this specific property",
  "categories": {
    "schools": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Schools", "icon": "🎓", "text": "1-2 sentences about school district for this area" },
    "budget":  { "grade": "A"|"B"|"C"|"D"|"F", "label": "Budget Fit", "icon": "💰", "text": "1-2 sentences about value vs budget" },
    "commute": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Commute", "icon": "🚗", "text": "1-2 sentences about commute to Charlotte" },
    "taxes":   { "grade": "A"|"B"|"C"|"D"|"F", "label": "Property Tax", "icon": "🧾", "text": "1-2 sentences about annual tax burden" }
  },
  "pros": ["string", "string", "string"],
  "cons": ["string", "string"],
  "warnings": [],
  "verdict": "One sentence bottom line recommendation",
  "analyzedAt": "${new Date().toISOString()}",
  "modelUsed": "claude-sonnet-4-20250514"
}`;
}

// School-specific user prompt template
export function buildSchoolPrompt(data: Record<string, unknown>): string {
  return `Evaluate this school for a family with school-age children relocating to the Charlotte, NC metro area.
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
    "ratings":    { "grade": "A"|"B"|"C"|"D"|"F", "label": "District Rank", "icon": "⭐", "text": "1-2 sentences on state/national ranking" },
    "enrollment": { "grade": "A"|"B"|"C"|"D"|"F", "label": "Enrollment", "icon": "🏫", "text": "1-2 sentences on enrollment zone, accessibility, zoning notes" },
    "diversity":  { "grade": "A"|"B"|"C"|"D"|"F", "label": "Diversity", "icon": "🌎", "text": "1-2 sentences on student diversity and community" }
  },
  "pros": ["string", "string", "string"],
  "cons": ["string", "string"],
  "warnings": [],
  "verdict": "One sentence bottom line on whether this school fits the family's priorities",
  "analyzedAt": "${new Date().toISOString()}",
  "modelUsed": "claude-sonnet-4-20250514"
}`;
}
