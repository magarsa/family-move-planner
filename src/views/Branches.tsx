import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Check, Minus, Circle, Loader2, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
type BranchRow = Tables<'branches'>

interface BranchOption {
  label: string
  pros: string[]
  cons: string[]
}

import { useUser } from '../hooks/useUser'

type BranchStatus = 'Open' | 'In Progress' | 'Decided'


const STATUS_STYLES: Record<BranchStatus, { badge: string; icon: ReactNode; label: string }> = {
  'Open':        { badge: 'bg-stone-100 text-stone-500',    icon: <Circle size={12} />,  label: 'Open' },
  'In Progress': { badge: 'bg-amber-100 text-amber-700',    icon: <Minus size={12} />,   label: 'In Progress' },
  'Decided':     { badge: 'bg-teal-100 text-teal-700',      icon: <Check size={12} />,   label: 'Decided' },
}

interface BranchCardProps {
  branch: BranchRow
  onUpdate: (id: string, patch: Partial<BranchRow>) => void
}

function BranchCard({ branch, onUpdate }: BranchCardProps) {
  const { userName } = useUser()
  const [open, setOpen] = useState(false)
  const [editDecision, setEditDecision] = useState(branch.decision_made || '')
  const [editNotes, setEditNotes] = useState(branch.notes || '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const status = branch.status as BranchStatus
  const style = STATUS_STYLES[status]

  async function save() {
    setSaving(true)
    const patch = {
      decision_made: editDecision || null,
      notes: editNotes || null,
      updated_by: userName,
      updated_at: new Date().toISOString(),
    }
    onUpdate(branch.id, patch)
    await supabase.from('branches').update(patch).eq('id', branch.id)
    setSaving(false)
    setDirty(false)
  }

  async function setStatus(s: BranchStatus) {
    const patch = { status: s, updated_by: userName, updated_at: new Date().toISOString() }
    onUpdate(branch.id, patch)
    await supabase.from('branches').update(patch).eq('id', branch.id)
  }

  return (
    <div className={`card overflow-hidden transition-shadow ${open ? 'shadow-md' : ''}`}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`status-badge ${style.badge} flex items-center gap-1`}>
          {style.icon} {style.label}
        </span>
        <span className="flex-1 font-semibold text-stone-800">{branch.title}</span>
        {branch.updated_by && (
          <span className="text-xs text-stone-400 hidden sm:block">
            Updated by {branch.updated_by}
          </span>
        )}
        {open ? <ChevronUp size={16} className="text-stone-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-stone-400 flex-shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-stone-100 px-5 py-5 space-y-5">
              {/* Description */}
              {branch.description && (
                <p className="text-sm text-stone-600 leading-relaxed italic">{branch.description}</p>
              )}

              {/* Status selector */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Status</div>
                <div className="flex gap-2 flex-wrap">
                  {(['Open', 'In Progress', 'Decided'] as BranchStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`status-badge cursor-pointer transition-all hover:scale-105 ${STATUS_STYLES[s].badge} ${status === s ? 'ring-2 ring-offset-1 ring-teal-400' : 'opacity-60 hover:opacity-100'}`}
                    >
                      {STATUS_STYLES[s].icon} {STATUS_STYLES[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              {branch.options && (branch.options as unknown as BranchOption[]).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Options</div>
                  <div className="space-y-3">
                    {(branch.options as unknown as BranchOption[]).map((opt, i) => (
                      <div key={i} className="bg-stone-50 rounded-xl p-4">
                        <div className="font-medium text-stone-800 text-sm mb-2">{opt.label}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {opt.pros.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-green-600 mb-1">✅ Pros</div>
                              <ul className="space-y-1">
                                {opt.pros.map((p, j) => (
                                  <li key={j} className="text-xs text-stone-600 flex items-start gap-1.5">
                                    <span className="text-green-400 mt-0.5">+</span>{p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {opt.cons.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-red-500 mb-1">❌ Cons</div>
                              <ul className="space-y-1">
                                {opt.cons.map((c, j) => (
                                  <li key={j} className="text-xs text-stone-600 flex items-start gap-1.5">
                                    <span className="text-red-400 mt-0.5">−</span>{c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision made */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  Our Decision
                </div>
                <textarea
                  value={editDecision}
                  onChange={e => { setEditDecision(e.target.value); setDirty(true) }}
                  placeholder="Record what you decided here…"
                  rows={2}
                  className="textarea-field"
                />
              </div>

              {/* Notes */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Notes</div>
                <textarea
                  value={editNotes}
                  onChange={e => { setEditNotes(e.target.value); setDirty(true) }}
                  placeholder="Any additional context, links, or notes…"
                  rows={3}
                  className="textarea-field"
                />
              </div>

              {/* Save button */}
              {dirty && (
                <div className="flex justify-end">
                  <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save changes
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Branches() {
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchBranches() {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .order('sort_order', { ascending: true })
    setBranches(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBranches()
    const ch = supabase.channel('branches-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, fetchBranches)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function handleUpdate(id: string, patch: Partial<BranchRow>) {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  const counts = {
    Open: branches.filter(b => b.status === 'Open').length,
    'In Progress': branches.filter(b => b.status === 'In Progress').length,
    Decided: branches.filter(b => b.status === 'Decided').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">Decision Branches</h1>
          <p className="text-stone-500 mt-1">Track every major choice on your move.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="status-badge bg-stone-100 text-stone-500">{counts.Open} Open</span>
          <span className="status-badge bg-amber-100 text-amber-700">{counts['In Progress']} Active</span>
          <span className="status-badge bg-teal-100 text-teal-700">{counts.Decided} Decided</span>
        </div>
      </div>

      <div className="space-y-3">
        {branches.map(branch => (
          <BranchCard key={branch.id} branch={branch} onUpdate={handleUpdate} />
        ))}
      </div>
    </div>
  )
}
