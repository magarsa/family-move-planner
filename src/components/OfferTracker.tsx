import { useEffect, useState } from 'react'
import { DollarSign, Plus, ChevronDown, Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import { useUser } from '../hooks/useUser'

type OfferRow = Tables<'offers'>

type OfferStatus = 'Draft' | 'Submitted' | 'Countered' | 'Accepted' | 'Rejected' | 'Withdrawn'

const STATUS_STYLES: Record<OfferStatus, string> = {
  Draft:     'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Countered: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  Accepted:  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  Rejected:  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  Withdrawn: 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400',
}

const STATUSES: OfferStatus[] = ['Draft', 'Submitted', 'Countered', 'Accepted', 'Rejected', 'Withdrawn']

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

interface Props {
  propertyId: string
  onStatusChange?: (status: string) => void
}

export default function OfferTracker({ propertyId, onStatusChange }: Props) {
  const { userName } = useUser()
  const [offers,   setOffers]   = useState<OfferRow[]>([])
  const [showAdd,  setShowAdd]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [newAmount,       setNewAmount]       = useState('')
  const [newStatus,       setNewStatus]       = useState<OfferStatus>('Draft')
  const [newDate,         setNewDate]         = useState(new Date().toISOString().slice(0, 10))
  const [newExpiry,       setNewExpiry]       = useState('')
  const [newContingencies,setNewContingencies]= useState('')
  const [newNotes,        setNewNotes]        = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('offers')
        .select('*')
        .eq('property_id', propertyId)
        .order('offer_date', { ascending: false })
      setOffers(data ?? [])
    }
    load()
    const ch = supabase.channel(`offers-${propertyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers',
          filter: `property_id=eq.${propertyId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [propertyId])

  async function addOffer() {
    const amount = parseFloat(newAmount.replace(/[^0-9.]/g, ''))
    if (!amount) return
    setSaving(true)
    const { data } = await supabase.from('offers').insert({
      property_id:   propertyId,
      amount,
      status:        newStatus,
      offer_date:    newDate,
      expiry_at:     newExpiry ? new Date(newExpiry + 'T23:59:00').toISOString() : null,
      contingencies: newContingencies.trim() || null,
      notes:         newNotes.trim() || null,
      added_by:      userName,
    }).select().single()
    if (data && (newStatus === 'Submitted' || newStatus === 'Accepted')) {
      onStatusChange?.('Offer Made')
    }
    setNewAmount(''); setNewExpiry(''); setNewContingencies(''); setNewNotes('')
    setNewStatus('Draft'); setNewDate(new Date().toISOString().slice(0, 10))
    setShowAdd(false)
    setSaving(false)
  }

  async function updateStatus(id: string, status: OfferStatus) {
    await supabase.from('offers').update({ status }).eq('id', id)
    if (status === 'Accepted') onStatusChange?.('Offer Made')
  }

  async function deleteOffer(id: string) {
    await supabase.from('offers').delete().eq('id', id)
  }

  const active = offers.filter(o => !['Rejected', 'Withdrawn'].includes(o.status))

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
          <DollarSign size={13} /> Offers
          {active.length > 0 && (
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400">
              {active.length} active
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        >
          <Plus size={12} /> Log offer
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3 space-y-2.5 bg-stone-50 dark:bg-stone-800/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">Offer amount</label>
                  <input
                    type="text"
                    placeholder="$500,000"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="input-field text-sm py-1.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">Status</label>
                  <div className="relative">
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as OfferStatus)}
                      className="input-field text-sm py-1.5 appearance-none pr-7"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">Offer date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="input-field text-sm py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1">Expires (optional)</label>
                  <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className="input-field text-sm py-1.5" />
                </div>
              </div>
              <input
                type="text"
                placeholder="Contingencies (inspection, financing, appraisal…)"
                value={newContingencies}
                onChange={e => setNewContingencies(e.target.value)}
                className="input-field text-sm py-1.5"
              />
              <input
                type="text"
                placeholder="Notes"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                className="input-field text-sm py-1.5"
              />
              <div className="flex gap-2">
                <button
                  onClick={addOffer}
                  disabled={saving || !newAmount}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offer list */}
      {offers.length === 0 && !showAdd && (
        <p className="text-xs text-stone-400 dark:text-stone-500 italic">No offers logged yet.</p>
      )}

      {offers.map(offer => {
        const expiresIn = offer.expiry_at ? daysUntil(offer.expiry_at) : null
        const expiringSoon = expiresIn !== null && expiresIn >= 0 && expiresIn <= 2
        return (
          <div
            key={offer.id}
            className={`rounded-xl border p-3 space-y-1.5 ${
              offer.status === 'Accepted'
                ? 'border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-900/10'
                : offer.status === 'Rejected' || offer.status === 'Withdrawn'
                  ? 'border-stone-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/30 opacity-60'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/40'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{fmt(offer.amount)}</span>
              <div className="relative">
                <select
                  value={offer.status}
                  onChange={e => updateStatus(offer.id, e.target.value as OfferStatus)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 appearance-none cursor-pointer pr-4 ${STATUS_STYLES[offer.status as OfferStatus] ?? STATUS_STYLES.Draft}`}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
              <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">
                {new Date(offer.offer_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => deleteOffer(offer.id)} className="p-0.5 text-stone-300 hover:text-red-400 dark:text-stone-600 dark:hover:text-red-400 transition-colors">
                <Trash2 size={11} />
              </button>
            </div>

            {offer.contingencies && (
              <p className="text-xs text-stone-500 dark:text-stone-400">📋 {offer.contingencies}</p>
            )}
            {offer.notes && (
              <p className="text-xs text-stone-400 dark:text-stone-500 italic">{offer.notes}</p>
            )}
            {offer.expiry_at && (
              <div className={`flex items-center gap-1 text-xs ${expiringSoon ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-stone-400 dark:text-stone-500'}`}>
                {expiringSoon && <AlertTriangle size={11} />}
                Expires: {new Date(offer.expiry_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                {expiresIn !== null && expiresIn >= 0 && ` (${expiresIn === 0 ? 'today' : expiresIn + 'd'})`}
                {expiresIn !== null && expiresIn < 0 && ' (expired)'}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
