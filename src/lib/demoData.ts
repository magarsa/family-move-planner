// Pre-seeded fixture data for demo mode.
// Used when isDemoMode = true — views read from here instead of Supabase.

const DAY = (n: number) => new Date(Date.now() + n * 86400000).toISOString()
const ID = (n: number) => `demo-${n.toString().padStart(4, '0')}-0000-0000-000000000000`

// ─── Todos ───────────────────────────────────────────────────────────────────
export const DEMO_TODOS = [
  { id: ID(1), text: 'Get pre-approval letter from lender', tier: 'Do First', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Alex', sort_order: 1, created_at: DAY(-10), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(2), text: 'Schedule home inspection for 42 Maple St', tier: 'Do First', completed: true, completed_at: DAY(-2), completed_by: 'Alex', branch_id: null, created_by: 'Alex', sort_order: 2, created_at: DAY(-12), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(3), text: 'Research school districts in target neighborhoods', tier: 'Do First', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Jordan', sort_order: 3, created_at: DAY(-8), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(4), text: 'Hire a local buyer\'s agent', tier: 'Do Soon', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Jordan', sort_order: 1, created_at: DAY(-6), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(5), text: 'Visit at least 5 neighborhoods on the shortlist', tier: 'Do Soon', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Alex', sort_order: 2, created_at: DAY(-5), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(6), text: 'Get quotes from 3 moving companies', tier: 'Do Soon', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Jordan', sort_order: 3, created_at: DAY(-4), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(7), text: 'Compare commute times from shortlisted properties', tier: 'Do When Ready', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Alex', sort_order: 1, created_at: DAY(-3), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(8), text: 'Research HOA fees for each property', tier: 'Do When Ready', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Jordan', sort_order: 2, created_at: DAY(-2), property_id: null, sale_timeline_phase_id: null, parent_id: null },
  { id: ID(9), text: 'Update wills and beneficiaries after move', tier: 'Later', completed: false, completed_at: null, completed_by: null, branch_id: null, created_by: 'Alex', sort_order: 1, created_at: DAY(-1), property_id: null, sale_timeline_phase_id: null, parent_id: null },
]

// ─── Notes ───────────────────────────────────────────────────────────────────
export const DEMO_NOTES = [
  { id: ID(20), content: 'Walked through 42 Maple St today — absolutely loved the backyard and the open kitchen. The master suite is bigger than expected. Concerned about the noise from the nearby highway though.', author: 'Jordan', created_at: DAY(-14) },
  { id: ID(21), content: 'Called First National Bank — pre-approval should be ready within 3 business days. Rate quoted was 6.75% for a 30-year fixed.', author: 'Alex', created_at: DAY(-12) },
  { id: ID(22), content: '78 Birchwood Ave visit was a disappointment — photos were heavily edited. Rooms are much smaller in person. Crossing it off the list.', author: 'Alex', created_at: DAY(-9) },
  { id: ID(23), content: 'Met with Sarah (realtor) — she confirmed inventory is picking up. Recommends acting quickly if we like a property. Also mentioned 112 Oakridge Dr just came back on market after a deal fell through.', author: 'Jordan', created_at: DAY(-6) },
  { id: ID(24), content: 'Drove by Maplewood Elementary on a school day — pickup/dropoff seemed very organized. Talked to a parent in the parking lot, she had great things to say. Definitely our top school pick.', author: 'Jordan', created_at: DAY(-3) },
  { id: ID(25), content: '112 Oakridge Dr visit today. Great bones but the basement has some moisture issues. Home inspector would need to assess. Price is right though. Letting it sit for a couple of days before deciding.', author: 'Alex', created_at: DAY(-1) },
]

// ─── Properties ──────────────────────────────────────────────────────────────
export const DEMO_PROPERTIES = [
  {
    id: ID(30),
    address: '42 Maple Street, Maplewood, NJ 07040',
    area: 'Maplewood, NJ',
    status: 'Visited',
    price: 685000,
    beds: 4,
    baths: 2.5,
    sqft: 2240,
    zillow_url: null,
    notes: 'Great backyard. Open kitchen. Some highway noise from Route 78.',
    branch_id: null,
    visit_at: DAY(-14),
    visit_notes: 'Loved the layout. Need to investigate highway noise levels before committing.',
    ai_analysis: null,
    ai_analyzed_at: null,
    ai_analyzed_by: null,
    added_by: 'Jordan',
    created_at: DAY(-20),
    updated_at: DAY(-14),
    updated_by: 'Jordan',
    proximity: null,
  },
  {
    id: ID(31),
    address: '112 Oakridge Drive, Millburn, NJ 07041',
    area: 'Millburn, NJ',
    status: 'Visited',
    price: 729000,
    beds: 4,
    baths: 3,
    sqft: 2560,
    zillow_url: null,
    notes: 'Great bones. Potential basement moisture issue. Top-rated school district.',
    branch_id: null,
    visit_at: DAY(-1),
    visit_notes: 'Basement needs inspection. Otherwise excellent. Price is negotiable per agent.',
    ai_analysis: null,
    ai_analyzed_at: null,
    ai_analyzed_by: null,
    added_by: 'Alex',
    created_at: DAY(-10),
    updated_at: DAY(-1),
    updated_by: 'Alex',
    proximity: null,
  },
  {
    id: ID(32),
    address: '78 Birchwood Ave, Short Hills, NJ 07078',
    area: 'Short Hills, NJ',
    status: 'Ruled Out',
    price: 795000,
    beds: 4,
    baths: 2,
    sqft: 1980,
    zillow_url: null,
    notes: 'Photos were misleading — rooms much smaller in person.',
    branch_id: null,
    visit_at: DAY(-9),
    visit_notes: 'Not what we expected. Rooms are cramped. Not worth the price.',
    ai_analysis: null,
    ai_analyzed_at: null,
    ai_analyzed_by: null,
    added_by: 'Alex',
    created_at: DAY(-15),
    updated_at: DAY(-9),
    updated_by: 'Alex',
    proximity: null,
  },
]

// ─── Schools ─────────────────────────────────────────────────────────────────
export const DEMO_SCHOOLS = [
  {
    id: ID(40),
    name: 'Maplewood Elementary School',
    district: 'South Orange-Maplewood School District',
    area: 'Maplewood, NJ',
    grades: 'K-5',
    school_type: 'Public',
    greatschools_url: null,
    notes: 'Highly rated. Very active PTA. Good arts program.',
    status: 'Top Choice',
    ai_analysis: null,
    ai_analyzed_at: null,
    ai_analyzed_by: null,
    added_by: 'Jordan',
    created_at: DAY(-15),
    updated_at: DAY(-3),
    updated_by: 'Jordan',
  },
  {
    id: ID(41),
    name: 'Millburn Middle School',
    district: 'Millburn Township School District',
    area: 'Millburn, NJ',
    grades: '6-8',
    school_type: 'Public',
    greatschools_url: null,
    notes: 'Excellent academics. Strong STEM program. Near 112 Oakridge.',
    status: 'Researching',
    ai_analysis: null,
    ai_analyzed_at: null,
    ai_analyzed_by: null,
    added_by: 'Alex',
    created_at: DAY(-10),
    updated_at: DAY(-10),
    updated_by: 'Alex',
  },
]

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const DEMO_CONTACTS = [
  {
    id: ID(50),
    name: 'Sarah Chen',
    role: 'Buyer\'s Agent',
    company: 'Sotheby\'s Realty NJ',
    phone: '(973) 555-0182',
    email: 'sarah.chen@example.com',
    website: null,
    status: 'Hired',
    notes: 'Excellent local knowledge. Very responsive. Has access to off-market listings.',
    linked_property_id: null,
    added_by: 'Jordan',
    created_at: DAY(-20),
    updated_at: DAY(-5),
    updated_by: 'Jordan',
  },
  {
    id: ID(51),
    name: 'Marcus Webb',
    role: 'Home Inspector',
    company: 'Webb Property Inspections LLC',
    phone: '(973) 555-0247',
    email: 'marcus@example.com',
    website: null,
    status: 'Active',
    notes: 'Highly recommended by Sarah. Available next week for 112 Oakridge.',
    linked_property_id: ID(31),
    added_by: 'Alex',
    created_at: DAY(-8),
    updated_at: DAY(-8),
    updated_by: 'Alex',
  },
  {
    id: ID(52),
    name: 'First National Bank — Mortgage',
    role: 'Lender',
    company: 'First National Bank',
    phone: '(800) 555-0199',
    email: 'mortgages@example.com',
    website: null,
    status: 'Active',
    notes: 'Quoted 6.75% for 30-yr fixed. Pre-approval in progress.',
    linked_property_id: null,
    added_by: 'Alex',
    created_at: DAY(-12),
    updated_at: DAY(-12),
    updated_by: 'Alex',
  },
]

// ─── Branches (Decision Points) ───────────────────────────────────────────────
export const DEMO_BRANCHES = [
  {
    id: ID(60),
    title: 'Which property should we make an offer on?',
    description: 'We\'ve visited 3 properties and narrowed it to 2 serious candidates.',
    status: 'In Progress',
    decision_made: null,
    options: ['42 Maple St — great layout, highway noise concern', '112 Oakridge Dr — excellent schools, basement needs inspection'],
    notes: 'Waiting on pre-approval and inspection results before deciding.',
    sort_order: 1,
    updated_at: DAY(-1),
    updated_by: 'Jordan',
  },
  {
    id: ID(61),
    title: 'Rent or buy in the new location?',
    description: 'Should we rent for 6–12 months to explore neighborhoods before buying?',
    status: 'Decided',
    decision_made: 'Buy directly — we\'ve done enough research and the rental market is expensive. Pre-approval gives us enough confidence to act.',
    options: ['Rent for 6 months first', 'Buy directly'],
    notes: null,
    sort_order: 2,
    updated_at: DAY(-20),
    updated_by: 'Alex',
  },
]

// ─── Whatifs ─────────────────────────────────────────────────────────────────
export const DEMO_WHATIFS = [
  { id: ID(70), scenario: 'What if interest rates rise above 7.5% before we close?', branch: '42 Maple St', status: 'Monitoring', notes: 'Would increase monthly payment by ~$400. Still affordable but would affect budget for renovations.', updated_at: DAY(-5), updated_by: 'Alex' },
  { id: ID(71), scenario: 'What if the inspection reveals major structural issues at 112 Oakridge?', branch: '112 Oakridge Dr', status: 'Unplanned', notes: 'Would either negotiate a price reduction or walk away. Budget for up to $25K in repairs.', updated_at: DAY(-3), updated_by: 'Jordan' },
  { id: ID(72), scenario: 'What if our current home doesn\'t sell within 90 days?', branch: null, status: 'Monitoring', notes: 'Would need bridge financing or to explore delayed closing on the new property.', updated_at: DAY(-10), updated_by: 'Alex' },
]

// ─── Deadlines ───────────────────────────────────────────────────────────────
export const DEMO_DEADLINES = [
  { id: ID(80), title: 'Pre-approval letter must be ready', deadline_at: DAY(2).slice(0, 10), category: 'Financing', notes: 'First National Bank processing', property_id: null, completed: false, completed_at: null, completed_by: null, added_by: 'Alex', created_at: DAY(-12), updated_at: DAY(-12) },
  { id: ID(81), title: 'Home inspection — 112 Oakridge Dr', deadline_at: DAY(5).slice(0, 10), category: 'Due Diligence', notes: 'Marcus Webb confirmed availability', property_id: ID(31), completed: false, completed_at: null, completed_by: null, added_by: 'Alex', created_at: DAY(-2), updated_at: DAY(-2) },
  { id: ID(82), title: 'Submit school enrollment paperwork', deadline_at: DAY(45).slice(0, 10), category: 'Schools', notes: 'Deadline for next school year enrollment', property_id: null, completed: false, completed_at: null, completed_by: null, added_by: 'Jordan', created_at: DAY(-5), updated_at: DAY(-5) },
  { id: ID(83), title: 'Get 3 moving company quotes', deadline_at: DAY(14).slice(0, 10), category: 'Moving', notes: null, property_id: null, completed: false, completed_at: null, completed_by: null, added_by: 'Jordan', created_at: DAY(-4), updated_at: DAY(-4) },
]

// ─── Profile ─────────────────────────────────────────────────────────────────
export const DEMO_PROFILE = [
  { key: 'move_reason', value: 'New job opportunity + want better schools for the kids', updated_at: DAY(-30), updated_by: 'Alex' },
  { key: 'target_move_date', value: DAY(90).slice(0, 10), updated_at: DAY(-30), updated_by: 'Alex' },
  { key: 'budget_min', value: '600000', updated_at: DAY(-25), updated_by: 'Jordan' },
  { key: 'budget_max', value: '750000', updated_at: DAY(-25), updated_by: 'Jordan' },
  { key: 'current_address', value: '15 Elm Court, Princeton, NJ 08540', updated_at: DAY(-30), updated_by: 'Alex' },
  { key: 'target_areas', value: 'Maplewood, Millburn, Summit, Chatham', updated_at: DAY(-20), updated_by: 'Jordan' },
  { key: 'must_haves', value: 'At least 4 bedrooms, good school district, garage, under 45 min commute to NYC', updated_at: DAY(-15), updated_by: 'Jordan' },
  { key: 'nice_to_haves', value: 'Finished basement, large backyard, open floor plan', updated_at: DAY(-15), updated_by: 'Alex' },
]

// ─── Contact Notes ────────────────────────────────────────────────────────────
export const DEMO_CONTACT_NOTES = [
  { id: ID(90), contact_id: ID(50), content: 'Sarah sent us 8 new listings matching our criteria. Scheduled visits for 3 of them next weekend.', note_type: 'Email', amount: null, note_date: DAY(-7), added_by: 'Jordan', created_at: DAY(-7) },
  { id: ID(91), contact_id: ID(50), content: 'Quick call — Sarah confirmed seller of 112 Oakridge is motivated. Dropped price by $15K last week.', note_type: 'Call', amount: null, note_date: DAY(-3), added_by: 'Alex', created_at: DAY(-3) },
  { id: ID(92), contact_id: ID(52), content: 'Submitted pre-approval application. Need to send last 2 years of tax returns.', note_type: 'Note', amount: null, note_date: DAY(-12), added_by: 'Alex', created_at: DAY(-12) },
]

// ─── Aggregated export ────────────────────────────────────────────────────────
export const DEMO_DATA = {
  todos:         DEMO_TODOS,
  notes:         DEMO_NOTES,
  properties:    DEMO_PROPERTIES,
  schools:       DEMO_SCHOOLS,
  contacts:      DEMO_CONTACTS,
  branches:      DEMO_BRANCHES,
  whatifs:       DEMO_WHATIFS,
  deadlines:     DEMO_DEADLINES,
  profile:       DEMO_PROFILE,
  contact_notes: DEMO_CONTACT_NOTES,
}
