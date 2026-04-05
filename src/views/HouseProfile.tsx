import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, MapPin, GraduationCap, Trees, Home, LayoutDashboard,
  ChefHat, BedDouble, Wrench, Paintbrush, Baby, DollarSign, Ban,
  Edit3, BarChart2, Printer, StickyNote, X, Plus, Download, Loader2,
  Sparkles, RefreshCw, Pencil,
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { summarizeProfile } from '../lib/summarizeProfile'
import { saveProfileCategories, loadProfileItems, PROFILE_ITEMS } from '../lib/houseProfileData'

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityId = 'must' | 'dealbreak' | 'strong' | 'nice' | 'remodelable' | 'skip'

interface Priority {
  id: PriorityId
  label: string
  textColor: string
  bgColor: string
  dotColor: string
  borderColor: string
}

interface Item {
  id: string
  label: string
  priority: PriorityId
  note: string
}

interface Category {
  id: string
  icon: React.ReactNode
  title: string
  items: Item[]
}

type View = 'edit' | 'summary' | 'print'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: Priority[] = [
  { id: 'must',        label: 'Must Have',       textColor: 'text-emerald-700', bgColor: 'bg-emerald-50',  dotColor: 'bg-emerald-600', borderColor: 'border-emerald-200' },
  { id: 'dealbreak',   label: 'Deal Breaker',     textColor: 'text-red-700',     bgColor: 'bg-red-50',      dotColor: 'bg-red-600',     borderColor: 'border-red-200' },
  { id: 'strong',      label: 'Strong Want',      textColor: 'text-amber-700',   bgColor: 'bg-amber-50',    dotColor: 'bg-amber-500',   borderColor: 'border-amber-200' },
  { id: 'nice',        label: 'Nice to Have',     textColor: 'text-blue-700',    bgColor: 'bg-blue-50',     dotColor: 'bg-blue-500',    borderColor: 'border-blue-200' },
  { id: 'remodelable', label: 'Can Remodel/Fix',  textColor: 'text-violet-700',  bgColor: 'bg-violet-50',   dotColor: 'bg-violet-500',  borderColor: 'border-violet-200' },
  { id: 'skip',        label: 'Not Important',    textColor: 'text-stone-500',   bgColor: 'bg-stone-100',   dotColor: 'bg-stone-400',   borderColor: 'border-stone-200' },
]

const PRIORITY_ORDER: PriorityId[] = ['must', 'dealbreak', 'strong', 'nice', 'remodelable', 'skip']

const getPriority = (id: PriorityId): Priority =>
  PRIORITIES.find(p => p.id === id) ?? PRIORITIES[5]

