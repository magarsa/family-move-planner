import { useEffect, useState } from 'react'
import { Plus, Loader2, Save, Trash2, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { WhatIfRow } from '../types/database'
import { useUser } from '../hooks/useUser'

type WIStatus = 'Unplanned' | 'Monitoring' | 'Triggered' | 'Resolved'

const STATUS_STYLES: Record<WIStatus, { badge: string; dot: string; label: string }> = {
  'Unplanned':  { badge: 'bg-stone-100 text-stone-500',     dot: 'bg-stone-400',    label: 'Unplanned' },
  'Monitoring': { badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',    label: 'Monitoring' },
  'Triggered':  { badge: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500',   label: 'Triggered' },
  'Resolved':   { badge: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500',     label: 'Resolved' },
}

const STATUSES: WIStatus[] = ['Unplanned', 'Monitoring', 'Triggered', 'Resolved']

interface CardProps {
  item: WhatIfRow
  onUpdate: (id: string, patch: Partial<WhatIfRow>) => void
  onDelete: (id: string) => void
}

function WhatIfCard({ item, onUpdate, onDelete }: CardProps) {
  const { userName } = useUser()
  const [editNotes, setEditNotes] = useState(item.notes || '')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const status = item.status as WIStatus

  async function setStatus(s: WIStatus) {
    const patch = { status: s, updated_by: userName, updated_at: new Date().toISOString() }
    onUpdate(item.id, patch)
    await supabase.from('whatifs').update(patch).eq('id', item.id)
  }

  async function save() {
    setSaving(true)
    const patch = { notes: editNotes || null, updated_by: userName, updated_at: new Date().toISOString() }
    onUpdate(item.id, patch)
    await supabase.from('whatifs').update(patch).eq('id', item.id)
    setSaving(false)
    setDirty(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_STYLES[status].dot}`} />
          <p className="text-sm font-medium text-stone-800 leading-relaxed">{item.scenario}</p>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-stone-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {item.branch && (
        <div className="text-xs text-stone-400 pl-4.5 ml-0.5">
          Branch: <span className="text-stone-600">{item.branch}</span>
        </div>
      )}

      {/* Status pills */}
      <div className="flex gap-1.5 flex-wrap pl-4">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`status-badge transition-all cursor-pointer ${STATUS_STYLES[s].badge} ${
              status === s ? 'ring-2 ring-offset-1 ring-teal-400' : 'opacity-50 hover:opacity-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Notes */}
      <div className="pl-4">
        <textarea
          value={editNotes}
          onChange={e => { setEditNotes(e.target.value); setDirty(true) }}
          placeholder="Notes on how to handle this if it happens…"
          rows={2}
          className="textarea-field text-xs"
        />
        {dirty && (
          <div className="flex justify-end mt-1.5">
            <button onClick={save} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface AddFormProps {
  onAdd: (scenario: string, branch: string) => Promise<void>
  onCancel: () => void
}

function AddForm({ onAdd, onCancel }: AddFormProps) {
  const [scenario, setScenario] = useState('')
  const [branch, setBranch] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!scenario.trim()) return
    setSaving(true)
    await onAdd(scenario.trim(), branch.trim())
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="card p-4 space-y-3 border-2 border-teal-200"
    >
      <div className="text-sm font-semibold text-stone-700">New What-If Scenario</div>
      <input
        autoFocus
        type="text"
        value={scenario}
        onChange={e => setScenario(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        placeholder="What if… (e.g. Des Moines home sells in under 30 days)"
        className="input-field"
      />
      <input
        type="text"
        value={branch}
        onChange={e => setBranch(e.target.value)}
        placeholder="Related branch (optional)"
        className="input-field"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={saving || !scenario.trim()} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add Scenario
        </button>
      </div>
    </motion.div>
  )
}

export default function Whatifs() {
  const { userName } = useUser()
  const [items, setItems] = useState<WhatIfRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function fetchItems() {
    const { data } = await supabase.from('whatifs').select('*').order('updated_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
    const ch = supabase.channel('whatifs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatifs' }, fetchItems)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function handleUpdate(id: string, patch: Partial<WhatIfRow>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('whatifs').delete().eq('id', id)
  }

  async function handleAdd(scenario: string, branch: string) {
    const newItem = {
      scenario,
      branch: branch || null,
      status: 'Unplanned' as WIStatus,
      notes: null,
      updated_by: userName,
    }
    const tempId = `temp-${Date.now()}`
    setItems(prev => [{ ...newItem, id: tempId, updated_at: new Date().toISOString() }, ...prev])
    setShowAdd(false)
    await supabase.from('whatifs').insert(newItem)
    fetchItems()
  }

  const counts = {
    Monitoring: items.filter(i => i.status === 'Monitoring').length,
    Triggered: items.filter(i => i.status === 'Triggered').length,
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
          <h1 className="font-serif text-2xl font-semibold text-stone-900">What-If Scenarios</h1>
          <p className="text-stone-500 mt-1">Plan for the unexpected before it happens.</p>
        </div>
        <div className="flex items-center gap-3">
          {counts.Triggered > 0 && (
            <span className="status-badge bg-orange-100 text-orange-700">
              ⚡ {counts.Triggered} Triggered
            </span>
          )}
          {counts.Monitoring > 0 && (
            <span className="status-badge bg-amber-100 text-amber-700">
              👁 {counts.Monitoring} Watching
            </span>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={15} /> Add Scenario
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <HelpCircle size={32} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 font-medium">No scenarios yet</p>
          <p className="text-stone-400 text-sm mt-1">Add what-if scenarios to plan for contingencies.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {items.map(item => (
              <WhatIfCard key={item.id} item={item} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
