import { useEffect, useState, useRef } from 'react'
import { Loader2, BookOpen, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
type NoteRow = Tables<'notes'>

import { useUser } from '../hooks/useUser'

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
  Safal: 'bg-teal-100 text-teal-700',
  Prativa: 'bg-purple-100 text-purple-700',
}

export default function Notes() {
  const { userName } = useUser()
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function fetchNotes() {
    const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: true })
    setNotes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotes()
    const ch = supabase.channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchNotes)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes.length])

  async function addNote() {
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
        <h1 className="font-serif text-2xl font-semibold text-stone-900">Session Journal</h1>
        <p className="text-stone-500 mt-1">Running log of notes, decisions, and reflections.</p>
      </div>

      {/* Notes feed */}
      <div className="space-y-6">
        {days.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen size={32} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 font-medium">Your journal is empty</p>
            <p className="text-stone-400 text-sm mt-1">Add your first note below.</p>
          </div>
        ) : (
          days.map(day => (
            <div key={day}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-xs font-medium text-stone-400 uppercase tracking-wide whitespace-nowrap">
                  {formatDate(grouped[day][0].created_at ?? '')}
                </span>
                <div className="h-px flex-1 bg-stone-200" />
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {grouped[day].map(note => {
                    const isMe = note.author === userName
                    const colorClass = AUTHOR_COLORS[note.author || ''] || 'bg-stone-100 text-stone-600'
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-2xl ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div className="flex items-center gap-2">
                            {!isMe && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                                {note.author || 'Unknown'}
                              </span>
                            )}
                            <span className="text-xs text-stone-400">{formatTime(note.created_at ?? '')}</span>
                            {isMe && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                                {note.author}
                              </span>
                            )}
                          </div>
                          <div className={`card px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                            isMe ? 'bg-teal-50 border-teal-100 text-stone-800' : 'text-stone-700'
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
            AUTHOR_COLORS[userName || ''] || 'bg-stone-100 text-stone-600'
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
              <span className="text-xs text-stone-400">⌘+Enter to post · Posting as {userName}</span>
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
    </div>
  )
}
