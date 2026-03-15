import { useEffect, useState, useRef } from 'react'
import { Plus, Check, Trash2, Loader2, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
type TodoRow = Tables<'todos'>
import { useUser } from '../hooks/useUser'

type Tier = 'Do First' | 'Do Soon' | 'Do When Ready' | 'Later'

const TIERS: { id: Tier; emoji: string; label: string; desc: string; color: string; bg: string; ring: string; dot: string }[] = [
  { id: 'Do First',      emoji: '🔴', label: 'Do First',       desc: 'This Month',  color: 'text-red-700',   bg: 'bg-red-50',    ring: 'ring-red-200',   dot: 'bg-red-500' },
  { id: 'Do Soon',       emoji: '🟡', label: 'Do Soon',        desc: 'Month 1–2',   color: 'text-amber-700', bg: 'bg-amber-50',  ring: 'ring-amber-200', dot: 'bg-amber-500' },
  { id: 'Do When Ready', emoji: '🟢', label: 'Do When Ready',  desc: 'Month 2–4',   color: 'text-green-700', bg: 'bg-green-50',  ring: 'ring-green-200', dot: 'bg-green-500' },
  { id: 'Later',         emoji: '🔵', label: 'Later / Ongoing', desc: 'Ongoing',    color: 'text-blue-700',  bg: 'bg-blue-50',   ring: 'ring-blue-200',  dot: 'bg-blue-500' },
]

interface AddingState {
  tier: Tier
  text: string
}

export default function Todos() {
  const { userName } = useUser()
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<AddingState | null>(null)
  const [saving, setSaving] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  async function fetchTodos() {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setTodos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTodos()
    const ch = supabase.channel('todos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, fetchTodos)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  async function toggleTodo(todo: TodoRow) {
    const now = new Date().toISOString()
    const updated = {
      completed: !todo.completed,
      completed_at: !todo.completed ? now : null,
      completed_by: !todo.completed ? userName : null,
    }
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, ...updated } : t))
    await supabase.from('todos').update(updated).eq('id', todo.id)
  }

  async function addTodo() {
    if (!adding || !adding.text.trim()) {
      setAdding(null)
      return
    }
    setSaving(true)
    const newTodo = {
      text: adding.text.trim(),
      tier: adding.tier,
      completed: false,
      completed_at: null,
      completed_by: null,
      branch_id: null,
      created_by: userName,
      sort_order: todos.filter(t => t.tier === adding.tier).length + 1,
    }
    // Optimistic: add with temp id
    const tempId = `temp-${Date.now()}`
    setTodos(prev => [...prev, { ...newTodo, id: tempId, created_at: new Date().toISOString() }])
    setAdding(null)
    await supabase.from('todos').insert(newTodo)
    await fetchTodos() // sync real id
    setSaving(false)
  }

  async function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
    await supabase.from('todos').delete().eq('id', id)
  }

  function startEdit(todo: TodoRow) {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) { setEditingId(null); return }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text: editText.trim() } : t))
    setEditingId(null)
    await supabase.from('todos').update({ text: editText.trim() }).eq('id', id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-stone-900">To-Do List</h1>
        <p className="text-stone-500 mt-1">
          {todos.filter(t => t.completed).length} of {todos.length} tasks complete
        </p>
      </div>

      <div className="space-y-6">
        {TIERS.map(tier => {
          const tierTodos = todos.filter(t => t.tier === tier.id)
          const pending = tierTodos.filter(t => !t.completed)
          const done = tierTodos.filter(t => t.completed)

          return (
            <div key={tier.id} className="card overflow-hidden">
              {/* Tier header */}
              <div className={`px-5 py-3.5 flex items-center justify-between ${tier.bg}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">{tier.emoji}</span>
                  <div>
                    <span className={`font-semibold text-sm ${tier.color}`}>{tier.label}</span>
                    <span className="text-xs text-stone-400 ml-2">{tier.desc}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">{pending.length} pending</span>
                  <button
                    onClick={() => setAdding({ tier: tier.id, text: '' })}
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${tier.color} hover:bg-white/60`}
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>

              {/* Todo items */}
              <div className="divide-y divide-stone-50">
                <AnimatePresence initial={false}>
                  {pending.map(todo => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-3 px-5 py-3.5 group hover:bg-stone-50 transition-colors"
                    >
                      <button
                        onClick={() => toggleTodo(todo)}
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${tier.ring} border-stone-300 hover:border-teal-500`}
                      />
                      {editingId === todo.id ? (
                        <input
                          autoFocus
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onBlur={() => saveEdit(todo.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(todo.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 px-2 py-0.5 text-sm bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      ) : (
                        <span
                          className="flex-1 text-sm text-stone-800 leading-relaxed cursor-text"
                          onDoubleClick={() => startEdit(todo)}
                          title="Double-click to edit"
                        >
                          {todo.text}
                        </span>
                      )}
                      <button
                        onClick={() => startEdit(todo)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-teal-500 transition-all"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add form */}
                <AnimatePresence>
                  {adding?.tier === tier.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 py-3 bg-stone-50 border-t border-stone-100"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          ref={addInputRef}
                          type="text"
                          value={adding.text}
                          onChange={e => setAdding({ ...adding, text: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addTodo()
                            if (e.key === 'Escape') setAdding(null)
                          }}
                          placeholder={`New ${tier.label} task…`}
                          className="flex-1 px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <button onClick={addTodo} disabled={saving} className="btn-primary py-1.5 px-3 text-xs">
                          {saving ? <Loader2 size={13} className="animate-spin" /> : 'Add'}
                        </button>
                        <button onClick={() => setAdding(null)} className="btn-ghost py-1.5 px-3 text-xs">Cancel</button>
                      </div>
                      <p className="text-xs text-stone-400 mt-1.5 ml-1">Press Enter to add · Esc to cancel</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Completed items (collapsed look) */}
                <AnimatePresence initial={false}>
                  {done.map(todo => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-3 px-5 py-3 group hover:bg-stone-50/60 transition-colors"
                    >
                      <button
                        onClick={() => toggleTodo(todo)}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all animate-check-pop ${tier.dot} border-2 border-transparent`}
                      >
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-stone-400 line-through">{todo.text}</span>
                        {todo.completed_by && (
                          <span className="ml-2 text-xs text-stone-300">
                            by {todo.completed_by}
                            {todo.completed_at && ` · ${new Date(todo.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {tierTodos.length === 0 && adding?.tier !== tier.id && (
                  <div className="px-5 py-4 text-sm text-stone-400 italic">
                    No tasks yet —{' '}
                    <button
                      onClick={() => setAdding({ tier: tier.id, text: '' })}
                      className="text-teal-600 hover:underline not-italic"
                    >
                      add one
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
