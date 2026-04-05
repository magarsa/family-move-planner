import { useEffect, useState, useRef } from 'react'
import { Loader2, BookOpen, Send, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ScrollToTopButton from '../components/ScrollToTopButton'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
type NoteRow = Tables<'notes'>

import { useUser } from '../hooks/useUser'
import { DEMO_DATA } from '../lib/demoData'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function groupByDate(notes: NoteRow[]): Record<string, NoteRow[]> {
  return notes.reduce<Record<string, NoteRow[]>>((acc, note) => {
    const day = new Date(note.created_at ?? '').toDateString()
    if (!acc[day]) acc[day] = []
    acc[day].push(note)
    return acc
  }, {})
}

const AUTHOR_COLORS: Record<string, string> = {
  Safal: 'bg-teal-100 text-teal-700 dark:bg-teal-800/40 dark:text-teal-200',
  Prativa: 'bg-purple-100 text-purple-700 dark:bg-purple-800/40 dark:text-purple-200',
}

export default function Notes() {
  const { userName, isDemoMode } = useUser()
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function fetchNotes() {
    if (isDemoMode) { setNotes(DEMO_DATA.notes as any); setLoading(false); return }
    const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: true })
    setNotes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotes()
    if (isDemoMode) return
    const ch = supabase.channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchNotes)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes.length])

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function deleteNote(id: string) {
    if (isDemoMode) return
    setNotes(prev => prev.filter(n => n.id !== id))
    setConfirmDelete(null)
    await supabase.from('notes').delete().eq('id', id)
  }

  async function addNote() {
    if (isDemoMode) return
    if (!content.trim()) return
    setSaving(true)
    const newNote = { content: content.trim(), author: userName }
    // Optimistic
    const tempNote: NoteRow = { id: `temp-${Date.now()}`, content: newNote.content, author: newNote.author, created_at: new Date().toISOString() }
    setNotes(prev => [...prev, tempNote])
    setContent('')
    await supabase.from('notes').insert(newNote)
    await fetchNotes()
    setSaving(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      addNote()
    }
  }

  const grouped = groupByDate(notes)
  const days = Object.keys(grouped)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">Session Journal</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1">Running log of notes, decisions, and reflections.</p>
      </div>

      {/* Notes feed */}
      <div className="space-y-6">
        {days.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen size={32} className="mx-auto text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-stone-500 dark:text-stone-400 font-medium">Your journal is empty</p>
            <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">Add your first note below.</p>
          </div>
        ) : (
          days.map(day => (
            <div key={day}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                <span className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide whitespace-nowrap">
                  {formatDate(grouped[day][0].created_at ?? '')}
                </span>
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {grouped[day].map(note => {
                    const isMe = note.author === userName
                    const colorClass = AUTHOR_COLORS[note.author || ''] || 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-2xl ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div className="flex items-center gap-2">
                            {!isMe && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                                {note.author || 'Unknown'}
                              </span>
                            )}
                            <span className="text-xs text-stone-400 dark:text-stone-500">{formatTime(note.created_at ?? '')}</span>
                            {isMe && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                                {note.author}
                              </span>
                            )}
                            {/* Delete control — own notes only */}
                            {isMe && !isDemoMode && (
                              confirmDelete === note.id ? (
                                <span className="flex items-center gap-1.5 text-xs">
                                  <span className="text-stone-400 dark:text-stone-500">Delete?</span>
                                  <button
                                    onClick={() => deleteNote(note.id)}
                                    className="font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  >Yes</button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="font-semibold text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                                  >No</button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setConfirmDelete(note.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400"
                                  title="Delete note"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )
                            )}
                          </div>
                          <div className={`card px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                            isMe
                              ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-100 dark:border-teal-800 text-stone-800 dark:text-stone-100'
                              : 'text-stone-700 dark:text-stone-200'
                          }`}>
                            {note.content}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Add note */}
      <div className="card p-4 sticky bottom-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
            AUTHOR_COLORS[userName || ''] || 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
          }`}>
            {userName === 'Safal' ? '👨' : '👩'}
          </div>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Add a note, observation, or decision summary…"
              rows={2}
              className="textarea-field"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-stone-400 dark:text-stone-500">⌘+Enter to post · Posting as {userName}</span>
              <button
                onClick={addNote}
                disabled={saving || !content.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Post Note
              </button>
            </div>
          </div>
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  )
}
