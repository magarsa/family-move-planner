import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Check, Circle, Clock, Eye, DollarSign, GraduationCap, Home, Loader2, MapPin, Save, ShoppingCart, Sparkles, Trash2, Plus, X, ExternalLink, Calendar, Pencil } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Tables, Json } from '../types/database'
import type { AiAnalysis } from '../types/analysis'
import { useUser } from '../hooks/useUser'
import AiAnalysisPanel from '../components/AiAnalysisPanel'
import { lookupProperty } from '../lib/lookupProperty'
import type { ProximityData, NearbySchool } from '../lib/lookupProperty'
import { METRO_AREAS, AREA_OPTIONS, METRO_FILTERS } from '../lib/metroAreas'
import type { MetroFilter } from '../lib/metroAreas'

type PropertyRow = Tables<'properties'>
type BranchRow = Tables<'branches'>
type SchoolRow = Tables<'schools'>

type PropertyStatus = 'Considering' | 'Visit Scheduled' | 'Visited' | 'Offer Made' | 'Ruled Out' | 'Secured'

const STATUS_STYLES: Record<PropertyStatus, { badge: string; icon: ReactNode; label: string }> = {
  'Considering':     { badge: 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-300',   icon: <Circle size={12} />,   label: 'Considering' },
  'Visit Scheduled': { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',    icon: <Calendar size={12} />, label: 'Visit Scheduled' },
  'Visited':         { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: <Eye size={12} />,      label: 'Visited' },
  'Offer Made':      { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: <DollarSign size={12} />, label: 'Offer Made' },
  'Ruled Out':       { badge: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',         icon: <X size={12} />,        label: 'Ruled Out' },
  'Secured':         { badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',     icon: <Check size={12} />,    label: 'Secured' },
}

function formatPrice(price: number | null) {
  if (!price) return null
  return '$' + price.toLocaleString()
}

function formatVisitDate(dt: string | null) {
  if (!dt) return null
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function buildZillowUrl(property: PropertyRow): string {
  if (property.zillow_url) return property.zillow_url
  const slug = property.address.replace(/,/g, '').replace(/\s+/g, '-')
  return `https://www.zillow.com/homes/${encodeURIComponent(slug)}_rb/`
}

// ─── School upsert helper ─────────────────────────────────────────────────────

async function upsertAndLinkSchools(propertyId: string, nearbySchools: NearbySchool[], area: string | null) {
  for (const school of nearbySchools) {
    try {
      // Find existing school by name (case-insensitive exact match — no wildcards)
      const { data: results } = await supabase
        .from('schools')
        .select('id')
        .ilike('name', school.name)
        .limit(1)

      let schoolId: string
      const existing = results?.[0] as { id: string } | undefined

      if (existing?.id) {
        schoolId = existing.id
      } else {
        const types = school.types || []
        const { data: inserted } = await supabase
          .from('schools')
          .insert({
            name: school.name,
            school_type: 'Public',
            grades: types.includes('primary_school') ? 'K-5' : types.includes('secondary_school') ? '9-12' : null,
            area: area || null,
            notes: school.vicinity || null,
            status: 'Researching',
          })
          .select('id')
          .single()
        if (!inserted?.id) continue
        schoolId = inserted.id
      }

      await supabase.from('property_schools').upsert({ property_id: propertyId, school_id: schoolId })
    } catch { /* skip individual failures */ }
  }
}

// ─── Area Snapshot ───────────────────────────────────────────────────────────

function walkScoreColor(score: number) {
  if (score >= 70) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-stone-500 dark:text-stone-400'
}

function AreaSnapshot({ proximity }: { proximity: ProximityData }) {
  const rows: { icon: string; label: string; content: string }[] = []

  if (proximity.grocery.length > 0) {
    rows.push({ icon: '🛒', label: 'Grocery', content: proximity.grocery.map(p => `${p.name} ${p.distanceMi}mi`).join(' · ') })
  }
  if (proximity.pharmacy.length > 0) {
    rows.push({ icon: '💊', label: 'Pharmacy', content: proximity.pharmacy.map(p => `${p.name} ${p.distanceMi}mi`).join(' · ') })
  }
  if (proximity.parks.length > 0) {
    rows.push({ icon: '🌳', label: 'Parks', content: proximity.parks.map(p => `${p.name} ${p.distanceMi}mi`).join(' · ') })
  }
  if (proximity.dining.length > 0) {
    rows.push({ icon: '🍽', label: 'Dining', content: `${proximity.dining.length > 1 ? 'Multiple options' : proximity.dining[0].name} within ${proximity.dining[0].distanceMi}mi` })
  }
  if (proximity.shopping.length > 0) {
    rows.push({ icon: '🛍', label: 'Shopping', content: proximity.shopping.map(p => `${p.name} ${p.distanceMi}mi`).join(' · ') })
  }

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.label} className="flex gap-2 text-xs">
          <span className="flex-shrink-0 w-20 text-stone-500 dark:text-stone-400 flex items-center gap-1">
            {r.icon} {r.label}
          </span>
          <span className="text-stone-700 dark:text-stone-300 leading-relaxed">{r.content}</span>
        </div>
      ))}

      {proximity.walkScore && (
        <div className="flex gap-2 text-xs">
          <span className="flex-shrink-0 w-20 text-stone-500 dark:text-stone-400 flex items-center gap-1">
            🚶 Walk
          </span>
          <span className="flex items-center gap-2">
            <span className={`font-semibold ${walkScoreColor(proximity.walkScore.walk)}`}>{proximity.walkScore.walk}</span>
            {proximity.walkScore.bike > 0 && <span className={`font-semibold ${walkScoreColor(proximity.walkScore.bike)}`}>🚲 {proximity.walkScore.bike}</span>}
            <span className="text-stone-500 dark:text-stone-400">{proximity.walkScore.description}</span>
          </span>
        </div>
      )}

      {proximity.floodZone && (
        <div className="flex gap-2 text-xs">
          <span className="flex-shrink-0 w-20 text-stone-500 dark:text-stone-400 flex items-center gap-1">
            🌊 Flood
          </span>
          <span className={`${proximity.floodZone.zone === 'X' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            Zone {proximity.floodZone.zone} — {proximity.floodZone.description}
          </span>
        </div>
      )}

      {proximity.hazards.length > 0 ? (
        <div className="flex gap-2 text-xs">
          <span className="flex-shrink-0 w-20 text-stone-500 dark:text-stone-400 flex items-center gap-1">
            ⚠️ Hazards
          </span>
          <span className="text-amber-700 dark:text-amber-400">
            {proximity.hazards.map(h => `${h.name} (${h.distanceMi}mi)`).join(' · ')}
          </span>
        </div>
      ) : (
        <div className="flex gap-2 text-xs">
          <span className="flex-shrink-0 w-20 text-stone-500 dark:text-stone-400 flex items-center gap-1">
            ⚠️ Hazards
          </span>
          <span className="text-green-600 dark:text-green-400">None within 1 mile</span>
        </div>
      )}
    </div>
  )
}

// ─── PropertyCard ────────────────────────────────────────────────────────────

interface PropertyCardProps {
  property: PropertyRow
  branches: BranchRow[]
  schools: SchoolRow[]
  onUpdate: (id: string, patch: Partial<PropertyRow>) => void
  onDelete: (id: string) => void
}

function PropertyCard({ property, branches, schools, onUpdate, onDelete }: PropertyCardProps) {
  const { userName } = useUser()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editNotes, setEditNotes] = useState(property.notes || '')
  const [editVisitNotes, setEditVisitNotes] = useState(property.visit_notes || '')
  const [scheduleDate, setScheduleDate] = useState(property.visit_at ? property.visit_at.slice(0, 16) : '')
  const [schedulingVisit, setSchedulingVisit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Core field editing
  const [editingCore, setEditingCore] = useState(false)
  const [editAddress, setEditAddress] = useState(property.address)
  const [editArea, setEditArea] = useState(property.area || '')
  const [editPrice, setEditPrice] = useState(property.price ? String(property.price) : '')
  const [editBeds, setEditBeds] = useState(property.beds ? String(property.beds) : '')
  const [editBaths, setEditBaths] = useState(property.baths ? String(property.baths) : '')
  const [editSqft, setEditSqft] = useState(property.sqft ? String(property.sqft) : '')
  const [editZillowUrl, setEditZillowUrl] = useState(property.zillow_url || '')
  const [savingCore, setSavingCore] = useState(false)
  const [linkedSchools, setLinkedSchools] = useState<SchoolRow[]>([])
  const [schoolsLoaded, setSchoolsLoaded] = useState(false)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  const status = (property.status || 'Considering') as PropertyStatus
  const style = STATUS_STYLES[status]
  const analysis = property.ai_analysis as unknown as AiAnalysis | null

  async function save() {
    setSaving(true)
    const patch: Partial<PropertyRow> = {
      notes: editNotes || null,
      visit_notes: editVisitNotes || null,
      updated_by: userName,
      updated_at: new Date().toISOString(),
    }
    onUpdate(property.id, patch)
    await supabase.from('properties').update(patch).eq('id', property.id)
    setSaving(false)
    setDirty(false)
  }

  async function saveCore() {
    if (!editAddress.trim()) return
    setSavingCore(true)
    const patch: Partial<PropertyRow> = {
      address: editAddress.trim(),
      area: editArea || null,
      price: editPrice ? parseInt(editPrice.replace(/\D/g, '')) : null,
      beds: editBeds ? parseInt(editBeds) : null,
      baths: editBaths ? parseFloat(editBaths) : null,
      sqft: editSqft ? parseInt(editSqft.replace(/\D/g, '')) : null,
      zillow_url: editZillowUrl || null,
      updated_by: userName,
      updated_at: new Date().toISOString(),
    }
    onUpdate(property.id, patch)
    await supabase.from('properties').update(patch).eq('id', property.id)
    setSavingCore(false)
    setEditingCore(false)
  }

  async function setStatus(s: PropertyStatus) {
    const patch: Partial<PropertyRow> = { status: s, updated_by: userName, updated_at: new Date().toISOString() }
    onUpdate(property.id, patch)
    await supabase.from('properties').update(patch).eq('id', property.id)
  }

  async function scheduleVisit() {
    if (!scheduleDate) return
    setSchedulingVisit(true)
    const visitAt = new Date(scheduleDate).toISOString()
    const patch: Partial<PropertyRow> = {
      visit_at: visitAt,
      status: 'Visit Scheduled',
      updated_by: userName,
      updated_at: new Date().toISOString(),
    }
    onUpdate(property.id, patch)
    await supabase.from('properties').update(patch).eq('id', property.id)
    // Auto-create a todo
    await supabase.from('todos').insert({
      text: `Visit: ${property.address}`,
      tier: 'Do First',
      branch_id: property.branch_id || null,
      created_by: userName,
    })
    setSchedulingVisit(false)
  }

  async function linkBranch(branchId: string | null) {
    const patch: Partial<PropertyRow> = { branch_id: branchId, updated_by: userName, updated_at: new Date().toISOString() }
    onUpdate(property.id, patch)
    await supabase.from('properties').update(patch).eq('id', property.id)
  }

  async function fetchLinkedSchools() {
    const { data: links } = await supabase
      .from('property_schools')
      .select('school_id')
      .eq('property_id', property.id)
    if (links && links.length > 0) {
      const ids = links.map((r: { school_id: string }) => r.school_id)
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, school_type, grades, area, district')
        .in('id', ids)
        .order('name')
      setLinkedSchools((schoolData || []) as SchoolRow[])
    } else {
      setLinkedSchools([])
    }
    setSchoolsLoaded(true)
  }

  async function linkSchool(schoolId: string) {
    await supabase.from('property_schools').insert({ property_id: property.id, school_id: schoolId })
    const school = schools.find(s => s.id === schoolId)
    if (school) setLinkedSchools(prev => [...prev, school])
  }

  async function unlinkSchool(schoolId: string) {
    await supabase.from('property_schools')
      .delete()
      .eq('property_id', property.id)
      .eq('school_id', schoolId)
    setLinkedSchools(prev => prev.filter(s => s.id !== schoolId))
  }

  useEffect(() => {
    if (open && !schoolsLoaded) fetchLinkedSchools()
  }, [open])

  async function handleDelete() {
    if (!confirm(`Remove "${property.address}" from your list?`)) return
    setDeleting(true)
    onDelete(property.id)
    await supabase.from('properties').delete().eq('id', property.id)
  }

  async function handleLoadSnapshot() {
    setLoadingSnapshot(true)
    try {
      const result = await lookupProperty(property.address)
      if (result.proximity) {
        await supabase
          .from('properties')
          .update({ proximity: result.proximity as unknown as Json })
          .eq('id', property.id)
        onUpdate(property.id, { proximity: result.proximity as unknown as typeof property.proximity })
        // Link schools that came back with the snapshot
        if (result.proximity.schools.length > 0) {
          await upsertAndLinkSchools(property.id, result.proximity.schools, property.area || null)
          // Re-fetch linked schools so the UI reflects the new links
          await fetchLinkedSchools()
        }
      }
    } catch (err) {
      console.error('Failed to load area snapshot', err)
    } finally {
      setLoadingSnapshot(false)
    }
  }

  const linkedBranch = branches.find(b => b.id === property.branch_id)
  const isVisitPast = property.visit_at ? new Date(property.visit_at) < new Date() : false

  return (
    <div className={`card overflow-hidden transition-shadow ${open ? 'shadow-md' : ''}`}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`status-badge ${style.badge} flex items-center gap-1 flex-shrink-0`}>
          {style.icon} {style.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-stone-800 dark:text-stone-100 truncate">{property.address}</div>
          {property.area && (
            <div className="text-xs text-stone-400 dark:text-stone-500">{property.area}</div>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {property.price && (
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{formatPrice(property.price)}</span>
          )}
          {property.beds && (
            <span className="text-xs text-stone-400">{property.beds}bd</span>
          )}
          {property.sqft && (
            <span className="text-xs text-stone-400">{property.sqft.toLocaleString()} sqft</span>
          )}
          {property.visit_at && !isVisitPast && (
            <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg">
              {formatVisitDate(property.visit_at)}
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
        <a
          href={buildZillowUrl(property)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          title="View on Zillow"
          className="flex-shrink-0 p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors"
        >
          <ExternalLink size={14} />
        </a>
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
              {/* Property details — view or edit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Property Details</div>
                  <button
                    onClick={() => setEditingCore(!editingCore)}
                    className="flex items-center gap-1 text-xs text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  >
                    {editingCore ? <><X size={11} /> Cancel</> : <><Pencil size={11} /> Edit</>}
                  </button>
                </div>
                {editingCore ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Address</label>
                      <input value={editAddress} onChange={e => setEditAddress(e.target.value)} className="input-field mt-1 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Area</label>
                        <select value={editArea} onChange={e => setEditArea(e.target.value)} className="input-field mt-1 text-sm">
                          <option value="">— Select area —</option>
                          {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Asking Price</label>
                        <input value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="$525,000" className="input-field mt-1 text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Beds</label>
                        <input type="number" min="0" value={editBeds} onChange={e => setEditBeds(e.target.value)} placeholder="4" className="input-field mt-1 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Baths</label>
                        <input type="number" min="0" step="0.5" value={editBaths} onChange={e => setEditBaths(e.target.value)} placeholder="2.5" className="input-field mt-1 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Sq Ft</label>
                        <input value={editSqft} onChange={e => setEditSqft(e.target.value)} placeholder="2,400" className="input-field mt-1 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Zillow URL</label>
                      <input type="url" value={editZillowUrl} onChange={e => setEditZillowUrl(e.target.value)} placeholder="https://zillow.com/..." className="input-field mt-1 text-sm" />
                    </div>
                    <button onClick={saveCore} disabled={savingCore || !editAddress.trim()} className="btn-primary">
                      {savingCore ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save details
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {property.price && <span className="status-badge bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">💰 {formatPrice(property.price)}</span>}
                    {property.beds && <span className="status-badge bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">🛏 {property.beds} bed</span>}
                    {property.baths && <span className="status-badge bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">🚿 {property.baths} bath</span>}
                    {property.sqft && <span className="status-badge bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">📐 {property.sqft.toLocaleString()} sqft</span>}
                    <a
                      href={buildZillowUrl(property)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="status-badge bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1 hover:opacity-80"
                    >
                      <ExternalLink size={10} /> Zillow
                    </a>
                  </div>
                )}
              </div>

              {/* Status selector */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Status</div>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_STYLES) as PropertyStatus[]).map(s => (
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

              {/* Schedule visit */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Schedule Visit</div>
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="input-field text-sm py-1.5 flex-1 min-w-40"
                  />
                  <button
                    onClick={scheduleVisit}
                    disabled={!scheduleDate || schedulingVisit}
                    className="btn-primary py-1.5 text-sm flex-shrink-0"
                  >
                    {schedulingVisit ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
                    {property.visit_at ? 'Reschedule' : 'Schedule + Add Todo'}
                  </button>
                </div>
                {property.visit_at && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                    Currently: {formatVisitDate(property.visit_at)}
                  </p>
                )}
              </div>

              {/* Visit notes (show once visited or visit is past) */}
              {(status === 'Visited' || isVisitPast) && (
                <div>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Visit Notes</div>
                  <textarea
                    value={editVisitNotes}
                    onChange={e => { setEditVisitNotes(e.target.value); setDirty(true) }}
                    placeholder="How did the visit go? What stood out?"
                    rows={3}
                    className="textarea-field"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Notes</div>
                <textarea
                  value={editNotes}
                  onChange={e => { setEditNotes(e.target.value); setDirty(true) }}
                  placeholder="School zone, neighborhood feel, anything worth noting…"
                  rows={3}
                  className="textarea-field"
                />
              </div>

              {/* Nearby Schools */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <GraduationCap size={12} /> Nearby Schools
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {linkedSchools.map(school => (
                    <span
                      key={school.id}
                      className="inline-flex items-center gap-1.5 text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-lg"
                    >
                      <span>{school.name}</span>
                      {school.school_type && (
                        <span className="opacity-60">· {school.school_type}</span>
                      )}
                      <button
                        onClick={() => navigate(`/schools?open=${school.id}`)}
                        className="ml-0.5 hover:text-teal-500 transition-colors"
                        title="View school record"
                      >
                        <ExternalLink size={10} />
                      </button>
                      <button
                        onClick={() => unlinkSchool(school.id)}
                        className="hover:text-red-400 transition-colors"
                        title="Remove link"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {linkedSchools.length === 0 && schoolsLoaded && (
                    <span className="text-xs text-stone-400 dark:text-stone-500">No schools linked yet</span>
                  )}
                </div>
                {schools.filter(s => !linkedSchools.find(l => l.id === s.id)).length > 0 && (
                  <select
                    value=""
                    onChange={e => { if (e.target.value) linkSchool(e.target.value) }}
                    className="input-field text-sm"
                  >
                    <option value="">+ Link a school…</option>
                    {schools
                      .filter(s => !linkedSchools.find(l => l.id === s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.school_type ? ` (${s.school_type})` : ''}{s.area ? ` — ${s.area}` : ''}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Link to decision branch */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Link to Decision</div>
                <select
                  value={property.branch_id || ''}
                  onChange={e => linkBranch(e.target.value || null)}
                  className="input-field text-sm"
                >
                  <option value="">— None —</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
                {linkedBranch && (
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                    Linked: {linkedBranch.title} ({linkedBranch.status})
                  </p>
                )}
              </div>

              {/* Area Snapshot */}
              <div>
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MapPin size={12} /> Area Snapshot
                </div>
                {property.proximity ? (
                  <AreaSnapshot proximity={property.proximity as unknown as ProximityData} />
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-stone-400 dark:text-stone-500">No area data yet.</p>
                    <button
                      onClick={handleLoadSnapshot}
                      disabled={loadingSnapshot}
                      className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 disabled:opacity-50 transition-colors"
                    >
                      {loadingSnapshot
                        ? <><Loader2 size={12} className="animate-spin" /> Loading…</>
                        : <><MapPin size={12} /> Load area snapshot</>}
                    </button>
                  </div>
                )}
              </div>

              {/* AI Analysis Panel */}
              <AiAnalysisPanel
                entityType="property"
                entityId={property.id}
                entityData={property as unknown as Record<string, unknown>}
                analysis={analysis}
                onAnalysisComplete={(a) => onUpdate(property.id, { ai_analysis: a as unknown as typeof property.ai_analysis })}
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

// ─── Add Property Form ────────────────────────────────────────────────────────

interface AddPropertyFormProps {
  onAdd: (property: PropertyRow) => void
  onClose: () => void
}

function AddPropertyForm({ onAdd, onClose }: AddPropertyFormProps) {
  const { userName } = useUser()
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [sqft, setSqft] = useState('')
  const [notes, setNotes] = useState('')
  const [zillowUrl, setZillowUrl] = useState('')
  const [pendingProximity, setPendingProximity] = useState<ProximityData | null>(null)
  const [autofilling, setAutofilling] = useState(false)
  const [autofillErr, setAutofillErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  // Detect Zillow URL paste and extract address from URL
  function handleAddressChange(value: string) {
    setAddress(value)
    setErr('')
    setAutofillErr('')
    // If user pastes a Zillow URL, extract address slug and normalize it
    if (value.includes('zillow.com')) {
      const match = value.match(/zillow\.com\/homedetails\/([^/]+)/)
      if (match) {
        const slug = decodeURIComponent(match[1]).replace(/-\d+_zpid$/, '').replace(/-/g, ' ')
        setAddress(slug)
      }
    }
  }

  async function autofill() {
    if (!address.trim()) return
    setAutofilling(true)
    setAutofillErr('')
    try {
      const result = await lookupProperty(address.trim())
      const { autofill: af, proximity } = result
      if (af.beds != null) setBeds(String(af.beds))
      if (af.baths != null) setBaths(String(af.baths))
      if (af.sqft != null) setSqft(String(af.sqft))
      if (af.price != null) setPrice(String(af.price))
      if (af.area) setArea(af.area)
      if (af.zillow_url) setZillowUrl(af.zillow_url)
      if (af.notes_prefix) setNotes(af.notes_prefix)
      if (proximity) setPendingProximity(proximity)
    } catch (e) {
      setAutofillErr(e instanceof Error ? e.message : 'Lookup failed — fill fields manually')
    }
    setAutofilling(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) { setErr('Address is required'); return }
    setSubmitting(true)
    const { data, error } = await supabase.from('properties').insert({
      address: address.trim(),
      area: area || null,
      price: price ? parseInt(price.replace(/\D/g, '')) : null,
      beds: beds ? parseInt(beds) : null,
      baths: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft.replace(/\D/g, '')) : null,
      zillow_url: zillowUrl || null,
      notes: notes || null,
      proximity: pendingProximity as unknown as Json,
      status: 'Considering',
      added_by: userName,
      updated_by: userName,
    }).select().single()
    if (error) { setErr(error.message); setSubmitting(false); return }

    // Link nearby schools directly — no need for a second API call
    if (pendingProximity?.schools.length && data?.id) {
      await upsertAndLinkSchools(data.id, pendingProximity.schools, area || null)
    }

    onAdd(data as PropertyRow)
    onClose()
  }

  const showAutofill = address.trim().length >= 15

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-stone-800 dark:text-stone-100">Add Property</h3>
        <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Address *</label>
          <div className="flex gap-2 mt-1">
            <input
              autoFocus
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              placeholder="123 Gold Hill Rd, Fort Mill, SC 29708 — or paste a Zillow URL"
              className="input-field flex-1"
            />
            {showAutofill && (
              <button
                type="button"
                onClick={autofill}
                disabled={autofilling}
                className="btn-primary flex-shrink-0 text-sm py-1.5"
                title="Auto-fill from listing data"
              >
                {autofilling
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Sparkles size={13} />
                }
                {autofilling ? 'Looking up…' : 'Autofill'}
              </button>
            )}
          </div>
          {autofillErr && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{autofillErr}</p>}
          {pendingProximity && !autofillErr && (
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
              <ShoppingCart size={10} /> Area snapshot + {pendingProximity.schools.length} nearby schools ready
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Area</label>
            <select value={area} onChange={e => setArea(e.target.value)} className="input-field mt-1 text-sm">
              <option value="">— Select area —</option>
              {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Asking Price</label>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="$525,000" className="input-field mt-1 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Beds</label>
            <input type="number" min="0" value={beds} onChange={e => setBeds(e.target.value)} placeholder="4" className="input-field mt-1 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Baths</label>
            <input type="number" min="0" step="0.5" value={baths} onChange={e => setBaths(e.target.value)} placeholder="2.5" className="input-field mt-1 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Sq Ft</label>
            <input value={sqft} onChange={e => setSqft(e.target.value)} placeholder="2,400" className="input-field mt-1 text-sm" />
          </div>
        </div>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add Property
        </button>
      </div>
    </form>
  )
}

// ─── Properties Page ──────────────────────────────────────────────────────────

export default function Properties() {
  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'All'>('All')
  const [metroFilter, setMetroFilter] = useState<MetroFilter>('All')

  async function fetchProperties() {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    setProperties((data || []) as PropertyRow[])
    setLoading(false)
  }

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, title, status').order('sort_order')
    setBranches((data || []) as BranchRow[])
  }

  async function fetchSchools() {
    const { data } = await supabase
      .from('schools')
      .select('id, name, school_type, grades, area, district')
      .order('name')
    setSchools((data || []) as SchoolRow[])
  }

  useEffect(() => {
    fetchProperties()
    fetchBranches()
    fetchSchools()
    const ch = supabase.channel('properties-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, fetchProperties)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function handleUpdate(id: string, patch: Partial<PropertyRow>) {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  function handleDelete(id: string) {
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  function handleAdd(property: PropertyRow) {
    setProperties(prev => [property, ...prev])
  }

  const filtered = properties.filter(p =>
    (statusFilter === 'All' || p.status === statusFilter) &&
    (metroFilter === 'All' || METRO_AREAS[metroFilter]?.includes(p.area || ''))
  )

  const counts = {
    Considering: properties.filter(p => p.status === 'Considering' || !p.status).length,
    'Visit Scheduled': properties.filter(p => p.status === 'Visit Scheduled').length,
    Visited: properties.filter(p => p.status === 'Visited').length,
    'Offer Made': properties.filter(p => p.status === 'Offer Made').length,
    'Ruled Out': properties.filter(p => p.status === 'Ruled Out').length,
    Secured: properties.filter(p => p.status === 'Secured').length,
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
            <Home size={22} className="text-teal-600" /> Properties
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1">Track houses you're considering.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={14} /> Add Property
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
            <AddPropertyForm onAdd={handleAdd} onClose={() => setShowAdd(false)} />
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Status summary chips + filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('All')}
          className={`status-badge cursor-pointer transition-all hover:scale-105 bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300 ${statusFilter === 'All' ? 'ring-2 ring-offset-1 ring-teal-400' : 'opacity-70 hover:opacity-100'}`}
        >
          All ({properties.length})
        </button>
        {(Object.entries(counts) as [PropertyStatus, number][])
          .filter(([, n]) => n > 0)
          .map(([s, n]) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`status-badge cursor-pointer transition-all hover:scale-105 ${STATUS_STYLES[s].badge} ${statusFilter === s ? 'ring-2 ring-offset-1 ring-teal-400' : 'opacity-70 hover:opacity-100'}`}
            >
              {STATUS_STYLES[s].icon} {s} ({n})
            </button>
          ))}
      </div>

      {/* Property list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-stone-400 dark:text-stone-500">
            <Home size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No properties yet</p>
            <p className="text-sm mt-1">Add the first house you're considering.</p>
          </div>
        ) : (
          filtered.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              branches={branches}
              schools={schools}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Upcoming visits callout */}
      {properties.some(p => p.visit_at && new Date(p.visit_at) > new Date()) && (
        <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock size={12} /> Upcoming Visits
          </div>
          <div className="space-y-1">
            {properties
              .filter(p => p.visit_at && new Date(p.visit_at) > new Date())
              .sort((a, b) => new Date(a.visit_at!).getTime() - new Date(b.visit_at!).getTime())
              .slice(0, 3)
              .map(p => (
                <div key={p.id} className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <span className="font-medium">{formatVisitDate(p.visit_at)}</span>
                  <span className="text-blue-500 dark:text-blue-400 truncate">{p.address}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
