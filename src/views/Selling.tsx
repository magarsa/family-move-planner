import { useEffect, useState } from 'react'
import { Loader2, Check, ExternalLink, Plus, ChevronRight } from 'lucide-react'
import ScrollToTopButton from '../components/ScrollToTopButton'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import { useUser } from '../hooks/useUser'

type ProfileRow        = Tables<'profile'>
type TodoRow           = Tables<'todos'>
type ContactRow        = Tables<'contacts'>
type ImprovementRow    = Tables<'property_improvements'>
type ReadinessRow      = Tables<'property_readiness_scores'>
type ScenarioRow       = Tables<'sale_scenarios'>
type ScenarioItemRow   = Tables<'sale_scenario_items'>
type PhaseRow          = Tables<'sale_timeline_phases'>
type TimelineTaskRow   = Tables<'sale_timeline_tasks'>
type ScenarioWithItems = ScenarioRow & { sale_scenario_items: ScenarioItemRow[] }
type PhaseWithTasks    = PhaseRow    & { sale_timeline_tasks: TimelineTaskRow[] }

type SaleStatus = 'Pre-Market' | 'Listed' | 'Showings Active' | 'Offer Received' | 'Under Contract' | 'Closed'

const SALE_STAGES: SaleStatus[] = [
  'Pre-Market', 'Listed', 'Showings Active', 'Offer Received', 'Under Contract', 'Closed',
]

const STAGE_STYLES: Record<SaleStatus, { active: string; dot: string }> = {
  'Pre-Market':      { active: 'bg-stone-600 dark:bg-stone-500 text-white',   dot: 'bg-stone-400' },
  'Listed':          { active: 'bg-blue-600 dark:bg-blue-500 text-white',     dot: 'bg-blue-400' },
  'Showings Active': { active: 'bg-amber-500 dark:bg-amber-400 text-white',   dot: 'bg-amber-400' },
  'Offer Received':  { active: 'bg-orange-500 dark:bg-orange-400 text-white', dot: 'bg-orange-400' },
  'Under Contract':  { active: 'bg-purple-600 dark:bg-purple-500 text-white', dot: 'bg-purple-400' },
  'Closed':          { active: 'bg-teal-600 dark:bg-teal-500 text-white',     dot: 'bg-teal-400' },
}

