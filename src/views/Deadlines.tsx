import { useEffect, useState } from 'react'
import { Clock, Plus, Check, Trash2, AlertTriangle, Calendar, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import { useUser } from '../hooks/useUser'

type DeadlineRow  = Tables<'deadlines'>
type PropertyRow  = Tables<'properties'>

const CATEGORIES = ['Offer', 'Inspection', 'Appraisal', 'Financing', 'Closing', 'Listing', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Offer:      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  Inspection: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Appraisal:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  Financing:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  Closing:    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  Listing:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  Other:      'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
}

function daysUntil(dateStr: string): number {
  const d    = new Date(dateStr + 'T12:00:00')
  const now  = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

function urgencyClass(days: number, completed: boolean) {
  if (completed) return 'border-stone-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30'
  if (days < 0)  return 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
  if (days <= 2) return 'border-red-200 dark:border-red-800/60 bg-red-50/60 dark:bg-red-900/10'
  if (days <= 7) return 'border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/10'
  return 'border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800/60'
}

function urgencyLabel(days: number) {
  if (days < 0)  return <span className="text-xs font-semibold text-red-600 dark:text-red-400">{Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="text-xs font-semibold text-red-600 dark:text-red-400">Today</span>
  if (days === 1) return <span className="text-xs font-semibold text-red-500 dark:text-red-400">Tomorrow</span>
  if (days <= 7)  return <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{days} days</span>
  return <span className="text-xs text-stone-400 dark:text-stone-500">{days} days</span>
}

export default function Deadlines() {
  const { userName }  = useUser()
  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([])
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)

  const [newTitle,      setNewTitle]      = useState('')
  const [newDate,       setNewDate]       = useState('')
  const [newCategory,   setNewCategory]   = useState('Other')
  const [newNotes,      setNewNotes]      = useState('')
  const [newPropertyId, setNewPropertyId] = useState('')
  const [saving,        setSaving]        = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: dl }, { data: pr }] = await Promise.all([
        supabase.from('deadlines').select('*').order('deadline_at', { ascending: true }),
        supabase.from('properties').select('id, address, area').order('created_at', { ascending: false }),
      ])
      setDeadlines(dl ?? [])
      setProperties(pr ?? [])
      setLoading(false)
    }
    load()
    const ch = supabase.channel('deadlines-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deadlines' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function addDeadline() {
    if (!newTitle.trim() || !newDate) return
    setSaving(true)
    await supabase.from('deadlines').insert({
      title:       newTitle.trim(),
      deadline_at: newDate,
      category:    newCategory,
      notes:       newNotes.trim() || null,
      property_id: newPropertyId || null,
      added_by:    userName,
    })
    setNewTitle(''); setNewDate(''); setNewCategory('Other'); setNewNotes(''); setNewPropertyId('')
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleComplete(dl: DeadlineRow) {
    const done = !dl.completed
    await supabase.from('deadlines').update({
      completed:    done,
      completed_at: done ? new Date().toISOString() : null,
      completed_by: done ? userName : null,
    }).eq('id', dl.id)
  }

  async function deleteDeadline(id: string) {
    await supabase.from('deadlines').delete().eq('id', id)
  }

  const active    = deadlines.filter(d => !d.completed)
  const completed = deadlines.filter(d => d.completed)
  const overdue   = active.filter(d => daysUntil(d.deadline_at) < 0)

  if (loading) return (
    <div className="p-6 space-y-3 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">Critical Dates</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Offer expirations, inspection windows, closing dates.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Add Date
        </motion.button>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-sm font-medium text-red-800 dark:text-red-300">
            {overdue.length} deadline{overdue.length !== 1 ? 's' : ''} overdue
          </span>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-3">
              <div className="text-sm font-semibold text-stone-700 dark:text-stone-300">New Critical Date</div>

              <input
                type="text"
                placeholder="e.g. Inspection contingency expires"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="input-field"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">Category</label>
                  <div className="relative">
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="input-field appearance-none pr-8"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">Linked property (optional)</label>
                <div className="relative">
                  <select
                    value={newPropertyId}
                    onChange={e => setNewPropertyId(e.target.value)}
                    className="input-field appearance-none pr-8"
                  >
                    <option value="">None</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.address?.split(',')[0] ?? p.area ?? p.id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                </div>
              </div>

              <input
                type="text"
                placeholder="Notes (optional)"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                className="input-field"
              />

              <div className="flex gap-2 pt-1">
                <button
                  onClick={addDeadline}
                  disabled={saving || !newTitle.trim() || !newDate}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {saving ? 'Saving…' : 'Add'}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active deadlines */}
      {active.length === 0 ? (
        <div className="text-center py-12 text-stone-400 dark:text-stone-500">
          <Clock size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No deadlines yet.</p>
          <p className="text-xs mt-1">Add offer expirations, inspection windows, or closing dates.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(dl => {
            const days = daysUntil(dl.deadline_at)
            const linkedProp = properties.find(p => p.id === dl.property_id)
            return (
              <motion.div
                key={dl.id}
                layout
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${urgencyClass(days, false)}`}
              >
                <button
                  onClick={() => toggleComplete(dl)}
                  className="w-5 h-5 rounded-full border-2 border-stone-300 dark:border-stone-600 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 flex items-center justify-center transition-colors mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[dl.category] ?? CATEGORY_COLORS.Other}`}>
                      {dl.category}
                    </span>
                    <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{dl.title}</span>
                  </div>
                  {linkedProp && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                      {linkedProp.address?.split(',')[0] ?? linkedProp.area}
                    </p>
                  )}
                  {dl.notes && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{dl.notes}</p>}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="flex items-center gap-1.5 justify-end">
                    {urgencyLabel(days)}
                  </div>
                  <div className="text-xs text-stone-400 dark:text-stone-500">
                    {new Date(dl.deadline_at + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => deleteDeadline(dl.id)}
                  className="p-1 rounded text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Completed section */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(s => !s)}
            className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            <ChevronDown size={13} className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
            {completed.length} completed
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2 space-y-2"
              >
                {completed.map(dl => (
                  <div key={dl.id} className={`flex items-center gap-3 p-3 rounded-xl border ${urgencyClass(0, true)}`}>
                    <button
                      onClick={() => toggleComplete(dl)}
                      className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shrink-0"
                    >
                      <Check size={11} className="text-white" />
                    </button>
                    <span className="text-sm text-stone-400 dark:text-stone-500 line-through flex-1 truncate">{dl.title}</span>
                    <span className="text-xs text-stone-300 dark:text-stone-600 shrink-0">
                      {new Date(dl.deadline_at + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <button onClick={() => deleteDeadline(dl.id)} className="p-1 text-stone-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
