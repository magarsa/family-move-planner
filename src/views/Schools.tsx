import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Check, Minus, Circle, GraduationCap, Loader2, Save, Trash2, Plus, X, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { AiAnalysis } from '../types/analysis'
import { useUser } from '../hooks/useUser'
import AiAnalysisPanel from '../components/AiAnalysisPanel'

type SchoolRow = Tables<'schools'>

type SchoolStatus = 'Researching' | 'Toured' | 'Top Choice' | 'Ruled Out'
type SchoolLevel = 'K-5' | '6-8' | '9-12' | 'K-8' | 'K-12' | 'Other'

const STATUS_STYLES: Record<SchoolStatus, { badge: string; icon: ReactNode; label: string }> = {
  'Researching': { badge: 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-300',     icon: <Circle size={12} />, label: 'Researching' },
  'Toured':      { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: <Minus size={12} />,  label: 'Toured' },
  'Top Choice':  { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',     icon: <Check size={12} />,  label: 'Top Choice' },
  'Ruled Out':   { badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',         icon: <X size={12} />,      label: 'Ruled Out' },
}

const AREA_OPTIONS = [
  'Fort Mill, SC', 'Tega Cay, SC', 'Clover, SC', 'Lake Wylie, SC', 'Indian Land, SC',
  'Mooresville, NC', 'Huntersville, NC', 'Concord, NC', 'Monroe, NC', 'Waxhaw, NC', 'Other',
]

const GRADE_LEVELS: SchoolLevel[] = ['K-5', '6-8', '9-12', 'K-8', 'K-12', 'Other']
const SCHOOL_TYPES = ['Public', 'Private', 'Charter', 'Magnet']

// ─── SchoolCard ───────────────────────────────────────────────────────────────

interface SchoolCardProps {
  school: SchoolRow
  linkedPropertyCount: number
  autoOpen?: boolean
  onUpdate: (id: string, patch: Partial<SchoolRow>) => void
  onDelete: (id: string) => void
}

function SchoolCard({ school, linkedPropertyCount, autoOpen, onUpdate, onDelete }: SchoolCardProps) {
  const { userName } = useUser()
  const [open, setOpen] = useState(autoOpen ?? false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoOpen && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])
  const [editNotes, setEditNotes] = useState(school.notes || '')
  const [editUrl, setEditUrl] = useState(school.greatschools_url || '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = (school.status || 'Researching') as SchoolStatus
  const style = STATUS_STYLES[status]
  const analysis = school.ai_analysis as unknown as AiAnalysis | null

  async function save() {
    setSaving(true)
    const patch: Partial<SchoolRow> = {
      notes: editNotes || null,
      greatschools_url: editUrl || null,
      updated_by: userName,
      updated_at: new Date().toISOString(),
    }
    onUpdate(school.id, patch)
    await supabase.from('schools').update(patch).eq('id', school.id)
    setSaving(false)
    setDirty(false)
  }

  async function setStatus(s: SchoolStatus) {
    const patch: Partial<SchoolRow> = { status: s, updated_by: userName, updated_at: new Date().toISOString() }
    onUpdate(school.id, patch)
    await supabase.from('schools').update(patch).eq('id', school.id)
  }

  async function handleDelete() {
    if (!confirm(`Remove "${school.name}" from your list?`)) return
    setDeleting(true)
    onDelete(school.id)
    await supabase.from('schools').delete().eq('id', school.id)
  }

  return (
    <div ref={cardRef} className={`card overflow-hidden transition-shadow ${open ? 'shadow-md' : ''} ${autoOpen ? 'ring-2 ring-teal-400 ring-offset-2' : ''}`}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`status-badge ${style.badge} flex items-center gap-1 flex-shrink-0`}>
          {style.icon} {style.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-800 dark:text-stone-100 truncate">{school.name}</div>
          <div className="text-xs text-stone-400 dark:text-stone-500">
            {[school.district, school.area].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {school.grades && (
            <span className="text-xs bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-lg">{school.grades}</span>
          )}
          {school.school_type && (
            <span className="text-xs bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded-lg">{school.school_type}</span>
          )}
          {linkedPropertyCount > 0 && (
            <span className="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-lg">
              🏠 {linkedPropertyCount}
            </span>
          )}
          {analysis && (
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold font-serif ${
              analysis.overallGrade === 'A' ? 'bg-green-500' :
              analysis.overallGrade === 'B' ? 'bg-lime-500' :
              analysis.overallGrade === 'C' ? 'bg-yellow-500' :
              analysis.overallGrade === 'D' ? 'bg-orange-500' : 'bg-red-500'
            }`}>{analysis.overallGrade}</span>
          )}
        </div>
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
            <div className="border-t border-stone-100 dark:border-stone-700 px-5 py-5 space-y-5">
              {/* Detail chips */}
              <div className="flex flex-wrap gap-2">
                {school.grades && <span className="status-badge bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">📚 {school.grades}</span>}
                {school.school_type && <span className="status-badge bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">🏫 {school.school_type}</span>}
                {school.area && <span className="status-badge bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">📍 {school.area}</span>}
                {school.greatschools_url && (
                  <a
                    href={school.greatschools_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="status-badge bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1 hover:opacity-80"
                  >
                    <ExternalLink size={10} /> GreatSchools
                  </a>
                )}
                {linkedPropertyCount > 0 && (
                  <span className="status-badge bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                    🏠 Near {linkedPropertyCount} propert{linkedPropertyCount === 1 ? 'y' : 'ies'}
                  </span>
                )}
              </div>

              {/* Status selector */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Status</div>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_STYLES) as SchoolStatus[]).map(s => (
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

              {/* GreatSchools URL */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">GreatSchools URL</div>
                <input
                  type="url"
                  value={editUrl}
                  onChange={e => { setEditUrl(e.target.value); setDirty(true) }}
                  placeholder="https://www.greatschools.org/..."
                  className="input-field text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Research Notes</div>
                <textarea
                  value={editNotes}
                  onChange={e => { setEditNotes(e.target.value); setDirty(true) }}
                  placeholder="What do you know about this school? Programs, ratings, enrollment zone, etc."
                  rows={3}
                  className="textarea-field"
                />
              </div>

              {/* AI Analysis Panel */}
              <AiAnalysisPanel
                entityType="school"
                entityId={school.id}
                entityData={school as unknown as Record<string, unknown>}
                analysis={analysis}
                onAnalysisComplete={(a) => onUpdate(school.id, { ai_analysis: a as unknown as typeof school.ai_analysis })}
              />

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} /> Remove
                </button>
                {dirty && (
                  <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save changes
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Add School Form ──────────────────────────────────────────────────────────

interface AddSchoolFormProps {
  onAdd: (school: SchoolRow) => void
  onClose: () => void
}

function AddSchoolForm({ onAdd, onClose }: AddSchoolFormProps) {
  const { userName } = useUser()
  const [name, setName] = useState('')
  const [district, setDistrict] = useState('')
  const [area, setArea] = useState('')
  const [grades, setGrades] = useState<SchoolLevel>('K-5')
  const [schoolType, setSchoolType] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('School name is required'); return }
    setSubmitting(true)
    const { data, error } = await supabase.from('schools').insert({
      name: name.trim(),
      district: district || null,
      area: area || null,
      grades: grades || null,
      school_type: schoolType || null,
      status: 'Researching',
      added_by: userName,
      updated_by: userName,
    }).select().single()
    if (error) { setErr(error.message); setSubmitting(false); return }
    onAdd(data as SchoolRow)
    onClose()
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-stone-800 dark:text-stone-100">Add School</h3>
        <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">School Name *</label>
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setErr('') }}
            placeholder="Gold Hill Elementary"
            className="input-field mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">District</label>
            <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Fort Mill School District" className="input-field mt-1 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Area</label>
            <select value={area} onChange={e => setArea(e.target.value)} className="input-field mt-1 text-sm">
              <option value="">— Select area —</option>
              {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Grades</label>
            <select value={grades} onChange={e => setGrades(e.target.value as SchoolLevel)} className="input-field mt-1 text-sm">
              {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Type</label>
            <select value={schoolType} onChange={e => setSchoolType(e.target.value)} className="input-field mt-1 text-sm">
              <option value="">— Select type —</option>
              {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add School
        </button>
      </div>
    </form>
  )
}

// ─── Schools Page ─────────────────────────────────────────────────────────────

export default function Schools() {
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [linkedCounts, setLinkedCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [levelFilter, setLevelFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [searchParams] = useSearchParams()
  const openId = searchParams.get('open')

  async function fetchSchools() {
    const { data } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false })
    setSchools((data || []) as SchoolRow[])
    setLoading(false)
  }

  async function fetchLinkedCounts() {
    const { data } = await supabase.from('property_schools').select('school_id')
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach(r => { counts[r.school_id] = (counts[r.school_id] || 0) + 1 })
      setLinkedCounts(counts)
    }
  }

  useEffect(() => {
    fetchSchools()
    fetchLinkedCounts()
    const ch = supabase.channel('schools-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, fetchSchools)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function handleUpdate(id: string, patch: Partial<SchoolRow>) {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function handleDelete(id: string) {
    setSchools(prev => prev.filter(s => s.id !== id))
  }

  function handleAdd(school: SchoolRow) {
    setSchools(prev => [school, ...prev])
  }

  const LEVEL_FILTERS = ['All', 'K-5', 'K-8', 'K-12', '6-8', '9-12']
  const TYPE_FILTERS = ['All', 'Public', 'Charter', 'Private', 'Magnet']

  const filtered = schools.filter(s =>
    (levelFilter === 'All' || s.grades === levelFilter) &&
    (typeFilter === 'All' || s.school_type === typeFilter)
  )

  const counts = {
    Researching: schools.filter(s => s.status === 'Researching' || !s.status).length,
    Toured: schools.filter(s => s.status === 'Toured').length,
    'Top Choice': schools.filter(s => s.status === 'Top Choice').length,
    'Ruled Out': schools.filter(s => s.status === 'Ruled Out').length,
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
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <GraduationCap size={22} className="text-teal-600" /> Schools
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">Research schools in your target areas.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={14} /> Add School
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AddSchoolForm onAdd={handleAdd} onClose={() => setShowAdd(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status summary */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(counts) as [SchoolStatus, number][])
          .filter(([, n]) => n > 0)
          .map(([s, n]) => (
            <span key={s} className={`status-badge ${STATUS_STYLES[s].badge}`}>
              {STATUS_STYLES[s].icon} {s} ({n})
            </span>
          ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 w-fit">
          {LEVEL_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                levelFilter === f
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 w-fit">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                typeFilter === f
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* School list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-stone-400 dark:text-stone-500">
            <GraduationCap size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No schools yet</p>
            <p className="text-sm mt-1">Add schools you're researching in the Charlotte area.</p>
          </div>
        ) : (
          filtered.map(school => (
            <SchoolCard
              key={school.id}
              school={school}
              linkedPropertyCount={linkedCounts[school.id] || 0}
              autoOpen={school.id === openId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