const sortItems = (items: Item[]): Item[] =>
  [...items].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'location', icon: <MapPin size={16} />, title: 'Location & Community',
    items: [
      { id: 'l1',  label: 'Indian Land / Fort Mill / Waxhaw / Tega Cay area',   priority: 'must',   note: '' },
      { id: 'l2',  label: 'Max 35-min commute to Charlotte uptown',              priority: 'strong', note: '' },
      { id: 'l3',  label: 'Low-traffic, residential street',                     priority: 'strong', note: '' },
      { id: 'l4',  label: 'No HOA or reasonable HOA (<$100/mo)',                priority: 'must',   note: '' },
      { id: 'l5',  label: 'Outside flood zone (FEMA Zone X preferred)',          priority: 'must',   note: '' },
      { id: 'l6',  label: 'Close to grocery / essentials (<10 min)',             priority: 'strong', note: '' },
      { id: 'l7',  label: 'Safe, walkable neighborhood feel',                    priority: 'strong', note: '' },
      { id: 'l8',  label: 'Sidewalks / trails / greenways nearby',              priority: 'nice',   note: '' },
      { id: 'l9',  label: 'Not on busy arterial or highway',                    priority: 'must',   note: '' },
      { id: 'l10', label: 'Established neighborhood (not new construction HOA)', priority: 'nice',   note: '' },
    ],
  },
  {
    id: 'schools', icon: <GraduationCap size={16} />, title: 'Schools',
    items: [
      { id: 'sc1', label: 'Zoned for top-rated elementary (Lancaster County)',   priority: 'must',   note: '' },
      { id: 'sc2', label: 'No charter lottery required (in-zone school quality)',priority: 'strong', note: '' },
      { id: 'sc3', label: 'Strong public middle school district',                priority: 'must',   note: '' },
      { id: 'sc4', label: 'Good public high school or nearby private option',    priority: 'strong', note: '' },
      { id: 'sc5', label: 'School within safe biking/walking distance',          priority: 'nice',   note: '' },
    ],
  },
  {
    id: 'lot', icon: <Trees size={16} />, title: 'Lot & Exterior',
    items: [
      { id: 'lo1',  label: 'Lot size ≥ 0.25 acres',                             priority: 'must',        note: '' },
      { id: 'lo2',  label: 'Fenced backyard (or feasible to fence)',             priority: 'must',        note: '' },
      { id: 'lo3',  label: 'Private backyard, not overlooked',                  priority: 'strong',      note: '' },
      { id: 'lo4',  label: 'Flat or gently sloped yard (kid-friendly)',          priority: 'strong',      note: '' },
      { id: 'lo5',  label: 'South / west-facing backyard (afternoon sun)',       priority: 'nice',        note: '' },
      { id: 'lo6',  label: 'Mature trees for shade',                             priority: 'nice',        note: '' },
      { id: 'lo7',  label: 'No major drainage issues or low-lying areas',        priority: 'must',        note: '' },
      { id: 'lo8',  label: 'Space for potential pool addition',                  priority: 'nice',        note: '' },
      { id: 'lo9',  label: 'Attached 2-car garage minimum',                      priority: 'must',        note: '' },
      { id: 'lo10', label: 'Garage with EV charging outlet (or conduit ready)',  priority: 'strong',      note: '' },
      { id: 'lo11', label: 'Covered front porch or welcoming entry',             priority: 'nice',        note: '' },
      { id: 'lo12', label: 'Good curb appeal (or fixable)',                      priority: 'remodelable', note: '' },
    ],
  },
  {
    id: 'structure', icon: <Home size={16} />, title: 'Structure & Age',
    items: [
      { id: 'st1',  label: 'Built after 2000 (preferred after 2005)',            priority: 'strong', note: '' },
      { id: 'st2',  label: 'Roof < 10 years old or seller replaces',             priority: 'must',   note: '' },
      { id: 'st3',  label: 'Foundation: slab or crawl (no known issues)',        priority: 'must',   note: '' },
      { id: 'st4',  label: 'No polybutylene piping',                             priority: 'must',   note: '' },
      { id: 'st5',  label: 'Sq footage ≥ 2,200 sqft',                            priority: 'must',   note: '' },
      { id: 'st6',  label: 'Sq footage ≥ 2,800 sqft (ideal)',                    priority: 'strong', note: '' },
      { id: 'st7',  label: 'Two-story (preferred for separation of space)',       priority: 'strong', note: '' },
      { id: 'st8',  label: 'No major structural red flags in inspection',         priority: 'must',   note: '' },
      { id: 'st9',  label: 'Brick, hardie board, or quality siding (not vinyl)', priority: 'nice',   note: '' },
      { id: 'st10', label: 'No history of flooding or water intrusion',           priority: 'must',   note: '' },
    ],
  },
  {
    id: 'layout', icon: <LayoutDashboard size={16} />, title: 'Floor Plan & Layout',
    items: [
      { id: 'fp1',  label: '4 bedrooms minimum',                                 priority: 'must',   note: '' },
      { id: 'fp2',  label: '5 bedrooms or bonus room (ideal)',                   priority: 'strong', note: '' },
      { id: 'fp3',  label: '2.5 bathrooms minimum',                              priority: 'must',   note: '' },
      { id: 'fp4',  label: 'Primary suite on main floor (or acceptable upstairs)',priority: 'strong', note: '' },
      { id: 'fp5',  label: 'Dedicated home office or flex room',                 priority: 'must',   note: 'Safal WFH needs' },
      { id: 'fp6',  label: 'Open concept kitchen / living area',                 priority: 'strong', note: '' },
      { id: 'fp7',  label: 'Formal dining or dedicated dining space',            priority: 'nice',   note: '' },
      { id: 'fp8',  label: 'Mudroom or drop zone off garage entry',              priority: 'strong', note: '' },
      { id: 'fp9',  label: 'Kids bedrooms clustered together',                   priority: 'strong', note: '' },
      { id: 'fp10', label: 'Laundry on same floor as bedrooms',                  priority: 'strong', note: '' },
      { id: 'fp11', label: 'No awkward floor plan or wasted hallway space',      priority: 'nice',   note: '' },
      { id: 'fp12', label: 'Basement (or crawl space — SC common)',              priority: 'nice',   note: '' },
    ],
  },
  {
    id: 'kitchen', icon: <ChefHat size={16} />, title: 'Kitchen',
    items: [
      { id: 'k1',  label: 'Large island with seating',                           priority: 'strong',      note: '' },
      { id: 'k2',  label: 'Gas range or dual-fuel range',                        priority: 'strong',      note: '' },
      { id: 'k3',  label: 'Stone countertops (quartz/granite — or upgradable)',  priority: 'remodelable', note: '' },
      { id: 'k4',  label: 'Ample cabinet storage',                               priority: 'must',        note: '' },
      { id: 'k5',  label: 'Walk-in pantry',                                      priority: 'strong',      note: '' },
      { id: 'k6',  label: 'Double oven or oven + microwave drawer',              priority: 'nice',        note: '' },
      { id: 'k7',  label: 'Opens to family room (sight line to kids)',           priority: 'must',        note: '' },
      { id: 'k8',  label: 'Stainless or panel-front appliances',                 priority: 'nice',        note: '' },
      { id: 'k9',  label: 'Good natural light',                                  priority: 'strong',      note: '' },
      { id: 'k10', label: 'Under-cabinet lighting (or easily added)',             priority: 'remodelable', note: '' },
    ],
  },
  {
    id: 'primary', icon: <BedDouble size={16} />, title: 'Primary Suite',
    items: [
      { id: 'ps1', label: 'Large enough for king bed + furniture',               priority: 'must',   note: '' },
      { id: 'ps2', label: 'His & hers walk-in closets (or one large)',           priority: 'strong', note: '' },
      { id: 'ps3', label: 'En-suite bath with double vanity',                    priority: 'must',   note: '' },
      { id: 'ps4', label: 'Walk-in shower (separate from tub preferred)',        priority: 'strong', note: '' },
      { id: 'ps5', label: 'Soaking tub',                                         priority: 'nice',   note: '' },
      { id: 'ps6', label: 'Private sitting area or reading nook',                priority: 'nice',   note: '' },
      { id: 'ps7', label: 'Good natural light in bedroom',                       priority: 'strong', note: '' },
    ],
  },
  {
    id: 'systems', icon: <Wrench size={16} />, title: 'Systems & Mechanicals',
    items: [
      { id: 'sy1',  label: 'HVAC < 7 years old (dual zone preferred)',           priority: 'must',   note: '' },
      { id: 'sy2',  label: 'Tankless water heater (or <5 years tank)',           priority: 'strong', note: '' },
      { id: 'sy3',  label: '200-amp electrical panel (or upgradable)',           priority: 'must',   note: '' },
      { id: 'sy4',  label: 'Updated plumbing (no galvanized / polybutylene)',    priority: 'must',   note: '' },
      { id: 'sy5',  label: 'Smart thermostat (or compatible wiring)',            priority: 'nice',   note: '' },
      { id: 'sy6',  label: 'Fiber internet available at address',                priority: 'must',   note: 'Critical for WFH' },
      { id: 'sy7',  label: 'Solar-ready roof orientation / panel install',       priority: 'nice',   note: '' },
      { id: 'sy8',  label: 'Whole-home water filtration (or space for it)',      priority: 'nice',   note: '' },
      { id: 'sy9',  label: 'Generator hookup / transfer switch',                 priority: 'nice',   note: '' },
      { id: 'sy10', label: 'Ring / smart doorbell wiring',                       priority: 'remodelable', note: '' },
    ],
  },
  {
    id: 'interior', icon: <Paintbrush size={16} />, title: 'Interior Finishes',
    items: [
      { id: 'i1',  label: 'Hardwood or LVP throughout main floor',              priority: 'strong',      note: '' },
      { id: 'i2',  label: 'Carpet in bedrooms (or can add rugs)',               priority: 'skip',        note: '' },
      { id: 'i3',  label: '9-ft ceilings minimum on main floor',                priority: 'strong',      note: '' },
      { id: 'i4',  label: 'Crown molding or clean trim detail',                 priority: 'nice',        note: '' },
      { id: 'i5',  label: 'Neutral paint (or we\'ll repaint anyway)',            priority: 'remodelable', note: '' },
      { id: 'i6',  label: 'Plenty of natural light / large windows',            priority: 'must',        note: '' },
      { id: 'i7',  label: 'Updated bathrooms (or fixable)',                     priority: 'remodelable', note: '' },
      { id: 'i8',  label: 'No popcorn ceilings',                                priority: 'dealbreak',   note: '' },
      { id: 'i9',  label: 'Fireplace (gas preferred)',                          priority: 'nice',        note: '' },
      { id: 'i10', label: 'Built-ins or shelving in office/flex room',          priority: 'nice',        note: '' },
    ],
  },
  {
    id: 'kids', icon: <Baby size={16} />, title: 'Kid & Family Life',
    items: [
      { id: 'kd1', label: 'Safe play area / yard for kids 5 & 2',              priority: 'must',   note: '' },
      { id: 'kd2', label: 'Neighbor kids / family-friendly street',             priority: 'strong', note: '' },
      { id: 'kd3', label: 'Playroom, loft, or bonus room for kids',             priority: 'strong', note: '' },
      { id: 'kd4', label: 'Secondary full bath near kids rooms',                priority: 'must',   note: '' },
      { id: 'kd5', label: 'Near parks, trails, or playground',                  priority: 'strong', note: '' },
      { id: 'kd6', label: 'Proximity to pediatrician / urgent care',            priority: 'strong', note: '' },
      { id: 'kd7', label: 'Short drive to indoor kids activities',              priority: 'nice',   note: '' },
    ],
  },
  {
    id: 'financial', icon: <DollarSign size={16} />, title: 'Financial Parameters',
    items: [
      { id: 'fi1', label: 'Purchase price ≤ $550K',                              priority: 'must',   note: '' },
      { id: 'fi2', label: 'Purchase price ≤ $475K (ideal)',                      priority: 'strong', note: '' },
      { id: 'fi3', label: 'HOA ≤ $100/month',                                    priority: 'must',   note: '' },
      { id: 'fi4', label: 'Property taxes ≤ 1% effective rate (SC advantage)',   priority: 'strong', note: '' },
      { id: 'fi5', label: 'Qualifies for Palmetto Heroes program (RN)',           priority: 'strong', note: 'Wife\'s RN license' },
      { id: 'fi6', label: 'No major deferred maintenance at closing',            priority: 'must',   note: '' },
      { id: 'fi7', label: 'Seller concessions negotiable if needed',             priority: 'nice',   note: '' },
      { id: 'fi8', label: 'Below market comps (value play)',                     priority: 'nice',   note: '' },
    ],
  },
  {
    id: 'dealbreakers', icon: <Ban size={16} />, title: 'Hard No\'s',
    items: [
      { id: 'db1', label: 'Back of house directly on busy road/highway',        priority: 'dealbreak', note: '' },
      { id: 'db2', label: 'Less than 3 beds',                                   priority: 'dealbreak', note: '' },
      { id: 'db3', label: 'In flood zone AE or higher',                         priority: 'dealbreak', note: '' },
      { id: 'db4', label: 'HOA > $200/month or overly restrictive covenants',   priority: 'dealbreak', note: '' },
      { id: 'db5', label: 'Known foundation issues or structural damage',       priority: 'dealbreak', note: '' },
      { id: 'db6', label: 'No fiber internet available',                        priority: 'dealbreak', note: 'Remote work non-negotiable' },
      { id: 'db7', label: 'Major mold / environmental issues',                  priority: 'dealbreak', note: '' },
      { id: 'db8', label: 'Within 500ft of power lines',                        priority: 'dealbreak', note: '' },
    ],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority, small = false }: { priority: PriorityId; small?: boolean }) {
  const p = getPriority(priority)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold whitespace-nowrap
      ${small ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}
      ${p.bgColor} ${p.textColor}`}>
      <span className={`rounded-full flex-shrink-0 ${p.dotColor} ${small ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
      {p.label}
    </span>
  )
}

