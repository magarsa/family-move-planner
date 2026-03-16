import { useEffect, useState, useMemo } from 'react'
import { DollarSign, TrendingUp, Home, ChevronDown, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

type ProfileRow  = Tables<'profile'>
type ScenarioRow = Tables<'sale_scenarios'>
type PropertyRow = Tables<'properties'>

interface Props {
  profile: ProfileRow[]
}

const DEFAULT_RATE   = 0.07   // 7% annual
const DEFAULT_TERM   = 30     // years
const AGENT_FEE_PCT  = 0.06   // 6% selling costs
const CLOSING_SELL   = 0.01   // 1% seller closing costs
const CLOSING_BUY    = 0.03   // 3% buyer closing costs estimate

function monthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0
  const r = annualRate / 12
  const n = termYears * 12
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function FinancialSnapshot({ profile }: Props) {
  const [scenarios,   setScenarios]   = useState<ScenarioRow[]>([])
  const [properties,  setProperties]  = useState<PropertyRow[]>([])
  const [loading,     setLoading]     = useState(true)

  const [selectedScenario, setSelectedScenario] = useState<string>('recommended')
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [downPct,          setDownPct]           = useState(20)
  const [rateInput,        setRateInput]         = useState(String((DEFAULT_RATE * 100).toFixed(1)))

  const pMap = useMemo(
    () => Object.fromEntries(profile.map(r => [r.key, r.value ?? ''])),
    [profile]
  )
  const sellPropertyId = pMap.sell_property_id

  useEffect(() => {
    async function load() {
      const queries: Promise<unknown>[] = [
        supabase.from('properties').select('id, address, area, price, status')
          .in('status', ['Considering', 'Visit Scheduled', 'Visited', 'Offer Made'])
          .order('created_at', { ascending: false }),
      ]
      if (sellPropertyId) {
        queries.push(
          supabase.from('sale_scenarios').select('*')
            .eq('property_id', sellPropertyId)
            .order('scenario_number', { ascending: true })
        )
      }
      const [propsRes, scenRes] = await Promise.all(queries as [
        ReturnType<typeof supabase.from>,
        ReturnType<typeof supabase.from>?,
      ])
      const propData = (propsRes as { data: PropertyRow[] | null }).data ?? []
      const scenData = scenRes ? (scenRes as { data: ScenarioRow[] | null }).data ?? [] : []
      setProperties(propData)
      setScenarios(scenData)
      if (propData.length > 0) setSelectedProperty(propData[0].id)
      setLoading(false)
    }
    load()
  }, [sellPropertyId])

  const scenario = useMemo(() => {
    if (selectedScenario === 'recommended') return scenarios.find(s => s.is_recommended) ?? scenarios[0]
    return scenarios.find(s => s.id === selectedScenario)
  }, [scenarios, selectedScenario])

  const property = useMemo(
    () => properties.find(p => p.id === selectedProperty),
    [properties, selectedProperty]
  )

  const calc = useMemo(() => {
    if (!property?.price) return null
    const price = Number(property.price)
    const annualRate = Math.max(0.01, Math.min(0.20, parseFloat(rateInput || '7') / 100))

    // Sale side
    const saleNetMid = scenario
      ? (((scenario.net_proceeds_low ?? 0) + (scenario.net_proceeds_high ?? 0)) / 2)
      : 0
    const saleNetLow  = scenario?.net_proceeds_low  ?? 0
    const saleNetHigh = scenario?.net_proceeds_high ?? 0

    // Buy side
    const downAmt     = price * (downPct / 100)
    const closingAmt  = price * CLOSING_BUY
    const loanAmt     = price - downAmt
    const monthlyPmt  = monthlyPayment(loanAmt, annualRate, DEFAULT_TERM)

    // Net position (after using proceeds to cover down + closing)
    const netCash = saleNetMid - downAmt - closingAmt

    return {
      price, downAmt, closingAmt, loanAmt, monthlyPmt,
      saleNetMid, saleNetLow, saleNetHigh, netCash,
      canAfford: netCash >= 0,
      isTight: netCash >= 0 && netCash < 20_000,
    }
  }, [property, scenario, downPct, rateInput])

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-5 w-40 bg-stone-100 dark:bg-stone-700 rounded mb-4" />
        <div className="h-24 bg-stone-100 dark:bg-stone-700 rounded-xl" />
      </div>
    )
  }

  if (properties.length === 0 && scenarios.length === 0) {
    return (
      <div className="card p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
          <DollarSign size={18} className="text-green-600 dark:text-green-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">Financial Snapshot</div>
          <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            Add properties and sale scenarios to see your buy/sell position.{' '}
            <Link to="/selling" className="text-teal-600 hover:underline">Set up selling →</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-green-600 dark:text-green-400" />
        <h2 className="font-semibold text-stone-800 dark:text-stone-200">Financial Snapshot</h2>
        <span className="text-xs text-stone-400 dark:text-stone-500 ml-1">Buy + sell position</span>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Property selector */}
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide block mb-1.5">
            Target property
          </label>
          <div className="relative">
            <select
              value={selectedProperty}
              onChange={e => setSelectedProperty(e.target.value)}
              className="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {properties.length === 0 && <option value="">No active properties</option>}
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.address ? p.address.split(',')[0] : p.area ?? 'Property'}
                  {p.price ? ` — ${fmt(Number(p.price))}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Scenario selector */}
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide block mb-1.5">
            Sale scenario
          </label>
          <div className="relative">
            <select
              value={selectedScenario}
              onChange={e => setSelectedScenario(e.target.value)}
              className="w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {scenarios.length === 0
                ? <option value="recommended">No scenarios — set up selling</option>
                : <>
                    <option value="recommended">Recommended scenario</option>
                    {scenarios.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </>
              }
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>
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
        <>
          <div className={`rounded-xl p-4 border ${
            !scenarios.length || calc.saleNetMid === 0
              ? 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-700'
              : calc.canAfford && !calc.isTight
                ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800/60'
                : calc.isTight
                  ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/60'
                  : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/60'
          }`}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              {/* Sale column */}
              {scenario && calc.saleNetMid > 0 && (
                <>
                  <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 pb-0.5 border-b border-stone-100 dark:border-stone-700">
                    Selling your home
                  </div>
                  <div className="text-stone-500 dark:text-stone-400">Sale proceeds (est.)</div>
                  <div className="text-right font-medium text-stone-800 dark:text-stone-200">
                    {fmt(calc.saleNetLow)} – {fmt(calc.saleNetHigh)}
                  </div>
                  <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 pb-0.5 border-b border-stone-100 dark:border-stone-700 mt-1">
                    Buying
                  </div>
                </>
              )}
              <div className="text-stone-500 dark:text-stone-400">Purchase price</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">{fmt(calc.price)}</div>
              <div className="text-stone-500 dark:text-stone-400">Down payment ({downPct}%)</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">-{fmt(calc.downAmt)}</div>
              <div className="text-stone-500 dark:text-stone-400">Buyer closing costs (~3%)</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">-{fmt(calc.closingAmt)}</div>
              <div className="text-stone-500 dark:text-stone-400">Loan amount</div>
              <div className="text-right font-medium text-stone-800 dark:text-stone-200">{fmt(calc.loanAmt)}</div>

              {/* Monthly payment — highlighted */}
              <div className="col-span-2 mt-1 flex items-center justify-between py-2 border-t border-b border-stone-200 dark:border-stone-700">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  Monthly payment (P&I)
                </span>
                <span className="font-bold text-lg text-teal-700 dark:text-teal-400">
                  {fmt(calc.monthlyPmt)}/mo
                </span>
              </div>

              {/* Net cash remaining */}
              {scenario && calc.saleNetMid > 0 && (
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-sm text-stone-500 dark:text-stone-400">
                    Cash remaining after close
                  </span>
                  <span className={`font-bold text-base ${
                    calc.canAfford && !calc.isTight
                      ? 'text-teal-700 dark:text-teal-400'
                      : calc.isTight
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {calc.netCash < 0 ? '-' : ''}{fmt(Math.abs(calc.netCash))}
                    {' '}{calc.netCash >= 0 ? '✓' : '⚠'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-stone-400 dark:text-stone-500">
            <Info size={11} className="mt-0.5 shrink-0" />
            <span>Estimates only. Actual closing costs, taxes, and HOA vary. Consult your lender for a formal pre-approval.</span>
          </div>
        </>
      )}

      {!property?.price && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <Info size={11} />
          Selected property has no price set.{' '}
          <Link to="/properties" className="underline">Add price →</Link>
        </div>
      )}
    </div>
  )
}