const CONTACT_STATUS_STYLES: Record<string, string> = {
  Prospect: 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
  Active:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  Hired:    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  Passed:   'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}

const SELL_TIER_META: Record<string, { emoji: string; label: string; desc: string }> = {
  'sell_Do First':      { emoji: '🔴', label: 'Must Fix',         desc: 'Before Listing' },
  'sell_Do Soon':       { emoji: '🟡', label: 'Pre-Listing Prep', desc: 'Staging & Photography' },
  'sell_Do When Ready': { emoji: '🟢', label: 'Curb Appeal',      desc: 'Finishing Touches' },
  'sell_Later':         { emoji: '🔵', label: 'Post-Closing',     desc: 'After Sale' },
}
const SELL_TIER_ORDER = ['sell_Do First', 'sell_Do Soon', 'sell_Do When Ready', 'sell_Later']

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function Selling() {
  const { userName } = useUser()
  const [profile, setProfile]           = useState<ProfileRow[]>([])
  const [todos, setTodos]               = useState<TodoRow[]>([])
  const [contacts, setContacts]         = useState<ContactRow[]>([])
  const [improvements, setImprovements] = useState<ImprovementRow[]>([])
  const [readiness, setReadiness]       = useState<ReadinessRow[]>([])
  const [scenarios, setScenarios]       = useState<ScenarioWithItems[]>([])
  const [phases, setPhases]             = useState<PhaseWithTasks[]>([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: t }, { data: c }] = await Promise.all([
        supabase.from('profile').select('*'),
        supabase.from('todos').select('*').like('tier', 'sell_%').is('parent_id', null).order('sort_order', { ascending: true }),
        supabase.from('contacts').select('*').eq('role', 'Listing Agent'),
      ])
      setProfile(p || [])
      setTodos(t || [])
      setContacts(c || [])

      const propId = (p || []).find(r => r.key === 'sell_property_id')?.value
      if (propId) {
        const [{ data: impr }, { data: scores }, { data: scen }, { data: ph }] = await Promise.all([
          supabase.from('property_improvements').select('*').eq('property_id', propId).order('sort_order', { ascending: true }),
          supabase.from('property_readiness_scores').select('*').eq('property_id', propId),
          supabase.from('sale_scenarios').select('*, sale_scenario_items(*)').eq('property_id', propId).order('sort_order', { ascending: true }),
          supabase.from('sale_timeline_phases').select('*, sale_timeline_tasks(*)').eq('property_id', propId).order('sort_order', { ascending: true }),
        ])
        setImprovements(impr || [])
        setReadiness(scores || [])
        setScenarios((scen as ScenarioWithItems[]) || [])
        setPhases((ph as PhaseWithTasks[]) || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  function getVal(key: string) {
    return profile.find(r => r.key === key)?.value || ''
  }

  async function setSaleStatus(status: SaleStatus) {
    const patch = { key: 'sell_status', value: status, updated_by: userName, updated_at: new Date().toISOString() }
    setProfile(prev => {
      const exists = prev.find(r => r.key === 'sell_status')
      if (exists) return prev.map(r => r.key === 'sell_status' ? { ...r, ...patch } : r)
      return [...prev, patch as ProfileRow]
    })
    await supabase.from('profile').upsert(patch, { onConflict: 'key' })
  }

  async function toggleTodo(todo: TodoRow) {
    const updated = {
      completed: !todo.completed,
      completed_at: !todo.completed ? new Date().toISOString() : null,
      completed_by: !todo.completed ? userName : null,
    }
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, ...updated } : t))
    await supabase.from('todos').update(updated).eq('id', todo.id)
  }

  async function toggleTimelineTask(task: TimelineTaskRow) {
    const updated = {
      completed: !task.completed,
      completed_at: !task.completed ? new Date().toISOString() : null,
      completed_by: !task.completed ? userName : null,
    }
    setPhases(prev => prev.map(ph => ({
      ...ph,
      sale_timeline_tasks: ph.sale_timeline_tasks.map(t => t.id === task.id ? { ...t, ...updated } : t),
    })))
    await supabase.from('sale_timeline_tasks').update(updated).eq('id', task.id)
  }

  const saleStatus = (getVal('sell_status') || 'Pre-Market') as SaleStatus
  const sellAddress = getVal('sell_address')
  const stageIndex = SALE_STAGES.indexOf(saleStatus)

  const askingPrice    = parseFloat(getVal('sell_asking_price').replace(/[^0-9.]/g, '')) || 0
  const mortgagePayoff = parseFloat(getVal('sell_mortgage_payoff').replace(/[^0-9.]/g, '')) || 0
  const commissionPct  = parseFloat(getVal('sell_agent_commission_pct').replace(/[^0-9.]/g, '')) || 0
  const commission     = askingPrice * commissionPct / 100
  const closingCosts   = askingPrice * 0.01
  const netProceeds    = askingPrice - mortgagePayoff - commission - closingCosts
  const hasSellData    = askingPrice > 0

  const pendingCount = todos.filter(t => !t.completed).length
  const doneCount    = todos.filter(t => t.completed).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">Selling My Home</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">
          {sellAddress
            ? sellAddress
            : <span>Set your home address in <Link to="/profile" className="text-teal-600 hover:underline">Our Profile</Link> → Selling Your Home.</span>
          }
        </p>
      </div>

      {/* Sale Pipeline */}
      <div className="card p-5">
        <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">Sale Pipeline</div>

        {/* Progress bar */}
        <div className="relative mb-5">
          <div className="h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 dark:bg-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${((stageIndex + 1) / SALE_STAGES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Stage buttons */}
        <div className="flex flex-wrap gap-2">
          {SALE_STAGES.map((stage, i) => {
            const isPast    = i < stageIndex
            const isCurrent = i === stageIndex
            const styles    = STAGE_STYLES[stage]
            return (
              <button
                key={stage}
                onClick={() => setSaleStatus(stage)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isCurrent
                    ? styles.active + ' shadow-sm ring-2 ring-offset-1 ring-teal-400'
                    : isPast
                      ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {isPast && <Check size={11} strokeWidth={3} />}
                {isCurrent && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
                {stage}
              </button>
            )
          })}
        </div>
      </div>

      {/* Net Proceeds */}
      {hasSellData ? (
        <div className="card p-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">Net Proceeds Estimate</div>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600 dark:text-stone-400">List Price</span>
              <span className="font-medium text-stone-800 dark:text-stone-200">{fmt(askingPrice)}</span>
            </div>
            {mortgagePayoff > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-400">− Mortgage Payoff</span>
                <span className="font-medium text-red-600 dark:text-red-400">({fmt(mortgagePayoff)})</span>
              </div>
            )}
            {commissionPct > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-400">− Agent Commission ({commissionPct}%)</span>
                <span className="font-medium text-red-600 dark:text-red-400">({fmt(commission)})</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-stone-600 dark:text-stone-400">− Closing Costs (~1%)</span>
              <span className="font-medium text-red-600 dark:text-red-400">({fmt(closingCosts)})</span>
            </div>
            <div className="border-t border-stone-100 dark:border-stone-700 pt-2.5 flex justify-between items-center">
              <span className="font-semibold text-stone-800 dark:text-stone-200">Estimated Net Proceeds</span>
              <span className={`font-bold text-xl ${netProceeds >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}`}>
                {netProceeds >= 0 ? fmt(netProceeds) : `(${fmt(Math.abs(netProceeds))})`}
              </span>
            </div>
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">
            Cash available toward your new home purchase. Closing costs estimated at 1%; actual costs vary.{' '}
            <Link to="/profile" className="text-teal-600 hover:underline">Edit in Profile</Link>
          </p>
        </div>
      ) : (
        <div className="card p-5 border-dashed">
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center">
            Enter your list price in{' '}
            <Link to="/profile" className="text-teal-600 hover:underline">Our Profile</Link>{' '}
            to see your estimated net proceeds.
          </p>
        </div>
      )}

      {/* Listing Agents */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Listing Agents</div>
          <Link
            to="/contacts"
            className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium"
          >
            <Plus size={12} /> Add Agent
          </Link>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500 italic py-1">
            No listing agents yet.{' '}
            <Link to="/contacts" className="text-teal-600 hover:underline not-italic">
              Add a contact
            </Link>{' '}
            with role "Listing Agent".
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0 text-base">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-800 dark:text-stone-200">{c.name}</div>
                  {c.company && <div className="text-xs text-stone-400 dark:text-stone-500">{c.company}</div>}
                  {c.phone && <div className="text-xs text-stone-400 dark:text-stone-500">{c.phone}</div>}
                </div>
                <span className={`status-badge text-xs ${CONTACT_STATUS_STYLES[c.status ?? 'Prospect'] ?? 'bg-stone-100 text-stone-600'}`}>
                  {c.status ?? 'Prospect'}
                </span>
                <Link
                  to="/contacts"
                  className="p-1.5 text-stone-300 hover:text-teal-500 transition-colors"
                  title="View in Contacts"
                >
                  <ExternalLink size={13} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pre-Listing Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Pre-Listing Tasks</div>
          <div className="flex items-center gap-3">
            {todos.length > 0 && (
              <span className="text-xs text-stone-400 dark:text-stone-500">{doneCount} of {pendingCount + doneCount} done</span>
            )}
            <Link
              to="/todos"
              className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium"
            >
              Manage tasks <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {todos.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-stone-400 dark:text-stone-500 text-sm">
              No pre-listing tasks yet.{' '}
              <Link to="/todos" className="text-teal-600 hover:underline">
                Switch to Selling mode in To-Do List
              </Link>{' '}
              to add tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {SELL_TIER_ORDER.map(tierId => {
              const meta = SELL_TIER_META[tierId]
              const tierTodos = todos.filter(t => t.tier === tierId)
              if (tierTodos.length === 0) return null
              const pending = tierTodos.filter(t => !t.completed)
              const done    = tierTodos.filter(t => t.completed)
              return (
                <div key={tierId} className="card overflow-hidden">
                  <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-700/50 flex items-center gap-2">
                    <span className="text-base leading-none">{meta.emoji}</span>
                    <span className="font-semibold text-sm text-stone-700 dark:text-stone-300">{meta.label}</span>
                    <span className="text-xs text-stone-400 dark:text-stone-500">{meta.desc}</span>
                    <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">{pending.length} pending</span>
                  </div>
                  <div className="divide-y divide-stone-50 dark:divide-stone-700/30">
                    {pending.map(todo => (
                      <div key={todo.id} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-700/20 transition-colors">
                        <button
                          onClick={() => toggleTodo(todo)}
                          className="mt-0.5 w-4 h-4 rounded border-2 border-stone-300 dark:border-stone-600 flex-shrink-0 hover:border-teal-500 transition-colors"
                        />
                        <span className="text-sm text-stone-700 dark:text-stone-300 flex-1">{todo.text}</span>
                      </div>
                    ))}
                    {done.map(todo => (
                      <div key={todo.id} className="flex items-start gap-3 px-4 py-3 opacity-60">
                        <button
                          onClick={() => toggleTodo(todo)}
                          className="mt-0.5 w-4 h-4 rounded bg-teal-500 flex items-center justify-center flex-shrink-0"
                        >
                          <Check size={9} className="text-white" strokeWidth={3} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-stone-400 dark:text-stone-500 line-through">{todo.text}</span>
                          {todo.completed_by && (
                            <span className="ml-2 text-xs text-stone-300 dark:text-stone-600">
                              by {todo.completed_by}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Home Readiness */}
      {(readiness.length > 0 || improvements.length > 0) && (
        <div className="card p-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">Home Readiness</div>

          {readiness.length > 0 && (
            <div className="space-y-3 mb-5">
              {readiness.map(score => (
                <div key={score.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-600 dark:text-stone-400">{score.category}</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {score.score}%
                      {score.note && <span className="text-xs text-stone-400 dark:text-stone-500 ml-1.5">· {score.note}</span>}
                    </span>
                  </div>
                  <div className="h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${score.score >= 80 ? 'bg-teal-500 dark:bg-teal-400' : score.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${score.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {improvements.length > 0 && (
            <div className="space-y-2">
              {improvements.map(imp => (
                <div key={imp.id} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                  {imp.icon && <span className="text-xl leading-none flex-shrink-0">{imp.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-800 dark:text-stone-200">{imp.name}</div>
                    {imp.description && <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{imp.description}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {imp.value_add_low != null && imp.value_add_high != null ? (
                      <div className="text-xs font-medium text-teal-600 dark:text-teal-400">+{fmt(imp.value_add_low)}–{fmt(imp.value_add_high)}</div>
                    ) : imp.value_note ? (
                      <div className="text-xs text-stone-500 dark:text-stone-400">{imp.value_note}</div>
                    ) : null}
                    <div className={`text-xs font-medium mt-0.5 ${
                      imp.status === 'Done'         ? 'text-teal-600 dark:text-teal-400' :
                      imp.status === 'Needs Action' ? 'text-amber-500 dark:text-amber-400' :
                                                      'text-stone-400 dark:text-stone-500'
                    }`}>{imp.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selling Scenarios */}
      {scenarios.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">Selling Scenarios</div>
          <div className="space-y-3">
            {scenarios.map(scenario => (
              <div key={scenario.id} className={`card p-5 ${scenario.is_recommended ? 'ring-2 ring-teal-500 dark:ring-teal-400' : ''}`}>
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-800 dark:text-stone-200 text-sm">{scenario.title}</div>
                    {scenario.description && <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{scenario.description}</div>}
                  </div>
                  {scenario.is_recommended && (
                    <span className="text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 px-2 py-0.5 rounded-full flex-shrink-0">
                      Recommended
                    </span>
                  )}
                </div>

                {scenario.sale_scenario_items.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {[...scenario.sale_scenario_items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(item => (
                      <div key={item.id} className={`flex justify-between text-xs gap-2 ${
                        item.is_total
                          ? 'pt-2 border-t border-stone-100 dark:border-stone-700 font-semibold text-stone-700 dark:text-stone-300'
                          : 'text-stone-500 dark:text-stone-400'
                      }`}>
                        <span>{item.label}</span>
                        <span className="flex-shrink-0">
                          {item.cost_fixed != null
                            ? fmt(item.cost_fixed)
                            : item.cost_low != null && item.cost_high != null
                              ? `${fmt(item.cost_low)}–${fmt(item.cost_high)}`
                              : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {scenario.net_proceeds_low != null && scenario.net_proceeds_high != null && (
                  <div className="flex justify-between text-sm pt-2 border-t border-stone-100 dark:border-stone-700">
                    <span className="text-stone-600 dark:text-stone-400">Est. Net Proceeds</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {fmt(scenario.net_proceeds_low)}–{fmt(scenario.net_proceeds_high)}
                    </span>
                  </div>
                )}

                {scenario.warning_note && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                    {scenario.warning_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sale Timeline */}
      {phases.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">Sale Timeline</div>
          <div className="space-y-3">
            {phases.map(phase => {
              const pending = phase.sale_timeline_tasks.filter(t => !t.completed).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              const done    = phase.sale_timeline_tasks.filter(t =>  t.completed).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              return (
                <div key={phase.id} className="card overflow-hidden">
                  <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-700/50 flex items-center gap-2">
                    <span className="font-semibold text-sm text-stone-700 dark:text-stone-300 flex-1">{phase.title}</span>
                    <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">{phase.week_label}</span>
                    {phase.date_range && (
                      <span className="text-xs text-stone-400 dark:text-stone-500 flex-shrink-0">· {phase.date_range}</span>
                    )}
                  </div>
                  {phase.sale_timeline_tasks.length > 0 && (
                    <div className="divide-y divide-stone-50 dark:divide-stone-700/30">
                      {pending.map(task => (
                        <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-700/20 transition-colors">
                          <button
                            onClick={() => toggleTimelineTask(task)}
                            className="mt-0.5 w-4 h-4 rounded border-2 border-stone-300 dark:border-stone-600 flex-shrink-0 hover:border-teal-500 transition-colors"
                          />
                          <span className="text-sm text-stone-700 dark:text-stone-300 flex-1">{task.task_text}</span>
                        </div>
                      ))}
                      {done.map(task => (
                        <div key={task.id} className="flex items-start gap-3 px-4 py-3 opacity-60">
                          <button
                            onClick={() => toggleTimelineTask(task)}
                            className="mt-0.5 w-4 h-4 rounded bg-teal-500 flex items-center justify-center flex-shrink-0"
                          >
                            <Check size={9} className="text-white" strokeWidth={3} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-stone-400 dark:text-stone-500 line-through">{task.task_text}</span>
                            {task.completed_by && (
                              <span className="ml-2 text-xs text-stone-300 dark:text-stone-600">by {task.completed_by}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <ScrollToTopButton />
    </div>
  )
}