function PriorityPicker({ value, onChange }: { value: PriorityId; onChange: (v: PriorityId) => void }) {
  const [open, setOpen] = useState(false)
  const p = getPriority(value)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold text-xs px-2.5 py-1
          border cursor-pointer whitespace-nowrap transition-opacity hover:opacity-80
          ${p.bgColor} ${p.textColor} ${p.borderColor}`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dotColor}`} />
        {p.label}
        <ChevronDown size={10} className="ml-0.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-[calc(100%+4px)] left-0 z-50 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]"
          >
            {PRIORITIES.map(o => (
              <button
                key={o.id}
                onClick={() => { onChange(o.id); setOpen(false) }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-mono font-semibold text-left transition-colors
                  ${value === o.id ? `${o.bgColor} ${o.textColor}` : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${o.dotColor}`} />
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ItemRow ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: Item
  catId: string
  expandedNotes: Record<string, boolean>
  onToggleNote: (id: string) => void
  onUpdate: (catId: string, itemId: string, field: keyof Item, val: string) => void
  onRemove: (catId: string, itemId: string) => void
}

function ItemRow({ item, catId, expandedNotes, onToggleNote, onUpdate, onRemove }: ItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.label)
  const inputRef = useRef<HTMLInputElement>(null)

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== item.label) {
      onUpdate(catId, item.id, 'label', trimmed)
    } else {
      setDraft(item.label)
    }
    setEditing(false)
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  return (
    <motion.div
      layout
      className="bg-white dark:bg-stone-800 border border-stone-150 dark:border-stone-700 rounded-xl p-3 sm:p-3.5 hover:border-stone-200 dark:hover:border-stone-600 transition-colors"
    >
      {/* Main row: label + actions */}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') { setDraft(item.label); setEditing(false) }
              }}
              className="w-full text-sm font-medium bg-stone-50 dark:bg-stone-900 border border-teal-400 rounded-lg px-2.5 py-1 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          ) : (
            <div className="flex items-start gap-1.5 group/label">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-100 leading-snug flex-1">{item.label}</p>
              <button
                onClick={() => { setDraft(item.label); setEditing(true) }}
                title="Edit label"
                className="sm:opacity-0 sm:group-hover/label:opacity-100 opacity-100 p-1 rounded text-stone-300 dark:text-stone-500 hover:text-teal-500 active:text-teal-600 transition-all flex-shrink-0 mt-0.5"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <AnimatePresence>
            {(expandedNotes[item.id] || item.note) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <textarea
                  value={item.note}
                  onChange={e => onUpdate(catId, item.id, 'note', e.target.value)}
                  placeholder="Add context or note…"
                  rows={2}
                  className="mt-2 w-full text-xs font-mono bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-600 dark:text-stone-300 placeholder-stone-300 dark:placeholder-stone-600 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Action buttons — stacked on mobile, inline on desktop */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 flex-shrink-0">
          <PriorityPicker
            value={item.priority}
            onChange={v => onUpdate(catId, item.id, 'priority', v)}
          />
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onToggleNote(item.id)}
              title="Toggle note"
              className={`p-2 rounded-lg transition-colors ${item.note ? 'text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20' : 'text-stone-300 dark:text-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
            >
              <StickyNote size={15} />
            </button>
            <button
              onClick={() => onRemove(catId, item.id)}
              title="Remove"
              className="p-2 rounded-lg text-stone-300 dark:text-stone-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:text-red-500 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HouseProfile() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES)
  const [activeCat, setActiveCat] = useState('location')
  const [view, setView] = useState<View>('edit')
  const [newItem, setNewItem] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [pdfLoading, setPdfLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [, setProfileLoading] = useState(true)
  const [catChipsExpanded, setCatChipsExpanded] = useState(false)
  const [catChipsOverflow, setCatChipsOverflow] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const catChipsRef = useRef<HTMLDivElement>(null)

  // Detect whether the chip grid overflows 2 rows
  useEffect(() => {
    const el = catChipsRef.current
    if (!el) return
    const check = () => setCatChipsOverflow(el.scrollHeight > el.clientHeight + 2)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Load saved categories from Supabase on mount, merging saved priorities into INITIAL_CATEGORIES
  // so any new items added to INITIAL_CATEGORIES in code are always present.
  useEffect(() => {
    loadProfileItems().then(savedItems => {
      if (savedItems === PROFILE_ITEMS) {
        // No saved data yet — use defaults as-is
        setProfileLoading(false)
        return
      }
      const savedMap = new Map(savedItems.map(i => [i.id, i]))
      setCategories(prev => prev.map(cat => ({
        ...cat,
        items: cat.items.map(item => {
          const saved = savedMap.get(item.id)
          return saved ? { ...item, priority: saved.priority as PriorityId, note: item.note } : item
        }),
      })))
      setProfileLoading(false)
    }).catch(() => setProfileLoading(false))
  }, [])

  // Debounced save — fires 1.5s after the last category change
  function persistCategories(updated: Category[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveProfileCategories(updated).catch(err => console.error('Failed to save profile', err))
    }, 1500)
  }

  const generateSummary = async () => {
    setSummaryLoading(true)
    setSummaryError('')
    try {
      const priorities = {
        must:      categories.flatMap(c => c.items.filter(i => i.priority === 'must').map(i => i.label)),
        dealbreak: categories.flatMap(c => c.items.filter(i => i.priority === 'dealbreak').map(i => i.label)),
        strong:    categories.flatMap(c => c.items.filter(i => i.priority === 'strong').map(i => i.label)),
      }
      const result = await summarizeProfile(priorities)
      setAiSummary(result)
    } catch (err) {
      setSummaryError('Failed to generate summary. Please try again.')
      console.error(err)
    } finally {
      setSummaryLoading(false)
    }
  }

  const updateItem = (catId: string, itemId: string, field: keyof Item, val: string) => {
    setCategories(prev => {
      const updated = prev.map(c => c.id !== catId ? c : {
        ...c,
        items: c.items.map(i => i.id !== itemId ? i : { ...i, [field]: val }),
      })
      persistCategories(updated)
      return updated
    })
  }

  const addItem = (catId: string) => {
    if (!newItem.trim()) return
    const id = `custom_${Date.now()}`
    setCategories(prev => {
      const updated = prev.map(c => c.id !== catId ? c : {
        ...c,
        items: [...c.items, { id, label: newItem.trim(), priority: 'nice' as PriorityId, note: '' }],
      })
      persistCategories(updated)
      return updated
    })
    setNewItem('')
  }

  const removeItem = (catId: string, itemId: string) => {
    setCategories(prev => {
      const updated = prev.map(c => c.id !== catId ? c : {
        ...c,
        items: c.items.filter(i => i.id !== itemId),
      })
      persistCategories(updated)
      return updated
    })
  }

  const activeCatData = categories.find(c => c.id === activeCat)

  // Aggregate counts
  const priorityCounts = Object.fromEntries(PRIORITIES.map(p => [p.id, 0])) as Record<PriorityId, number>
  categories.forEach(c => c.items.forEach(i => { priorityCounts[i.priority] = (priorityCounts[i.priority] || 0) + 1 }))
  const totalItems = Object.values(priorityCounts).reduce((a, b) => a + b, 0)

  const mustItems = categories.flatMap(c => c.items.filter(i => i.priority === 'must').map(i => ({ ...i, cat: c.title })))
  const dealbreakItems = categories.flatMap(c => c.items.filter(i => i.priority === 'dealbreak').map(i => ({ ...i, cat: c.title })))

  const downloadPdf = async () => {
    if (!printRef.current) return
    setPdfLoading(true)
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let posY = 0
      let remaining = imgHeight
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, posY ? -posY : 0, pdfWidth, imgHeight)
        remaining -= pdfHeight
        if (remaining > 0) {
          pdf.addPage()
          posY += pdfHeight
        }
      }
      pdf.save('Magar-Family-Home-Profile.pdf')
    } finally {
      setPdfLoading(false)
    }
  }

  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'edit',    label: 'Edit',       icon: <Edit3 size={14} /> },
    { id: 'summary', label: 'Summary',    icon: <BarChart2 size={14} /> },
    { id: 'print',   label: 'Print View', icon: <Printer size={14} /> },
  ]

  return (
    <div className="h-full flex flex-col bg-stone-50 dark:bg-stone-950">

      {/* Page header */}
      <div className="flex-shrink-0 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-lg sm:text-xl font-semibold text-stone-900 dark:text-stone-100 truncate">Home Criteria</h1>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 font-mono truncate">
              Rana Magar Family · Charlotte Metro · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${view === tab.id
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── EDIT VIEW ───────────────────────────────────────────────────────── */}
      {view === 'edit' && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Mobile: wrapping chip grid */}
          <div className="sm:hidden flex-shrink-0 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800">
            <div
              ref={catChipsRef}
              className="flex flex-wrap gap-1.5 px-3 pt-2.5 overflow-hidden transition-[max-height] duration-300 ease-in-out"
              style={{ maxHeight: catChipsExpanded ? `${catChipsRef.current?.scrollHeight ?? 9999}px` : '72px' }}
            >
              {categories.map(c => {
                const isActive = activeCat === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                      ${isActive
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'}`}
                  >
                    <span>{c.icon}</span>
                    {c.title}
                  </button>
                )
              })}
            </div>
            {/* Expand / collapse row — only shown when chips overflow 2 rows */}
            <div className={`flex justify-center pb-1.5 ${catChipsOverflow ? 'pt-1' : 'pt-2'}`}>
              {catChipsOverflow && (
                <button
                  onClick={() => setCatChipsExpanded(p => !p)}
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-400 dark:text-stone-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors px-3 py-1"
                >
                  <ChevronDown size={12} className={`transition-transform duration-200 ${catChipsExpanded ? 'rotate-180' : ''}`} />
                  {catChipsExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Desktop: Category sidebar */}
            <div className="hidden sm:block w-52 flex-shrink-0 bg-white dark:bg-stone-900 border-r border-stone-100 dark:border-stone-800 overflow-y-auto py-2">
              {categories.map(c => {
                const isActive = activeCat === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all
                      ${isActive
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-semibold border-r-2 border-teal-500'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium'}`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className={isActive ? 'text-teal-600' : 'text-stone-400'}>{c.icon}</span>
                      <span className="truncate">{c.title}</span>
                    </span>
                    <span className="text-[11px] font-mono bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 rounded-full px-1.5 py-0.5 ml-1 flex-shrink-0">
                      {c.items.length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Item editor */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
              {activeCatData && (
                <>
                  <div className="mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-stone-100 dark:border-stone-800">
                    <h2 className="font-serif text-xl sm:text-2xl font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <span className="text-stone-400">{activeCatData.icon}</span>
                      {activeCatData.title}
                    </h2>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                      {activeCatData.items.length} items · tap a badge to change priority
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {sortItems(activeCatData.items).map(item => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        catId={activeCatData.id}
                        expandedNotes={expandedNotes}
                        onToggleNote={id => setExpandedNotes(p => ({ ...p, [id]: !p[id] }))}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                      />
                    ))}
                  </div>

                  {/* Add item */}
                  <div className="flex gap-2 mt-4">
                    <input
                      value={newItem}
                      onChange={e => setNewItem(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addItem(activeCatData.id)}
                      placeholder={`Add item to ${activeCatData.title}…`}
                      className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                    <button
                      onClick={() => addItem(activeCatData.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SUMMARY VIEW ────────────────────────────────────────────────────── */}
      {view === 'summary' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <h2 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-1">Profile Summary</h2>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-6">Overview of all priorities at a glance.</p>

            {/* AI Summary card */}
            <div className="bg-white dark:bg-stone-800 border border-stone-150 dark:border-stone-700 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-teal-500" />
                  AI Summary
                </h3>
                {aiSummary && (
                  <button
                    onClick={generateSummary}
                    disabled={summaryLoading}
                    className="flex items-center gap-1 text-xs text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={11} className={summaryLoading ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                )}
              </div>
              {aiSummary ? (
                <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">{aiSummary}</p>
              ) : summaryError ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-red-500 dark:text-red-400">{summaryError}</p>
                  <button
                    onClick={generateSummary}
                    disabled={summaryLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
                  >
                    <RefreshCw size={11} />
                    Retry
                  </button>
                </div>
              ) : (
                <button
                  onClick={generateSummary}
                  disabled={summaryLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {summaryLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {summaryLoading ? 'Generating…' : 'Generate Summary'}
                </button>
              )}
            </div>

            {/* Score card — priority distribution bar */}
            <div className="bg-white dark:bg-stone-800 border border-stone-150 dark:border-stone-700 rounded-2xl p-5 mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-4">Priority Distribution</h3>
              <div className="flex rounded-full overflow-hidden h-3 mb-4 gap-px">
                {PRIORITIES.map(p => {
                  const count = priorityCounts[p.id]
                  if (!count) return null
                  const pct = (count / totalItems) * 100
                  return (
                    <div
                      key={p.id}
                      title={`${p.label}: ${count}`}
                      className={`${p.dotColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  )
                })}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {PRIORITIES.map(p => (
                  <div key={p.id} className={`rounded-xl px-3 py-2.5 ${p.bgColor}`}>
                    <div className={`text-2xl font-mono font-bold ${p.textColor}`}>{priorityCounts[p.id]}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${p.textColor}`}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Must Haves */}
            <div className="mb-6">
              <h3 className="font-serif text-lg font-semibold text-emerald-700 dark:text-emerald-500 mb-3">
                Must Have ({mustItems.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {mustItems.map(i => (
                  <div key={i.id} className="bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500 rounded-lg px-3.5 py-2.5">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{i.label}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{i.cat}</p>
                    {i.note && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 italic">{i.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Deal Breakers */}
            <div className="mb-6">
              <h3 className="font-serif text-lg font-semibold text-red-700 dark:text-red-400 mb-3">
                Deal Breakers ({dealbreakItems.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {dealbreakItems.map(i => (
                  <div key={i.id} className="bg-red-50 dark:bg-red-900/20 border-l-2 border-red-500 rounded-lg px-3.5 py-2.5">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{i.label}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{i.cat}</p>
                    {i.note && <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">{i.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* All by category */}
            {categories.map(c => (
              <div key={c.id} className="mb-6">
                <h3 className="font-serif text-base font-semibold text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-2">
                  <span className="text-stone-400">{c.icon}</span>
                  {c.title}
                </h3>
                <div className="divide-y divide-stone-100 dark:divide-stone-700 border border-stone-100 dark:border-stone-700 rounded-xl overflow-hidden">
                  {sortItems(c.items).map(i => (
                    <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-stone-800">
                      <span className="text-sm text-stone-700 dark:text-stone-200 flex-1">
                        {i.label}
                        {i.note && <span className="text-stone-400 dark:text-stone-500 italic"> — {i.note}</span>}
                      </span>
                      <PriorityBadge priority={i.priority} small />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRINT VIEW ──────────────────────────────────────────────────────── */}
      {view === 'print' && (
        <div className="flex-1 overflow-y-auto bg-stone-100 dark:bg-stone-900 px-6 py-6">
          {/* Toolbar (not printed) */}
          <div className="max-w-3xl mx-auto mb-4 flex justify-end gap-2">
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-sm font-semibold rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors shadow-sm"
            >
              <Printer size={14} />
              Print
            </button>
          </div>

          {/* Printable document */}
          <div
            ref={printRef}
            className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-10"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
          >
            {/* Document header */}
            <div className="flex justify-between items-start border-b-2 border-stone-900 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-stone-900">Home Search Profile</h1>
                <p className="text-sm text-stone-500 mt-1">Magar Family · Charlotte Metro (Indian Land / Fort Mill / Waxhaw / Tega Cay)</p>
                <p className="text-xs text-stone-400 font-mono mt-1">
                  Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right text-sm text-stone-600 space-y-0.5">
                <div>Target: <strong>$475K–$550K</strong></div>
                <div>Min sqft: <strong>2,200+</strong></div>
                <div>Beds: <strong>4+</strong> · Baths: <strong>2.5+</strong></div>
              </div>
            </div>

            {/* AI Summary (print) */}
            {aiSummary && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">Summary</p>
                <p className="text-sm text-stone-700 leading-relaxed">{aiSummary}</p>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {PRIORITIES.map(p => (
                <span key={p.id} className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${p.bgColor} ${p.textColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dotColor}`} />
                  {p.label}
                </span>
              ))}
            </div>

            {/* Categories */}
            {categories.map(c => (
              <div key={c.id} className="mb-5">
                <div className="bg-stone-100 rounded-lg px-3 py-1.5 mb-2 text-sm font-bold text-stone-800 flex items-center gap-1.5">
                  <span className="text-stone-500">{c.icon}</span>
                  {c.title}
                </div>
                <table className="w-full border-collapse">
                  <tbody>
                    {sortItems(c.items).map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                        <td className="text-[12.5px] text-stone-800 px-2.5 py-1.5 w-3/4">
                          {item.label}
                          {item.note && <span className="text-stone-400 italic"> — {item.note}</span>}
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <PriorityBadge priority={item.priority} small />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div className="border-t border-stone-200 mt-8 pt-3 text-center text-[11px] text-stone-400 font-mono">
              Magar Family Home Search · Charlotte Metro
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
