import { useEffect, useState } from 'react'
import {
  ChevronDown, ChevronUp, Phone, Mail, Globe, Building2,
  Save, Loader2, Trash2, Plus, Link as LinkIcon, X, User,
} from 'lucide-react'
import { METRO_AREAS, METRO_FILTERS } from '../lib/metroAreas'
import type { MetroFilter } from '../lib/metroAreas'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import { useUser } from '../hooks/useUser'

type ContactRow = Tables<'contacts'>
type ContactNoteRow = Tables<'contact_notes'>
type PropertyRow = Tables<'properties'>
type ContactStatus = 'Prospect' | 'Active' | 'Hired' | 'Passed'
type NoteType = 'Note' | 'Call' | 'Email' | 'Meeting' | 'Estimate' | 'Other'

const STATUS_STYLES: Record<ContactStatus, { badge: string; label: string }> = {
  Prospect: { badge: 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300', label: 'Prospect' },
  Active:   { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', label: 'Active' },
  Hired:    { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400', label: 'Hired' },
  Passed:   { badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', label: 'Passed' },
}

const NOTE_TYPE_STYLES: Record<NoteType, string> = {
  Note:     'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
  Call:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Email:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  Meeting:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  Estimate: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Other:    'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400',
}

const ROLE_OPTIONS = [
  'Real Estate Agent',
  'Listing Agent',
  'Mortgage Lender',
  'Home Inspector',
  'Contractor',
  'Moving Company',
  'Real Estate Attorney',
  'Property Manager',
  'Insurance Agent',
  'Bank/Financial',
  'Other',
]

const STATUS_ORDER: ContactStatus[] = ['Prospect', 'Active', 'Hired', 'Passed']

function formatDate(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAmount(amount: number | null) {
  if (amount == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

// ─── ContactCard ────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: ContactRow
  properties: PropertyRow[]
  onUpdate: (id: string, patch: Partial<ContactRow>) => void
  onDelete: (id: string) => void
}

function ContactCard({ contact, properties, onUpdate, onDelete }: ContactCardProps) {
  const { userName } = useUser()
  const [open, setOpen] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState(contact.name)
  const [editRole, setEditRole] = useState(contact.role || '')
  const [phone, setPhone] = useState(contact.phone || '')
  const [email, setEmail] = useState(contact.email || '')
  const [website, setWebsite] = useState(contact.website || '')
  const [company, setCompany] = useState(contact.company || '')
  const [notes, setNotes] = useState(contact.notes || '')
  const [linkedPropertyId, setLinkedPropertyId] = useState(contact.linked_property_id || '')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Conversation log
  const [contactNotes, setContactNotes] = useState<ContactNoteRow[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set())
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  const NOTE_TRUNCATE_AT = 220

  function toggleNoteExpand(id: string) {
    setExpandedNoteIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDeleteNote(id: string) {
    setDeletingNoteId(id)
    await supabase.from('contact_notes').delete().eq('id', id)
    setContactNotes(prev => prev.filter(n => n.id !== id))
    setDeletingNoteId(null)
  }

  // Add note form
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteType, setNoteType] = useState<NoteType>('Note')
  const [noteContent, setNoteContent] = useState('')
  const [noteAmount, setNoteAmount] = useState('')
  const [noteDate, setNoteDate] = useState('')
  const [postingNote, setPostingNote] = useState(false)

  function openNoteForm() {
    const now = new Date()
    // datetime-local format requires "YYYY-MM-DDTHH:mm"
    setNoteDate(now.toISOString().slice(0, 16))
    setShowNoteForm(true)
  }

  useEffect(() => {
    if (!open) return
    setLoadingNotes(true)
    supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contact.id)
      .order('note_date', { ascending: false })
      .then(({ data }) => {
        setContactNotes((data || []) as ContactNoteRow[])
        setLoadingNotes(false)
      })
  }, [open, contact.id])

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true) }
  }

  async function save() {
    setSaving(true)
    const patch: Partial<ContactRow> = {
      name: editName.trim() || contact.name,
      role: editRole || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      company: company || null,
      notes: notes || null,
      linked_property_id: linkedPropertyId || null,
      updated_by: userName,
      updated_at: new Date().toISOString(),
    }
    onUpdate(contact.id, patch)
    await supabase.from('contacts').update(patch).eq('id', contact.id)
    setSaving(false)
    setDirty(false)
  }

  async function setStatus(s: ContactStatus) {
    const patch: Partial<ContactRow> = { status: s, updated_by: userName, updated_at: new Date().toISOString() }
    onUpdate(contact.id, patch)
    await supabase.from('contacts').update(patch).eq('id', contact.id)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${contact.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await supabase.from('contacts').delete().eq('id', contact.id)
    onDelete(contact.id)
  }

  async function postNote() {
    if (!noteContent.trim()) return
    setPostingNote(true)
    const newNote = {
      contact_id: contact.id,
      content: noteContent.trim(),
      note_type: noteType,
      amount: noteAmount ? parseFloat(noteAmount) : null,
      note_date: noteDate ? new Date(noteDate).toISOString() : new Date().toISOString(),
      added_by: userName,
    }
    const { data } = await supabase.from('contact_notes').insert(newNote).select().single()
    if (data) {
      setContactNotes(prev => [data as ContactNoteRow, ...prev])
    }
    setNoteContent('')
    setNoteAmount('')
    setNoteDate('')
    setNoteType('Note')
    setShowNoteForm(false)
    setPostingNote(false)
  }

  const status = (contact.status as ContactStatus) ?? 'Active'
  const style = STATUS_STYLES[status]
  const linkedProperty = properties.find(p => p.id === contact.linked_property_id)

  return (
    <div className={`card overflow-hidden transition-shadow ${open ? 'shadow-md' : ''}`}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`status-badge ${style.badge} flex-shrink-0`}>{style.label}</span>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-800 dark:text-stone-100 leading-tight">{contact.name}</div>
          {contact.company && (
            <div className="text-xs text-stone-400 dark:text-stone-500 truncate">{contact.company}</div>
          )}
        </div>

        {contact.role && (
          <span className="hidden sm:block text-xs px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex-shrink-0">
            {contact.role}
          </span>
        )}

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-teal-600 transition-colors"
            >
              <Phone size={11} /> {contact.phone}
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-teal-600 transition-colors"
            >
              <Mail size={11} />
            </a>
          )}
        </div>

        {open ? <ChevronUp size={16} className="text-stone-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-stone-400 flex-shrink-0" />}
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-stone-100 dark:border-stone-800 px-5 py-5 space-y-5">

              {/* Status flow */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Status</div>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_ORDER.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`status-badge cursor-pointer transition-all hover:scale-105 ${STATUS_STYLES[s].badge} ${
                        status === s ? 'ring-2 ring-offset-1 ring-teal-400' : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {STATUS_STYLES[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Name</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={editName}
                      onChange={e => markDirty(setEditName)(e.target.value)}
                      placeholder="Full name"
                      className="input-field pl-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={e => markDirty(setEditRole)(e.target.value)}
                    className="select-field text-sm"
                  >
                    <option value="">— Select role —</option>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Phone</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => markDirty(setPhone)(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="input-field pl-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Email</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => markDirty(setEmail)(e.target.value)}
                      placeholder="name@company.com"
                      className="input-field pl-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Website</label>
                  <div className="relative">
                    <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="url"
                      value={website}
                      onChange={e => markDirty(setWebsite)(e.target.value)}
                      placeholder="https://..."
                      className="input-field pl-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Company</label>
                  <div className="relative">
                    <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={company}
                      onChange={e => markDirty(setCompany)(e.target.value)}
                      placeholder="Firm or company name"
                      className="input-field pl-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Link to property */}
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">
                  Linked Property
                </label>
                <div className="relative">
                  <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <select
                    value={linkedPropertyId}
                    onChange={e => markDirty(setLinkedPropertyId)(e.target.value)}
                    className="select-field pl-8 text-sm"
                  >
                    <option value="">— None —</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.address}{p.area ? ` (${p.area})` : ''}</option>
                    ))}
                  </select>
                </div>
                {linkedProperty && (
                  <div className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                    Linked to: <span className="text-teal-600 dark:text-teal-400">{linkedProperty.address}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => markDirty(setNotes)(e.target.value)}
                  placeholder="General notes about this contact…"
                  rows={2}
                  className="textarea-field text-sm"
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

              {/* Conversation log */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Conversation Log</div>
                  <button
                    onClick={() => showNoteForm ? setShowNoteForm(false) : openNoteForm()}
                    className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium"
                  >
                    {showNoteForm ? <X size={12} /> : <Plus size={12} />}
                    {showNoteForm ? 'Cancel' : 'Add Note'}
                  </button>
                </div>

                {/* Add note form */}
                <AnimatePresence initial={false}>
                  {showNoteForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-4 mb-3 space-y-3">
                        <div className="flex gap-3">
                          <div className="w-36">
                            <select
                              value={noteType}
                              onChange={e => setNoteType(e.target.value as NoteType)}
                              className="select-field text-sm"
                            >
                              {(['Note', 'Call', 'Email', 'Meeting', 'Estimate', 'Other'] as NoteType[]).map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          {noteType === 'Estimate' && (
                            <div className="w-36">
                              <input
                                type="number"
                                value={noteAmount}
                                onChange={e => setNoteAmount(e.target.value)}
                                placeholder="Amount $"
                                min="0"
                                className="input-field text-sm"
                              />
                            </div>
                          )}
                          <div className="w-52">
                            <input
                              type="datetime-local"
                              value={noteDate}
                              onChange={e => setNoteDate(e.target.value)}
                              className="input-field text-sm"
                              title="Date & time of correspondence"
                            />
                          </div>
                        </div>
                        <textarea
                          value={noteContent}
                          onChange={e => setNoteContent(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote() }}
                          placeholder="What happened? Write a summary…"
                          rows={3}
                          className="textarea-field text-sm"
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-stone-400">⌘ + Enter to post</span>
                          <button
                            onClick={postNote}
                            disabled={postingNote || !noteContent.trim()}
                            className="btn-primary text-sm"
                          >
                            {postingNote ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                            Post
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Notes list */}
                {loadingNotes ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-stone-400" />
                  </div>
                ) : contactNotes.length === 0 ? (
                  <p className="text-sm text-stone-400 dark:text-stone-500 italic py-2">
                    No notes yet. Log a call, estimate, or conversation above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactNotes.map(n => {
                      const isLong     = (n.content?.length ?? 0) > NOTE_TRUNCATE_AT
                      const isExpanded = expandedNoteIds.has(n.id)
                      const isDeleting = deletingNoteId === n.id
                      const displayContent = isLong && !isExpanded
                        ? n.content.slice(0, NOTE_TRUNCATE_AT) + '…'
                        : n.content
                      return (
                        <div key={n.id} className="group flex gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                          <div className="flex-shrink-0 pt-0.5">
                            <span className={`status-badge text-xs ${NOTE_TYPE_STYLES[(n.note_type as NoteType) ?? 'Note']}`}>
                              {n.note_type ?? 'Note'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                              {displayContent}
                            </div>
                            {isLong && (
                              <button
                                onClick={() => toggleNoteExpand(n.id)}
                                className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-0.5"
                              >
                                {isExpanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                            {n.amount != null && (
                              <div className="mt-1 text-sm font-semibold text-green-600 dark:text-green-400">
                                {formatAmount(n.amount)}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                              {formatDate(n.note_date)}{n.added_by ? ` · ${n.added_by}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteNote(n.id)}
                            disabled={isDeleting}
                            className="opacity-0 group-hover:opacity-100 transition-opacity self-start mt-0.5 text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 disabled:opacity-50"
                            title="Delete note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Delete */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete contact
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Add Contact Form ────────────────────────────────────────────────────────

interface AddContactFormProps {
  onAdd: (contact: ContactRow) => void
  onCancel: () => void
}

function AddContactForm({ onAdd, onCancel }: AddContactFormProps) {
  const { userName } = useUser()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [roleCustom, setRoleCustom] = useState('')
  const [saving, setSaving] = useState(false)

  const effectiveRole = role === 'Other' ? roleCustom : role

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('contacts')
      .insert({
        name: name.trim(),
        role: effectiveRole || null,
        status: 'Active',
        added_by: userName,
      })
      .select()
      .single()
    if (data) onAdd(data as ContactRow)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">Add Contact</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="John Smith"
            required
            autoFocus
            className="input-field text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="select-field text-sm"
          >
            <option value="">— Select role —</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {role === 'Other' && (
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 block mb-1">Custom role</label>
            <input
              type="text"
              value={roleCustom}
              onChange={e => setRoleCustom(e.target.value)}
              placeholder="e.g. Electrician"
              className="input-field text-sm"
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add Contact
        </button>
      </div>
    </form>
  )
}

// ─── Contacts View ───────────────────────────────────────────────────────────

export default function Contacts() {
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [metroFilter, setMetroFilter] = useState<MetroFilter>('All')

  async function fetchContacts() {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: true })
    setContacts((data || []) as ContactRow[])
    setLoading(false)
  }

  useEffect(() => {
    fetchContacts()
    supabase.from('properties').select('id, address, area').then(({ data }) => {
      setProperties((data || []) as PropertyRow[])
    })
    const ch = supabase.channel('contacts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, fetchContacts)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function handleUpdate(id: string, patch: Partial<ContactRow>) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function handleDelete(id: string) {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  function handleAdd(contact: ContactRow) {
    setContacts(prev => [...prev, contact])
    setShowAddForm(false)
  }

  // Unique roles from existing contacts for filter dropdown
  const roles = Array.from(new Set(contacts.map(c => c.role).filter(Boolean))) as string[]

  const propAreaMap = Object.fromEntries(properties.map(p => [p.id, p.area || '']))

  const filtered = contacts.filter(c => {
    if (filterRole && c.role !== filterRole) return false
    if (filterStatus && c.status !== filterStatus) return false
    if (metroFilter !== 'All') {
      const area = c.linked_property_id ? propAreaMap[c.linked_property_id] : ''
      if (!METRO_AREAS[metroFilter]?.includes(area)) return false
    }
    return true
  })

  const counts: Record<ContactStatus, number> = {
    Prospect: contacts.filter(c => c.status === 'Prospect').length,
    Active:   contacts.filter(c => c.status === 'Active').length,
    Hired:    contacts.filter(c => c.status === 'Hired').length,
    Passed:   contacts.filter(c => c.status === 'Passed').length,
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">Contacts</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">
            Agents, lenders, movers, and everyone involved in your move.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <span className={`status-badge ${STATUS_STYLES.Active.badge}`}>{counts.Active} Active</span>
          <span className={`status-badge ${STATUS_STYLES.Hired.badge}`}>{counts.Hired} Hired</span>
        </div>
      </div>

      {/* Metro filter */}
      <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 w-fit">
        {METRO_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setMetroFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              metroFilter === f
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Filters + Add button */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="select-field text-sm w-auto"
        >
          <option value="">All roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="select-field text-sm w-auto"
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="btn-primary"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence initial={false}>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AddContactForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-stone-400 dark:text-stone-500">
              {contacts.length === 0
                ? 'No contacts yet. Add your real estate agent, lender, or anyone involved in your move.'
                : 'No contacts match the current filters.'}
            </p>
          </div>
        ) : (
          filtered.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              properties={properties}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
