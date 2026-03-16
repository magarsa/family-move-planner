import { useEffect, useState } from 'react'
import { Clock, AlertTriangle, ArrowRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

type DeadlineRow = Tables<'deadlines'>

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
  const d = new Date(dateStr + 'T12:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

function urgencyBadge(days: number) {
  if (days < 0)   return <span className="text-[10px] font-bold text-red-600 dark:text-red-400 tabular-nums">{Math.abs(days)}d OVERDUE</span>
  if (days === 0) return <span className="text-[10px] font-bold text-red-600 dark:text-red-400">TODAY</span>
  if (days === 1) return <span className="text-[10px] font-bold text-red-500 dark:text-red-400">TOMORROW</span>
  if (days <= 7)  return <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{days}d</span>
  return <span className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">{days}d</span>
}

export default function DeadlinesWidget() {
  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('deadlines')
        .select('*')
        .eq('completed', false)
        .order('deadline_at', { ascending: true })
        .limit(5)
      setDeadlines(data ?? [])
    }
    load()
    const ch = supabase.channel('deadlines-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deadlines' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const critical = deadlines.filter(d => daysUntil(d.deadline_at) <= 7)

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
          {critical.length > 0
            ? <AlertTriangle size={16} className="text-amber-500" />
            : <Clock size={16} className="text-stone-400" />
          }
          Critical Dates
        </h2>
        <Link
          to="/deadlines"
          className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline"
        >
          <Plus size={12} /> Add
        </Link>
      </div>

      {deadlines.length === 0 ? (
        <div className="text-center py-5 text-stone-400 dark:text-stone-500">
          <Clock size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">No upcoming deadlines.</p>
          <Link to="/deadlines" className="text-xs text-teal-600 hover:underline mt-1 inline-block">
            Add offer or closing dates →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map(dl => {
            const days = daysUntil(dl.deadline_at)
            return (
              <Link
                key={dl.id}
                to="/deadlines"
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all hover:shadow-sm group ${
                  days < 0    ? 'border-red-200 dark:border-red-800/60 bg-red-50/60 dark:bg-red-900/10' :
                  days <= 2   ? 'border-red-100 dark:border-red-800/40 bg-red-50/40 dark:bg-red-900/5' :
                  days <= 7   ? 'border-amber-100 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-900/5' :
                  'border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800/60'
                }`}
              >
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${CATEGORY_COLORS[dl.category] ?? CATEGORY_COLORS.Other}`}>
                  {dl.category}
                </span>
                <span className="text-xs text-stone-700 dark:text-stone-300 truncate flex-1 group-hover:text-stone-900 dark:group-hover:text-stone-100">
                  {dl.title}
                </span>
                <span className="shrink-0">{urgencyBadge(days)}</span>
                <ArrowRight size={12} className="text-stone-300 dark:text-stone-600 shrink-0" />
              </Link>
            )
          })}
          {deadlines.length >= 5 && (
            <Link to="/deadlines" className="text-xs text-teal-600 dark:text-teal-400 hover:underline pl-1">
              View all deadlines →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
