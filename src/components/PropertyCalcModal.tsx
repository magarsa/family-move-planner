import { useState, useMemo } from 'react'
import { X, Info, Calculator } from 'lucide-react'
import type { Tables } from '../types/database'

type PropertyRow = Tables<'properties'>

interface Props {
  property: PropertyRow
  onClose: () => void
}

const DEFAULT_RATE = 0.07
const DEFAULT_TERM = 30
const CLOSING_BUY  = 0.03

function monthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0
  const r = annualRate / 12
  const n = termYears * 12
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function PropertyCalcModal({ property, onClose }: Props) {
  const [downPct,   setDownPct]   = useState(20)
  const [rateInput, setRateInput] = useState(String((DEFAULT_RATE * 100).toFixed(1)))

  const calc = useMemo(() => {
    if (!property.price) return null
    const price      = Number(property.price)
    const annualRate = Math.max(0.01, Math.min(0.20, parseFloat(rateInput || '7') / 100))
    const downAmt    = price * (downPct / 100)
    const closingAmt = price * CLOSING_BUY
    const loanAmt    = price - downAmt
    const monthlyPmt = monthlyPayment(loanAmt, annualRate, DEFAULT_TERM)
    return { price, downAmt, closingAmt, loanAmt, monthlyPmt }
  }, [property.price, downPct, rateInput])

  const displayName = property.address
    ? property.address.split(',')[0]
    : property.area ?? 'Property'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200 leading-tight">{displayName}</div>
              {calc && (
                <div className="text-xs text-stone-400 dark:text-stone-500">{fmt(calc.price)}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 flex justify-between mb-1">
              <span>Down payment</span>
              <span className="font-semibold text-stone-700 dark:text-stone-300">{downPct}%</span>
            </label>
            <input
              type="range" min={3} max={40} step={1} value={downPct}
              onChange={e => setDownPct(Number(e.target.value))}
              className="w-full h-1.5 rounded-full accent-teal-600 bg-stone-200 dark:bg-stone-700"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
              <span>3%</span><span>40%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 flex justify-between mb-1">
              <span>Rate (30yr)</span>
              <span className="font-semibold text-stone-700 dark:text-stone-300">{rateInput}%</span>
            </label>
            <input
              type="range" min={4} max={10} step={0.1} value={parseFloat(rateInput || '7')}
              onChange={e => setRateInput(parseFloat(e.target.value).toFixed(1))}
              className="w-full h-1.5 rounded-full accent-teal-600 bg-stone-200 dark:bg-stone-700"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
              <span>4%</span><span>10%</span>
            </div>
          </div>
        </div>

        {/* Results */}
        {calc && (
          <div className="rounded-xl p-4 border bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-stone-500 dark:text-stone-400">Purchase price</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">{fmt(calc.price)}</div>
              <div className="text-stone-500 dark:text-stone-400">Down payment ({downPct}%)</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">-{fmt(calc.downAmt)}</div>
              <div className="text-stone-500 dark:text-stone-400">Buyer closing (~3%)</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">-{fmt(calc.closingAmt)}</div>
              <div className="text-stone-500 dark:text-stone-400">Loan amount</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">{fmt(calc.loanAmt)}</div>

              <div className="col-span-2 mt-1 flex items-center justify-between py-2 border-t border-b border-stone-200 dark:border-stone-700">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Monthly payment (P&I)</span>
                <span className="font-bold text-lg text-teal-700 dark:text-teal-400">{fmt(calc.monthlyPmt)}/mo</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-1.5 text-xs text-stone-400 dark:text-stone-500">
          <Info size={11} className="mt-0.5 shrink-0" />
          <span>Estimates only. Actual closing costs, taxes, and HOA vary. Consult your lender for a formal pre-approval.</span>
        </div>
      </div>
    </div>
  )
}
