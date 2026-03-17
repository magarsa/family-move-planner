import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Phone, Mail, Users, MessageSquare, Calendar, DollarSign, Filter, Trash2, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

type ContactRow = Tables<'contacts'>
type ContactNoteRow = Tables<'contact_notes'>

type NoteType = 'Note' | 'Call' | 'Email' | 'Meeting' | 'Estimate' | 'Other'

interface NoteWithContact extends ContactNoteRow {
  contact: ContactRow
}

const NOTE_TYPE_STYLES: Record<string, { badge: string; icon: React.ElementType }> = {
  Call:     { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',       icon: Phone },
  Email:    { badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400', icon: Mail },
  Meeting:  { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400', icon: Users },
  Estimate: { badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',    icon: DollarSign },
  Note:     { badge: 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300',       icon: MessageSquare },
  Other:    { badge: 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400',       icon: MessageSquare },
}

const ALL_NOTE_TYPES: NoteType[] = ['Call', 'Email', 'Meeting', 'Estimate', 'Note', 'Other']

const BATCH = 8

function formatAmount(amount: number | null) {
  if (amount == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function groupByDay(notes: NoteWithContact[]): { label: string; notes: NoteWithContact[] }[] {
  const map = new Map<string, NoteWithContact[]>()
  for (const note of notes) {
    const d = new Date(note.note_date ?? note.created_at ?? '')
    const key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(note)
  }
  return Array.from(map.entries()).map(([label, notes]) => ({ label, notes }))
}

export default function Communications() {
  const [notes, setNotes]       = useState<NoteWithContact[]>([])
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [loading, setLoading]   = useState(true)

  const [filterType,    setFilterType]    = useState<NoteType | 'All'>('All')
  const [filterContact, setFilterContact] = useState<string>('All')
  const [filterSource,  setFilterSource]  = useState<'All' | 'Auto' | 'Manual'>('All')

  const [visibleCount, setVisibleCount] = useState(BATCH)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [expandedIds,   setExpandedIds]   = useState<Set<string>>(new Set())
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [reassigningId, setReassigningId] = useState<string | null>(null)

  const TRUNCATE_AT = 220

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  async function handleDeleteNote(id: string) {
    setDeletingId(id)
    await supabase.from('contact_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    setDeletingId(null)
  }

  async function handleReassign(noteId: string, newContactId: string) {
    setReassigningId(null)
    await supabase.from('contact_notes').update({ contact_id: newContactId }).eq('id', noteId)
    const newContact = contacts.find(c => c.id === newContactId)
    if (newContact) {
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, contact_id: newContactId, contact: newContact } : n
      ))
    }
  }

  useEffect(() => {
    async function load() {
      const [{ data: cn }, { data: c }] = await Promise.all([
        supabase.from('contact_notes').select('*').order('created_at', { ascending: false }),
        supabase.from('contacts').select('*'),
      ])
      const contactMap = Object.fromEntries((c ?? []).map(ct => [ct.id, ct]))
      const effective = (n: { note_date?: string | null; created_at?: string | null }) =>
        new Date(n.note_date ?? n.created_at ?? '').getTime()
      const joined: NoteWithContact[] = (cn ?? [])
        .filter(n => contactMap[n.contact_id])
        .map(n => ({ ...n, contact: contactMap[n.contact_id] }))
        .sort((a, b) => effective(b) - effective(a))
      setNotes(joined)
      setContacts(c ?? [])
      setLoading(false)
    }
    load()

    const ch = supabase
      .channel('comms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_notes' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = useMemo(() => {
    return notes.filter(n => {
      if (filterType !== 'All' && n.note_type !== filterType) return false
      if (filterContact !== 'All' && n.contact_id !== filterContact) return false
      if (filterSource === 'Auto'   && n.added_by !== 'inbound-email') return false
      if (filterSource === 'Manual' && n.added_by === 'inbound-email') return false
      return true
    })
  }, [notes, filterType, filterContact, filterSource])

  const visibleNotes = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const grouped = useMemo(() => groupByDay(visibleNotes), [visibleNotes])

  useEffect(() => { setVisibleCount(BATCH) }, [filterType, filterContact, filterSource])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount(c => Math.min(c + BATCH, filtered.length))
    }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered.length])

  const totalEstimates = useMemo(() =>
    notes.filter(n => n.note_type === 'Estimate' && n.amount).reduce((s, n) => s + (n.amount ?? 0), 0),
  [notes])

  if (loading) {
    return (
      <div className="p-6 space-y-3 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-stone-100 dark:bg-stone-800 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">
          Communications
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Every call, email, meeting, and estimate — one timeline.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ALL_NOTE_TYPES.slice(0, 4).map(type => {
          const count = notes.filter(n => n.note_type === type).length
          const { badge, icon: Icon } = NOTE_TYPE_STYLES[type]
          return (
            <button
              key={type}
              onClick={() => setFilterType(prev => prev === type ? 'All' : type)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                filterType === type
                  ? 'ring-2 ring-teal-500 border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600'
              }`}
            >
              <Icon size={14} className={badge.split(' ').find(c => c.startsWith('text-')) ?? ''} />
              <span className="text-stone-700 dark:text-stone-300">{type}s</span>
              <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full ${badge}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Estimate total (if any) */}
      {totalEstimates > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
          <DollarSign size={16} className="text-green-600 dark:text-green-400 shrink-0" />
          <span className="text-sm text-green-800 dark:text-green-300">
            Total across all estimates:{' '}
            <span className="font-semibold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalEstimates)}
            </span>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-stone-400 shrink-0" />
        <select
          value={filterContact}
          onChange={e => setFilterContact(e.target.value)}
          className="text-sm border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All contacts</option>
          {contacts.map(c => (
            <option key={c.id} value={c.id}>{c.name}{c.role ? ` (${c.role})` : ''}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as NoteType | 'All')}
          className="text-sm border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All types</option>
          {ALL_NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value as 'All' | 'Auto' | 'Manual')}
          className="text-sm border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1.5 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="All">All sources</option>
          <option value="Auto">Auto-logged</option>
          <option value="Manual">Manual</option>
        </select>
        {(filterType !== 'All' || filterContact !== 'All' || filterSource !== 'All') && (
          <button
            onClick={() => { setFilterType('All'); setFilterContact('All'); setFilterSource('All') }}
            className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
          {filtered.length} of {notes.length} entries
        </span>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400 dark:text-stone-500">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No communications logged yet.</p>
          <p className="text-xs mt-1">Add notes on contacts to see them here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ label, notes: dayNotes }) => (
            <div key={label}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <Calendar size={13} className="text-stone-400 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  {label}
                </span>
                <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
              </div>

              {/* Entries for this day */}
              <div className="space-y-2 pl-4 border-l-2 border-stone-100 dark:border-stone-800">
                {dayNotes.map(note => {
                  const typeKey = (note.note_type ?? 'Note') as string
                  const { badge, icon: Icon } = NOTE_TYPE_STYLES[typeKey] ?? NOTE_TYPE_STYLES.Note
                  const isLong     = (note.content?.length ?? 0) > TRUNCATE_AT
                  const isExpanded = expandedIds.has(note.id)
                  const isDeleting = deletingId === note.id
                  const displayContent = isLong && !isExpanded
                    ? note.content.slice(0, TRUNCATE_AT) + '…'
                    : note.content
                  return (
                    <div
                      key={note.id}
                      className="group bg-white dark:bg-stone-800/60 border border-stone-100 dark:border-stone-700 rounded-xl p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Note type badge */}
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>
                          <Icon size={11} />
                          {typeKey}
                        </span>
                        {/* Auto-logged indicator */}
                        {note.added_by === 'inbound-email' && (
                          <span className="text-xs text-stone-400 dark:text-stone-500 italic">auto</span>
                        )}
                        {/* Contact name */}
                        <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                          {note.contact.name}
                        </span>
                        {note.contact.role && (
                          <span className="text-xs text-stone-400 dark:text-stone-500">
                            · {note.contact.role}
                          </span>
                        )}
                        {/* Amount */}
                        {note.amount != null && (
                          <span className="ml-auto text-sm font-semibold text-green-700 dark:text-green-400">
                            {formatAmount(note.amount)}
                          </span>
                        )}
                        {/* Reassign contact */}
                        {reassigningId === note.id ? (
                          <select
                            autoFocus
                            defaultValue=""
                            onBlur={() => setReassigningId(null)}
                            onChange={e => { if (e.target.value) handleReassign(note.id, e.target.value) }}
                            className="ml-auto text-xs border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="" disabled>Move to…</option>
                            {contacts.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setReassigningId(note.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-stone-300 hover:text-teal-500 dark:text-stone-600 dark:hover:text-teal-400"
                            title="Reassign to different contact"
                          >
                            <UserCheck size={13} />
                          </button>
                        )}
                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={isDeleting}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                        {displayContent}
                      </p>
                      {isLong && (
                        <button
                          onClick={() => toggleExpand(note.id)}
                          className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}

                      <div className="flex items-center gap-3 pt-0.5">
                        {note.note_date && (
                          <span className="text-xs text-stone-400 dark:text-stone-500">
                            {new Date(note.note_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {note.added_by && note.added_by !== 'inbound-email' && (
                          <span className="text-xs text-stone-400 dark:text-stone-500">
                            logged by {note.added_by}
                          </span>
                        )}
                        <span className="text-xs text-stone-300 dark:text-stone-600 ml-auto">
                          {new Date(note.created_at ?? '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {visibleCount < filtered.length && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          <span className="text-xs text-stone-400 dark:text-stone-500">Loading more…</span>
        </div>
      )}
      {visibleCount >= filtered.length && filtered.length > BATCH && (
        <p className="text-center text-xs text-stone-400 dark:text-stone-500 py-4">
          All {filtered.length} entries shown
        </p>
      )}
    </div>
  )
}
