import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, GitBranch, HelpCircle, BookOpen, AlertTriangle, ArrowRight, Zap, Home, GraduationCap, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
type TodoRow = Tables<'todos'>
type BranchRow = Tables<'branches'>
type WhatIfRow = Tables<'whatifs'>
type PropertyRow = Tables<'properties'>
type SchoolRow = Tables<'schools'>

import { useUser } from '../hooks/useUser'
import ProgressRing from '../components/ProgressRing'

const PHASES = [
  { tier: 'Do First' as const, label: 'This Month', color: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-950/30', textColor: 'text-red-600 dark:text-red-400' },
  { tier: 'Do Soon' as const, label: 'Month 1–2', color: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-950/30', textColor: 'text-amber-600 dark:text-amber-400' },
  { tier: 'Do When Ready' as const, label: 'Month 2–4', color: 'bg-green-500', lightBg: 'bg-green-50 dark:bg-green-950/30', textColor: 'text-green-600 dark:text-green-400' },
  { tier: 'Later' as const, label: 'Ongoing', color: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-950/30', textColor: 'text-blue-600 dark:text-blue-400' },
]

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000))
}

function progressPercent(start: Date, target: Date): number {
  const total = target.getTime() - start.getTime()
  const elapsed = Date.now() - start.getTime()
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

export default function Dashboard() {
  const { userName } = useUser()
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [whatifs, setWhatifs] = useState<WhatIfRow[]>([])
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [profile, setProfile] = useState<{ key: string; value: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: todosData },
        { data: branchesData },
        { data: whatifsData },
        { data: propertiesData },
        { data: schoolsData },
        { data: profileData },
      ] = await Promise.all([
        supabase.from('todos').select('*'),
        supabase.from('branches').select('*'),
        supabase.from('whatifs').select('*'),
        supabase.from('properties').select('id, address, area, status, visit_at'),
        supabase.from('schools').select('id, name, status'),
        supabase.from('profile').select('key, value'),
      ])
      setTodos(todosData || [])
      setBranches(branchesData || [])
      setWhatifs(whatifsData || [])
      setProperties((propertiesData || []) as PropertyRow[])
      setSchools((schoolsData || []) as SchoolRow[])
      setProfile((profileData || []) as { key: string; value: string | null }[])
      setLoading(false)
    }
    load()

    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatifs' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [])

  // Computed data
  const completedTodos = todos.filter(t => t.completed).length
  const totalTodos = todos.length
  const todoPct = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

  const decidedBranches = branches.filter(b => b.status === 'Decided').length
  const totalBranches = branches.length
  const branchPct = totalBranches > 0 ? Math.round((decidedBranches / totalBranches) * 100) : 0

  const resolvedWhatifs = whatifs.filter(w => w.status === 'Resolved').length
  const totalWhatifs = whatifs.length
  const whatifPct = totalWhatifs > 0 ? Math.round((resolvedWhatifs / totalWhatifs) * 100) : 0

  const phaseData = PHASES.map(phase => {
    const phaseTodos = todos.filter(t => t.tier === phase.tier)
    const done = phaseTodos.filter(t => t.completed).length
    const total = phaseTodos.length
    return { ...phase, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  // Current phase = earliest phase with incomplete tasks (or first phase if all empty)
  const currentPhaseIdx = phaseData.findIndex(p => p.total > 0 && p.done < p.total)

  // Blockers: undecided branches that have linked todos
  const blockers = branches
    .filter(b => b.status !== 'Decided')
    .map(b => ({
      branch: b,
      blockedCount: todos.filter(t => t.branch_id === b.id && !t.completed).length,
    }))
    .filter(b => b.blockedCount > 0)

  // Up next: incomplete todos from the earliest non-complete phase
  const upNextTodos = (() => {
    for (const phase of PHASES) {
      const incomplete = todos.filter(t => t.tier === phase.tier && !t.completed)
      if (incomplete.length > 0) return incomplete.slice(0, 5)
    }
    return []
  })()

  // Active what-ifs (Monitoring or Triggered)
  const activeWhatifs = whatifs.filter(w => w.status === 'Monitoring' || w.status === 'Triggered')

  // Upcoming property visits
  const upcomingVisits = properties
    .filter(p => p.visit_at && new Date(p.visit_at) > new Date())
    .sort((a, b) => new Date(a.visit_at!).getTime() - new Date(b.visit_at!).getTime())
    .slice(0, 3)

  // School research summary
  const schoolCounts = {
    total: schools.length,
    topChoice: schools.filter(s => s.status === 'Top Choice').length,
    toured: schools.filter(s => s.status === 'Toured').length,
    researching: schools.filter(s => s.status === 'Researching' || !s.status).length,
  }

  const pMap = Object.fromEntries(profile.map(r => [r.key, r.value ?? '']))
  const START_DATE  = pMap.move_start_date  ? new Date(pMap.move_start_date)  : new Date('2026-03-01')
  const TARGET_DATE = pMap.move_target_date ? new Date(pMap.move_target_date) : new Date('2026-09-01')

  const timeProgress = progressPercent(START_DATE, TARGET_DATE)
  const daysLeft = daysUntil(TARGET_DATE)

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-64 bg-stone-100 dark:bg-stone-700 rounded-lg animate-pulse" />
        <div className="h-40 bg-stone-100 dark:bg-stone-700 rounded-2xl animate-pulse" />
        <div className="h-32 bg-stone-100 dark:bg-stone-700 rounded-2xl animate-pulse" />
        <div className="h-48 bg-stone-100 dark:bg-stone-700 rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Welcome back, {userName} 👋
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">Your family move command center.</p>
      </div>

      {/* ── SECTION 1: Timeline & Phases ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 space-y-5"
      >
        {/* Move timeline bar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                Move Timeline
              </div>
              <div className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                {daysLeft} days until target move
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-700">{timeProgress}%</div>
              <div className="text-xs text-stone-400 dark:text-stone-500">of time elapsed</div>
            </div>
          </div>
          <div className="h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${timeProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-gradient-to-r from-teal-500 to-teal-700 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-stone-400 dark:text-stone-500">
            <span>{START_DATE.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} — Start</span>
            <span>{TARGET_DATE.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} — Target</span>
          </div>
        </div>

        {/* Phase progress segments */}
        <div>
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
            Task Phases
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {phaseData.map((phase, i) => (
              <div
                key={phase.tier}
                className={`rounded-xl p-3 border transition-all ${
                  i === currentPhaseIdx
                    ? `${phase.lightBg} border-current ${phase.textColor} ring-1 ring-current/20`
                    : 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${phase.color}`} />
                  <span className={`text-xs font-semibold ${i === currentPhaseIdx ? phase.textColor : 'text-stone-600 dark:text-stone-400'}`}>
                    {phase.label}
                  </span>
                </div>
                <div className={`text-lg font-bold ${i === currentPhaseIdx ? phase.textColor : 'text-stone-900 dark:text-stone-100'}`}>
                  {phase.done}/{phase.total}
                </div>
                <div className="mt-1.5 h-1.5 bg-stone-200/60 dark:bg-stone-600/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${phase.pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + i * 0.1 }}
                    className={`h-full rounded-full ${phase.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── SECTION 2: Progress Rings ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-5">
          Overall Progress
        </div>
        <div className="flex justify-around items-start">
          <ProgressRing
            progress={todoPct}
            color="text-teal-500"
            label="Tasks"
            value={`${completedTodos}/${totalTodos}`}
            subtitle={totalTodos > 0 ? `${todoPct}%` : 'none'}
          />
          <ProgressRing
            progress={branchPct}
            color="text-amber-500"
            label="Decisions"
            value={`${decidedBranches}/${totalBranches}`}
            subtitle={totalBranches > 0 ? `${branchPct}%` : 'none'}
          />
          <ProgressRing
            progress={whatifPct}
            color="text-purple-500"
            label="Scenarios"
            value={`${resolvedWhatifs}/${totalWhatifs}`}
            subtitle={totalWhatifs > 0 ? `${whatifPct}%` : 'none'}
          />
        </div>
      </motion.div>

      {/* ── SECTION 3: Blockers & Up Next ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blockers */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <h2 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" /> Blockers
          </h2>
          {blockers.length === 0 ? (
            <div className="text-center py-6 text-stone-400 dark:text-stone-500 text-sm">
              No blockers — all decisions are on track
            </div>
          ) : (
            <div className="space-y-3">
              {blockers.map(({ branch, blockedCount }) => (
                <Link
                  key={branch.id}
                  to="/branches"
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 hover:border-amber-200 dark:hover:border-amber-800/40 transition-colors group"
                >
                  <GitBranch size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                      {branch.title}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {branch.status} · blocking {blockedCount} task{blockedCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-stone-300 dark:text-stone-600 mt-0.5 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Up Next */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-5"
        >
          <h2 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-4">
            <Zap size={16} className="text-teal-500" /> Up Next
          </h2>
          {upNextTodos.length === 0 && activeWhatifs.length === 0 ? (
            <div className="text-center py-6 text-stone-400 dark:text-stone-500 text-sm">
              All caught up! <Link to="/todos" className="text-teal-600 hover:underline">Add tasks →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upNextTodos.map(todo => (
                <Link
                  key={todo.id}
                  to="/todos"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors group"
                >
                  <CheckSquare size={14} className="text-stone-300 dark:text-stone-600 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300 truncate flex-1 group-hover:text-stone-900 dark:group-hover:text-stone-100">
                    {todo.text}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    PHASES.find(p => p.tier === todo.tier)?.lightBg
                  } ${PHASES.find(p => p.tier === todo.tier)?.textColor}`}>
                    {PHASES.find(p => p.tier === todo.tier)?.label}
                  </span>
                </Link>
              ))}
              {activeWhatifs.map(wi => (
                <Link
                  key={wi.id}
                  to="/whatifs"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors group"
                >
                  <HelpCircle size={14} className="text-purple-400 flex-shrink-0" />
                  <span className="text-sm text-stone-700 dark:text-stone-300 truncate flex-1 group-hover:text-stone-900 dark:group-hover:text-stone-100">
                    {wi.scenario}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    wi.status === 'Triggered'
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                      : 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
                  }`}>
                    {wi.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── SECTION 4: Properties & Schools ── */}
      {(properties.length > 0 || schools.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming visits */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-5"
          >
            <h2 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-blue-500" /> Upcoming Visits
            </h2>
            {upcomingVisits.length === 0 ? (
              <div className="text-sm text-stone-400 dark:text-stone-500 py-2">
                No visits scheduled.{' '}
                <Link to="/properties" className="text-teal-600 hover:underline">View properties →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingVisits.map(p => (
                  <Link
                    key={p.id}
                    to="/properties"
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors group"
                  >
                    <Home size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400">
                        {p.address}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        {new Date(p.visit_at!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-stone-300 dark:text-stone-600 mt-0.5 flex-shrink-0" />
                  </Link>
                ))}
                {properties.length > 3 && (
                  <Link to="/properties" className="text-xs text-teal-600 dark:text-teal-400 hover:underline pl-2.5">
                    View all {properties.length} properties →
                  </Link>
                )}
              </div>
            )}
          </motion.div>

          {/* School research */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card p-5"
          >
            <h2 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-4">
              <GraduationCap size={16} className="text-teal-500" /> School Research
            </h2>
            {schoolCounts.total === 0 ? (
              <div className="text-sm text-stone-400 dark:text-stone-500 py-2">
                No schools tracked yet.{' '}
                <Link to="/schools" className="text-teal-600 hover:underline">Add schools →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                    <div className="text-xl font-bold text-teal-700 dark:text-teal-400">{schoolCounts.topChoice}</div>
                    <div className="text-xs text-teal-600 dark:text-teal-500 mt-0.5">Top Choice</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{schoolCounts.toured}</div>
                    <div className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Toured</div>
                  </div>
                  <div className="text-center p-3 bg-stone-50 dark:bg-stone-700/50 rounded-xl">
                    <div className="text-xl font-bold text-stone-700 dark:text-stone-300">{schoolCounts.researching}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Researching</div>
                  </div>
                </div>
                <Link to="/schools" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
                  View all {schoolCounts.total} school{schoolCounts.total !== 1 ? 's' : ''} →
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/branches', icon: GitBranch, label: 'View Decisions', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
          { to: '/whatifs', icon: HelpCircle, label: 'What-If Scenarios', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
          { to: '/notes', icon: BookOpen, label: 'Add a Note', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
          { to: '/todos', icon: CheckSquare, label: 'View Tasks', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link
            key={to}
            to={to}
            className="card p-4 flex items-center gap-3 hover:shadow-md transition-all group"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
