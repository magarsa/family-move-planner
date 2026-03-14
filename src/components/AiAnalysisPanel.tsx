import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import type { AiAnalysis, AnalysisEntityType, Grade } from '../types/analysis'
import { analyzeEntity } from '../lib/analyzeEntity'

interface AiAnalysisPanelProps {
  entityType: AnalysisEntityType
  entityId: string
  entityData: Record<string, unknown>
  analysis: AiAnalysis | null
  onAnalysisComplete: (analysis: AiAnalysis) => void
}

const GRADE_BG: Record<Grade, string> = {
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
}


function GradeBadge({ grade, size = 'md' }: { grade: Grade; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-12 h-12 text-lg' : size === 'sm' ? 'w-6 h-6 text-xs' : 'w-9 h-9 text-base'
  return (
    <div className={`${dim} ${GRADE_BG[grade]} rounded-full flex items-center justify-center text-white font-bold font-serif flex-shrink-0`}
      style={{ boxShadow: `0 0 12px ${grade === 'A' ? '#22c55e' : grade === 'B' ? '#84cc16' : grade === 'C' ? '#eab308' : grade === 'D' ? '#f97316' : '#ef4444'}55` }}>
      {grade}
    </div>
  )
}

function ShimmerBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-stone-200 dark:bg-stone-700 rounded animate-pulse ${className}`} />
  )
}

export default function AiAnalysisPanel({ entityType, entityId, entityData, analysis, onAnalysisComplete }: AiAnalysisPanelProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function runAnalysis() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await analyzeEntity(entityType, entityId, entityData)
      onAnalysisComplete(result)
      setStatus('idle')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Analysis failed')
      setStatus('error')
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="border-t border-stone-100 dark:border-stone-700 pt-4 mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-teal-500" />
          <span className="text-xs text-stone-400 dark:text-stone-500">Analyzing with Claude…</span>
        </div>
        <ShimmerBlock className="h-4 w-3/4" />
        <ShimmerBlock className="h-4 w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <ShimmerBlock className="h-16" />
          <ShimmerBlock className="h-16" />
          <ShimmerBlock className="h-16" />
          <ShimmerBlock className="h-16" />
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="border-t border-stone-100 dark:border-stone-700 pt-4 mt-4">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Analysis failed</p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5 break-words">{errorMsg}</p>
          </div>
          <button onClick={runAnalysis} className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium flex-shrink-0 underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Idle (no analysis yet) ────────────────────────────────────────────────
  if (!analysis) {
    return (
      <div className="border-t border-stone-100 dark:border-stone-700 pt-4 mt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={runAnalysis}
            className="btn-primary text-sm"
          >
            <Sparkles size={13} /> Analyze with AI
          </button>
          <span className="text-xs text-stone-400 dark:text-stone-500">
            Get Claude's take using real Charlotte research data
          </span>
        </div>
      </div>
    )
  }

  // ── Success (analysis exists) ─────────────────────────────────────────────
  const categories = Object.values(analysis.categories || {})

  return (
    <div className="border-t border-stone-100 dark:border-stone-700 pt-4 mt-4 space-y-4">
      {/* Header: grade + summary */}
      <div className="flex items-start gap-3">
        <GradeBadge grade={analysis.overallGrade} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">AI Analysis</div>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{analysis.summary}</p>
        </div>
      </div>

      {/* Category grid */}
      {categories.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <div key={cat.label} className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {cat.icon} {cat.label}
                </span>
                <GradeBadge grade={cat.grade} size="sm" />
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{cat.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {analysis.pros.length > 0 && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/30 rounded-xl p-3">
            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">Pros</div>
            <ul className="space-y-1">
              {analysis.pros.map((p, i) => (
                <li key={i} className="text-xs text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.cons.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-xl p-3">
            <div className="text-xs font-semibold text-red-500 dark:text-red-400 mb-2">Cons</div>
            <ul className="space-y-1">
              {analysis.cons.map((c, i) => (
                <li key={i} className="text-xs text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">−</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
            <AlertTriangle size={11} /> Warnings
          </div>
          <ul className="space-y-1">
            {analysis.warnings.map((w, i) => (
              <li key={i} className="text-xs text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">!</span>{w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verdict */}
      <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/30 rounded-xl p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400 mb-1">Bottom Line</div>
        <p className="text-sm text-teal-800 dark:text-teal-300 italic font-serif leading-relaxed">"{analysis.verdict}"</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400 dark:text-stone-500">
          Analyzed {analysis.analyzedAt ? new Date(analysis.analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
        </span>
        <button
          onClick={runAnalysis}
          className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <RefreshCw size={11} /> Re-analyze
        </button>
      </div>
    </div>
  )
}
