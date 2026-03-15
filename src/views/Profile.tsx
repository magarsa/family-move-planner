import { useEffect, useState } from 'react'
import { Pencil, Check, X, Loader2, User2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
type ProfileRow = Tables<'profile'>

import { useUser } from '../hooks/useUser'

const PROFILE_META: { key: string; label: string; hint?: string; multiline?: boolean }[] = [
  { key: 'current_home',              label: 'Current Home' },
  { key: 'destination',               label: 'Destination(s)',               hint: 'e.g. Charlotte NC, Greenville SC, Raleigh NC' },
  { key: 'timeline',                  label: 'Target Timeline' },
  { key: 'move_drivers',              label: 'Move Drivers',                  hint: 'Why are you moving?', multiline: true },
  { key: 'kids',                      label: 'Kids' },
  { key: 'kids_grades',               label: "Kids' Grades / Schools",        hint: 'e.g. 3rd grade, 7th grade' },
  { key: 'destination_housing_plan',  label: 'Destination Housing Plan',      hint: 'Buy, rent, etc.' },
  { key: 'employment',                label: 'Employment Situation',           hint: 'Who is job-searching?', multiline: true },
  { key: 'origin_sale_price',         label: 'Current Home Sale Price Est.' },
  { key: 'mortgage_balance',          label: 'Remaining Mortgage Balance' },
  { key: 'equity_to_deploy',          label: 'Expected Equity to Deploy' },
  { key: 'destination_budget',        label: 'Home Budget' },
  { key: 'target_suburbs',            label: 'Target Suburb(s)',               hint: 'e.g. Fort Mill SC, Cary NC, Simpsonville SC', multiline: true },
]

interface RowProps {
  meta: typeof PROFILE_META[number]
  row: ProfileRow | undefined
  onSave: (key: string, value: string) => Promise<void>
}

function ProfileFieldRow({ meta, row, onSave }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row?.value || '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (draft === (row?.value || '')) { setEditing(false); return }
    setSaving(true)
    await onSave(meta.key, draft)
    setSaving(false)
    setEditing(false)
  }

  function cancel() {
    setDraft(row?.value || '')
    setEditing(false)
  }

  const value = row?.value
  const isTBD = !value || value === 'TBD' || value === '⬜ TBD'

  return (
    <div className="py-3.5 flex items-start gap-4 border-b border-stone-100 last:border-0 group">
      <div className="w-48 flex-shrink-0">
        <div className="text-sm font-medium text-stone-600">{meta.label}</div>
        {meta.hint && <div className="text-xs text-stone-400 mt-0.5">{meta.hint}</div>}
      </div>

      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2"
            >
              {meta.multiline ? (
                <textarea
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') cancel() }}
                  rows={2}
                  className="textarea-field flex-1 text-sm"
                />
              ) : (
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
                  className="input-field flex-1 text-sm"
                />
              )}
              <div className="flex gap-1 flex-shrink-0 mt-0.5">
                <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button onClick={cancel} className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span className={`text-sm flex-1 ${isTBD ? 'text-stone-400 italic' : 'text-stone-800'}`}>
                {isTBD ? 'Not set yet' : value}
              </span>
              <button
                onClick={() => { setDraft(row?.value || ''); setEditing(true) }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-stone-400 hover:text-teal-600 hover:bg-stone-50 transition-all"
              >
                <Pencil size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {row?.updated_by && !editing && (
          <div className="text-xs text-stone-400 mt-0.5">
            Updated by {row.updated_by}
            {row.updated_at && ` · ${new Date(row.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  const { userName } = useUser()
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchProfile() {
    const { data } = await supabase.from('profile').select('*')
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
    const ch = supabase.channel('profile-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile' }, fetchProfile)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function handleSave(key: string, value: string) {
    const patch = { key, value, updated_by: userName, updated_at: new Date().toISOString() }
    setRows(prev => {
      const exists = prev.find(r => r.key === key)
      if (exists) return prev.map(r => r.key === key ? { ...r, ...patch } : r)
      return [...prev, patch]
    })
    await supabase.from('profile').upsert(patch, { onConflict: 'key' })
  }

  const tbd = PROFILE_META.filter(m => {
    const row = rows.find(r => r.key === m.key)
    return !row?.value || row.value === 'TBD' || row.value === '⬜ TBD'
  }).length

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
          <h1 className="font-serif text-2xl font-semibold text-stone-900">Our Profile</h1>
          <p className="text-stone-500 mt-1">Key facts about your move. Click any field to edit.</p>
        </div>
        {tbd > 0 && (
          <span className="status-badge bg-amber-100 text-amber-700">
            {tbd} fields still TBD
          </span>
        )}
      </div>

      <div className="card px-5 divide-y divide-stone-100">
        {PROFILE_META.map(meta => (
          <ProfileFieldRow
            key={meta.key}
            meta={meta}
            row={rows.find(r => r.key === meta.key)}
            onSave={handleSave}
          />
        ))}
      </div>

      <div className="card p-5 bg-teal-50 border-teal-100">
        <div className="flex items-center gap-2 mb-2">
          <User2 size={16} className="text-teal-600" />
          <span className="font-semibold text-teal-800 text-sm">App Users</span>
        </div>
        <p className="text-sm text-teal-700">
          <strong>Safal</strong> (Husband) and <strong>Prativa</strong> (Wife) — switch users from the sidebar.
          All changes are synced in real-time between both of you.
        </p>
      </div>
    </div>
  )
}
