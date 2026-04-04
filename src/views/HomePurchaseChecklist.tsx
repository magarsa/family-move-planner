import { useState, useCallback } from 'react'
import { Check, StickyNote, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ScrollToTopButton from '../components/ScrollToTopButton'

const STORAGE_KEY = 'fmp_home_checklist'

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemState = {
  checked: boolean
  note: string
}

type ChecklistData = Record<string, ItemState>

type ChecklistItem = {
  id: string
  text: string
}

type Phase = {
  id: string
  number: number
  label: string
  timeframe: string
  color: string
  bg: string
  dot: string
  border: string
  numberBg: string
  items: ChecklistItem[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: 'phase1',
    number: 1,
    label: 'Now',
    timeframe: '6–12 months out',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-700',
    numberBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    items: [
      { id: 'p1_1', text: 'Pull all three credit reports; optimize scores, pay revolving balances under 10% utilization' },
      { id: 'p1_2', text: 'Get pre-approved with 2–3 lenders (one must be SC Housing Palmetto Heroes lender if buying SC side)' },
      { id: 'p1_3', text: 'Verify Palmetto Heroes eligibility with RN license (spouse)' },
      { id: 'p1_4', text: 'Confirm with lender: will they accept a family lease for rental income offset? Get in writing' },
      { id: 'p1_5', text: 'Draft a formal lease agreement for Des Moines property at market rate' },
      { id: 'p1_6', text: 'Talk to a CPA about rental depreciation strategy before filing taxes' },
    ],
  },
  {
    id: 'phase2',
    number: 2,
    label: 'During Home Search',
    timeframe: 'Active search period',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    dot: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-700',
    numberBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    items: [
      { id: 'p2_1', text: 'Target homes $570K–620K listed, negotiate to $545–585K + seller-paid 2-1 buydown' },
      { id: 'p2_2', text: 'Ask every lender about recast availability on their conventional loans' },
      { id: 'p2_3', text: 'Get float-down rate lock option' },
      { id: 'p2_4', text: 'Consider 80-10-10 piggyback loan to avoid PMI without selling Des Moines' },
      { id: 'p2_5', text: 'Negotiate seller concessions toward closing costs or rate buydown' },
    ],
  },
  {
    id: 'phase3',
    number: 3,
    label: 'At Closing',
    timeframe: 'Within 90 days of closing',
    color: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    dot: 'bg-teal-500',
    border: 'border-teal-200 dark:border-teal-700',
    numberBg: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    items: [
      { id: 'p3_1', text: 'Apply for SC or NC homestead exemption within 90 days of closing' },
      { id: 'p3_2', text: 'Set calendar reminder: property tax appeal window opens after first assessment notice' },
      { id: 'p3_3', text: 'Confirm loan is conventional Fannie/Freddie (required for future recast)' },
    ],
  },
  {
    id: 'phase4',
    number: 4,
    label: 'Year 1–2',
    timeframe: 'First two years',
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    dot: 'bg-violet-500',
    border: 'border-violet-200 dark:border-violet-700',
    numberBg: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    items: [
      { id: 'p4_1', text: 'Redirect 2-1 buydown savings to principal paydown each month' },
      { id: 'p4_2', text: 'Track Des Moines rental income and expenses in a separate account for tax clarity' },
      { id: 'p4_3', text: 'Evaluate refinance opportunity if rates drop 0.75% or more' },
      { id: 'p4_4', text: 'Request PMI cancellation appraisal once 20% equity threshold is near' },
    ],
  },
  {
    id: 'phase5',
    number: 5,
    label: 'Year 3–5',
    timeframe: 'Long-term horizon',
    color: 'text-stone-700 dark:text-stone-300',
    bg: 'bg-stone-100 dark:bg-stone-700/30',
    dot: 'bg-stone-500',
    border: 'border-stone-200 dark:border-stone-600',
    numberBg: 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300',
    items: [
      { id: 'p5_1', text: 'Reassess Des Moines: sell and recast Charlotte mortgage, or continue holding?' },
      { id: 'p5_2', text: 'If PMI still active, order new appraisal and request early cancellation' },
      { id: 'p5_3', text: 'Review depreciation recapture implications if selling Des Moines (CPA conversation)' },
      { id: 'p5_4', text: 'Evaluate Charlotte home equity for HELOC or recast opportunity' },
    ],
  },
]

const TOTAL_ITEMS = PHASES.reduce((acc, p) => acc + p.items.length, 0)

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadData(): ChecklistData {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function getItemState(data: ChecklistData, id: string): ItemState {
  return data[id] ?? { checked: false, note: '' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CheckItemProps {
  item: ChecklistItem
  state: ItemState
  noteOpen: boolean
  dotClass: string
  onToggle: () => void
  onNoteToggle: () => void
  onNoteChange: (val: string) => void
}

function CheckItem({ item, state, noteOpen, dotClass, onToggle, onNoteToggle, onNoteChange }: CheckItemProps) {
  return (
    <div>
      <div className="flex items-start gap-3 px-5 py-3.5 group hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            state.checked
              ? `${dotClass} border-transparent`
              : 'border-stone-300 dark:border-stone-600 hover:border-teal-500'
          }`}
        >
          {state.checked && <Check size={11} className="text-white" strokeWidth={3} />}
        </button>

        {/* Text */}
        <span
          className={`flex-1 text-sm leading-relaxed ${
            state.checked
              ? 'line-through text-stone-400 dark:text-stone-500'
              : 'text-stone-800 dark:text-stone-200'
          }`}
        >
          {item.text}
        </span>

        {/* Note toggle */}
        <button
          onClick={onNoteToggle}
          title={noteOpen ? 'Hide note' : 'Add / view note'}
          className={`flex-shrink-0 p-1 rounded-lg transition-all ${
            state.note
              ? 'text-teal-600 dark:text-teal-400 opacity-100'
              : 'opacity-0 group-hover:opacity-100 text-stone-400 hover:text-teal-500 dark:hover:text-teal-400'
          }`}
        >
          <StickyNote size={14} />
        </button>
      </div>

      {/* Expandable note */}
      <AnimatePresence initial={false}>
        {noteOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-13 pr-5 pb-3 ml-8">
              <textarea
                autoFocus={!state.note}
                value={state.note}
                onChange={e => onNoteChange(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                className="textarea-field text-xs"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function HomePurchaseChecklist() {
  const [data, setData] = useState<ChecklistData>(loadData)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())

  // Persist and update state
  const update = useCallback((id: string, patch: Partial<ItemState>) => {
    setData(prev => {
      const next = {
        ...prev,
        [id]: { ...getItemState(prev, id), ...patch },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  function toggleCheck(id: string) {
    update(id, { checked: !getItemState(data, id).checked })
  }

  function toggleNote(id: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setNote(id: string, val: string) {
    update(id, { note: val })
  }

  function togglePhase(id: string) {
    setCollapsedPhases(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Progress calculations
  const totalChecked = PHASES.reduce(
    (acc, phase) => acc + phase.items.filter(item => getItemState(data, item.id).checked).length,
    0
  )
  const overallPct = Math.round((totalChecked / TOTAL_ITEMS) * 100)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
            Home Purchase Checklist
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">
            Lender search &amp; home buying — end-to-end action plan
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {totalChecked} / {TOTAL_ITEMS} complete
          </span>
          <span
            className={`status-badge ${
              overallPct === 100
                ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                : overallPct >= 50
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400'
            }`}
          >
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="card px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Overall Progress
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {totalChecked} of {TOTAL_ITEMS} items
          </span>
        </div>
        <div className="h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {/* Per-phase mini indicators */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {PHASES.map(phase => {
            const done = phase.items.filter(item => getItemState(data, item.id).checked).length
            const pct = Math.round((done / phase.items.length) * 100)
            return (
              <div key={phase.id} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${phase.dot}`} />
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  Ph.{phase.number} {done}/{phase.items.length}
                  {pct === 100 && (
                    <span className="ml-1 text-teal-500">✓</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Phase cards */}
      <div className="space-y-4">
        {PHASES.map(phase => {
          const checkedCount = phase.items.filter(item => getItemState(data, item.id).checked).length
          const isCollapsed = collapsedPhases.has(phase.id)
          const allDone = checkedCount === phase.items.length

          return (
            <div key={phase.id} className="card overflow-hidden">
              {/* Phase header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className={`w-full flex items-center justify-between px-5 py-3.5 ${phase.bg} transition-colors hover:brightness-95 dark:hover:brightness-110`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${phase.numberBg}`}>
                    Phase {phase.number}
                  </span>
                  <div className="text-left">
                    <span className={`font-semibold text-sm ${phase.color}`}>{phase.label}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 ml-2">{phase.timeframe}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Progress pill */}
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      allDone
                        ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                        : `${phase.bg} ${phase.color}`
                    }`}
                  >
                    {checkedCount}/{phase.items.length}
                  </span>
                  <motion.span
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center ${phase.color}`}
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </div>
              </button>

              {/* Phase mini progress bar */}
              {!isCollapsed && (
                <div className={`h-0.5 ${phase.bg}`}>
                  <div
                    className={`h-full ${phase.dot} transition-all duration-500`}
                    style={{ width: `${(checkedCount / phase.items.length) * 100}%` }}
                  />
                </div>
              )}

              {/* Items */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-stone-50 dark:divide-stone-700/50">
                      {phase.items.map(item => {
                        const state = getItemState(data, item.id)
                        return (
                          <CheckItem
                            key={item.id}
                            item={item}
                            state={state}
                            noteOpen={expandedNotes.has(item.id)}
                            dotClass={phase.dot}
                            onToggle={() => toggleCheck(item.id)}
                            onNoteToggle={() => toggleNote(item.id)}
                            onNoteChange={val => setNote(item.id, val)}
                          />
                        )
                      })}
                    </div>

                    {/* All done banner */}
                    <AnimatePresence>
                      {allDone && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`px-5 py-3 flex items-center gap-2 ${phase.bg} border-t ${phase.border}`}
                        >
                          <span className={`text-sm font-medium ${phase.color}`}>
                            Phase {phase.number} complete
                          </span>
                          <Check size={14} className={phase.color} strokeWidth={2.5} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <ScrollToTopButton />
    </div>
  )
}
