import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, MessageSquare, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Scenario = 'A' | 'B'
type ItemScenario = 'both' | 'A' | 'B'

interface Prefs {
  scenario: Scenario
  price: number
  downPct: number
  rate: number
  term: number
  annualIncome: number
  taxRate: number
  annualInsurance: number
  pmiRate: number
  desMoinesRent: number
}

interface ChecklistState {
  checkedItems: Record<string, boolean>
  notes: Record<string, string>
  collapsedPhases: Record<string, boolean>
}

interface DetailSection {
  heading: string
  body: string
}

interface ChecklistItem {
  id: string
  scenario: ItemScenario
  scSideOnly?: boolean
  text: string
  helperText: string
  details?: DetailSection[]
}

interface Phase {
  id: string
  label: string
  dotColor: string
  items: ChecklistItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: Prefs = {
  scenario: 'A',
  price: 530000,
  downPct: 20,
  rate: 7.0,
  term: 30,
  annualIncome: 161000,
  taxRate: 0.9,
  annualInsurance: 2400,
  pmiRate: 0.55,
  desMoinesRent: 1900,
}

const PHASES: Phase[] = [
  {
    id: 'phase1',
    label: 'Phase 1 — Now',
    dotColor: 'bg-amber-400',
    items: [
      {
        id: 'p1_1',
        scenario: 'both',
        text: 'Pull all three credit reports (Equifax, Experian, TransUnion); pay revolving balances under 10% utilization',
        helperText:
          'Ask each lender what minimum score they require — conventional loans typically need 620+, but 740+ gets the best rates. Under 10% utilization on every revolving account (not just total) is the optimal threshold. Pull free reports at annualcreditreport.com. Dispute any errors immediately — corrections can take 30–45 days to propagate.',
      },
      {
        id: 'p1_2',
        scenario: 'both',
        text: 'Get pre-approved with 2–3 lenders; include one SC Housing Palmetto Heroes lender if targeting SC side',
        helperText:
          'Request the official Loan Estimate (LE) form from each lender — it\'s standardized and legally required within 3 business days. Compare: origination fees, interest rate, APR, lender credits, and estimated cash to close. Multiple mortgage inquiries within a 14–45 day window count as one hard pull for credit scoring purposes.',
      },
      {
        id: 'p1_3',
        scenario: 'both',
        scSideOnly: true,
        text: 'Verify Palmetto Heroes eligibility: spouse\'s RN license, income limit, price cap',
        helperText:
          'SC Housing income limits for family of 4 are roughly $110–130K depending on county — at $161K joint income you may exceed the limit. The DPA (down payment assistance) price cap is around $385K; the rate-reduction-only program has a higher limit (~$530K). Call SC Housing directly at (803) 896-9001 to verify current limits for York/Lancaster County. Palmetto Heroes only applies to SC-side purchases (Indian Land, Fort Mill, Tega Cay).',
      },
      {
        id: 'p1_4',
        scenario: 'B',
        text: 'Confirm lender will accept family lease to offset Des Moines mortgage in DTI calc — get written confirmation',
        helperText:
          'Lender must see a signed lease at market rate — family relationship doesn\'t matter, the lease must be arm\'s-length and at market rent. The lender will credit 75% of rental income toward offsetting the Des Moines PITI in your DTI calculation. Some lenders are stricter than others on family leases — ask explicitly and get written confirmation before choosing your lender. If lender won\'t accept it, your DTI rises by ~$1,900/mo.',
        details: [
          {
            heading: 'How the DTI math works',
            body: 'Gross monthly income: $161K ÷ 12 = ~$13,417/mo. Lenders apply 75% of documented rental income as a credit against the Des Moines PITI. At $1,900/mo rent: 75% = $1,425 credit → net Des Moines DTI exposure ≈ $475/mo. Without the rental offset, your DTI jumps by ~$1,900/mo — potentially pushing you above the 43–45% conventional limit.',
          },
          {
            heading: 'What lenders require',
            body: 'A signed lease agreement at market rate is the minimum. If the property has no rental history, some lenders will accept a market rent appraisal (Fannie Mae Form 1007) showing what it would rent for. Get the lender\'s policy in writing before you commit — this is a loan condition that can fall apart late in the process.',
          },
          {
            heading: 'FHA is off the table',
            body: 'FHA loan limits for the Charlotte-Concord-Gastonia MSA are ~$498K–$524K. At $530K with 10% down, your loan is $477K — borderline. At $620K with 10% down, your loan is $558K — FHA limit exceeded. Conventional loan only.',
          },
        ],
      },
      {
        id: 'p1_5',
        scenario: 'B',
        text: 'Draft formal lease agreement for Des Moines at market rate (must cover $1,900/mo PITI)',
        helperText:
          'Even for family, the lease must be formal and arm\'s-length. Research comparable rental rates in Des Moines — the lease must be at or near market rate. Use Iowa\'s standard residential lease form or have a real estate attorney draft it. The lease should cover at minimum the $1,900/mo PITI. Lender will want to see the executed lease as part of the loan file.',
      },
      {
        id: 'p1_6',
        scenario: 'B',
        text: 'Talk to CPA: rental depreciation, passive activity loss rules, filing strategy',
        helperText:
          'Des Moines depreciation is approximately $8,400/year ($231,500 purchase price ÷ 27.5 years) — this is a non-cash deduction that offsets rental income on Schedule E. Passive activity loss rules (IRS §469) may limit how much of any net rental loss offsets ordinary W-2 income. If your AGI is under $100K, up to $25K in passive losses can offset ordinary income; phases out between $100K–$150K. Get a CPA with rental property experience.',
        details: [
          {
            heading: 'Cash flow reality check (Scenario B)',
            body: 'Estimated rent ~$2,000/mo minus Des Moines PITI ~$1,900/mo = ~$100 gross. Add property management (~9% = $180/mo), maintenance reserve (~1%/yr = $283/mo), vacancy buffer (~5% = $100/mo) → likely cash flow negative by ~$460/mo short-term. Not a disaster if you can absorb it — the long-term play is appreciation and equity in a stable Midwest market.',
          },
          {
            heading: 'Tax upside',
            body: '$231,500 ÷ 27.5 yrs = ~$8,400/yr depreciation deduction (non-cash). This offsets rental income on Schedule E. If your AGI allows passive loss deductions (phases out $100K–$150K), some of that loss may offset your W-2 income too. Also deductible: mortgage interest, property taxes, insurance, repairs, and management fees.',
          },
          {
            heading: 'Pros of keeping Des Moines',
            body: '• Retain appreciating asset in a stable Midwest market\n• Tenant builds equity for you\n• Depreciation + expense deductions\n• Diversified real estate in two markets\n• Avoids selling at potentially suboptimal timing',
          },
          {
            heading: 'Cons of keeping Des Moines',
            body: '• Cash flow negative ~$300–500/mo short-term\n• Landlord responsibilities from 1,000 miles away\n• Adds DTI pressure — lenders scrutinize this\n• Vacancy, bad tenants, major repairs can hurt fast\n• Two mortgages = more exposure if income drops',
          },
        ],
      },
      {
        id: 'p1_7',
        scenario: 'A',
        text: 'Coordinate Des Moines sale timeline to have ~$122K proceeds available for Charlotte down payment',
        helperText:
          'Net proceeds after ~6% selling costs on a ~$340K value is roughly $122K. The timing risk: if Charlotte closing happens before Des Moines closes, you need a bridge loan or HELOC to cover the gap. Talk to your lender early about bridge financing options. Alternatively, negotiate a longer closing window on Charlotte (45–60 days) to give Des Moines sale time to complete. The $122K is your ~20% down payment — timing is critical.',
        details: [
          {
            heading: 'Scenario A numbers at $530K',
            body: 'Down payment: ~$122K (≈23%) → Loan: ~$408K\nMonthly P&I at 7%: ~$2,714\nEst. PITI (tax + ins): ~$3,100–3,300/mo\nNo PMI (down > 20%) · DTI: ~24–25% ✓',
          },
          {
            heading: 'Scenario A numbers at $620K',
            body: 'Down payment: ~$122K (≈20%) → Loan: ~$498K\nMonthly P&I at 7%: ~$3,315\nEst. PITI (tax + ins): ~$3,900–4,100/mo\nNo PMI if down ≥ 20% · DTI: ~28–29% ✓',
          },
          {
            heading: 'Pros of selling Des Moines (Scenario A)',
            body: '• Frees ~$122K equity for larger Charlotte down payment\n• Eliminates PMI entirely (≥20% down)\n• Cleaner DTI — easier lender qualification\n• Zero landlord headaches\n• One mortgage, lower financial exposure',
          },
          {
            heading: 'Cons of selling Des Moines',
            body: '• Loses an appreciating asset in a stable market\n• Loses rental income stream (even if slightly negative now)\n• Loses depreciation tax benefit\n• Capital gains tax may apply if gain > $500K exclusion (unlikely at current values)',
          },
        ],
      },
    ],
  },
  {
    id: 'phase2',
    label: 'Phase 2 — During Home Search',
    dotColor: 'bg-blue-400',
    items: [
      {
        id: 'p2_1',
        scenario: 'both',
        text: 'Target list price ~$560–620K; negotiate down + request seller-paid 2-1 buydown concession',
        helperText:
          'A 2-1 buydown means the seller funds an escrow account that reduces your rate 2% in Year 1 and 1% in Year 2 (reverts to note rate in Year 3). Frame it as a seller concession rather than a price reduction — sellers often prefer concessions since it doesn\'t affect their "sold price" optics. The escrow cost to seller is the present value of the savings, typically 1–2% of loan amount. See the financial summary for projected Year 1 and Year 2 savings.',
        details: [
          {
            heading: 'Scenario B — $620K with 10% down',
            body: 'Loan: $558K · P&I at 7%: ~$3,714/mo\nProperty tax (~1.2%): ~$620/mo\nInsurance: ~$175/mo · PMI (~0.6%): ~$279/mo\nTotal PITI + PMI: ~$4,788/mo\nDTI (with Des Moines rental offset): ~36% ✓ (tight)',
          },
          {
            heading: 'Scenario B — $530K with 10% down',
            body: 'Loan: $477K · P&I at 7%: ~$3,175/mo\nProperty tax (~0.9%): ~$398/mo\nInsurance: ~$200/mo · PMI (~0.55%): ~$219/mo\nTotal PITI + PMI: ~$3,992/mo\nDTI (with Des Moines rental offset): ~32% ✓',
          },
          {
            heading: '2-1 Buydown savings example',
            body: 'On a $558K loan at 7% note rate:\nYear 1 (5%): payment drops ~$718/mo → redirect to principal\nYear 2 (6%): payment drops ~$358/mo → redirect to principal\nYear 3+: reverts to 7% note rate\nSeller funds the escrow — you get ~$12,900 in Year 1–2 savings',
          },
        ],
      },
      {
        id: 'p2_2',
        scenario: 'B',
        text: 'Ask every lender about recast availability — confirm Fannie/Freddie eligibility at origination',
        helperText:
          'A mortgage recast (re-amortization) lets you apply a lump-sum principal payment and have the lender recalculate your monthly payment at the same rate — no refinance, no closing costs. FHA, VA, and USDA loans cannot be recast; only conventional Fannie/Freddie loans qualify. Confirm at origination (not closing) to preserve this option. When Des Moines eventually sells, applying ~$143K equity as a lump sum and recasting could save $800+/mo.',
        details: [
          {
            heading: 'Recast vs. Refinance',
            body: 'Recast: keep your rate, apply lump sum, lender re-amortizes → lower payment, no closing costs (~$250 recast fee). Refinance: new loan at new rate → lower rate AND lower payment, but $3,000–6,000 in closing costs and resets amortization. If rates are still elevated when Des Moines sells, a recast is almost always better than refi. If rates have dropped ≥0.75%, evaluate refi first.',
          },
          {
            heading: 'Recast savings estimate',
            body: 'Des Moines gross equity ~$143K applied as lump sum to a $477K loan (Scenario B, $530K purchase) → remaining balance ~$334K. Re-amortized at 7% over remaining term → monthly P&I drops from ~$3,175 to ~$2,222. Savings: ~$950/mo. At $620K purchase (loan $558K → $415K after recast) → savings ~$960/mo.',
          },
        ],
      },
      {
        id: 'p2_3',
        scenario: 'both',
        text: 'Get float-down rate lock option (lock now, capture lower rate if market drops before closing)',
        helperText:
          'A float-down option lets you lock your rate now but capture a lower rate if market rates drop before closing. Typically costs 0.1–0.25 discount points upfront. Get the trigger threshold in writing: most require rates to drop at least 0.25–0.375% to exercise the float-down. Worth it if you have a longer closing timeline (45–60 days) and rate volatility is high. Ask each lender if they offer this — not all do.',
      },
      {
        id: 'p2_4',
        scenario: 'B',
        text: 'Evaluate 80-10-10 piggyback loan to eliminate PMI (80% first mortgage + 10% second + 10% cash)',
        helperText:
          'An 80-10-10 structures your financing as: 80% first mortgage + 10% second mortgage (HELOC or fixed-rate) + 10% cash down. This eliminates PMI entirely since the first mortgage stays at 80% LTV. The second loan will carry a higher rate (typically prime + 1–2%), but if you pay it off aggressively (12–24 months), you may come out ahead vs. carrying PMI. Run the math: PMI cost vs. second loan interest cost at your projected payoff timeline. Not all lenders offer piggyback structures.',
        details: [
          {
            heading: 'PMI vs. 80-10-10 math at $530K',
            body: 'PMI on $477K loan at 0.55%: ~$219/mo · lasts until ~20% equity (~7–9 years at normal amortization).\n80-10-10: second loan of $53K at ~9.5% (prime+2%) → ~$550/mo. Pay it off in 12 months: total cost ~$6,600 in interest vs. PMI path ~$15,000+ over 5 years. Aggressive payoff wins — if you have the cash flow.',
          },
          {
            heading: 'Second loan structure options',
            body: 'Fixed-rate second: predictable payment, fully amortizing. HELOC as second: variable rate tied to prime, interest-only draw period — simpler but rate risk. Either eliminates PMI on the first. Not all lenders offer simultaneous close on both — ask your lender explicitly.',
          },
        ],
      },
      {
        id: 'p2_5',
        scenario: 'both',
        text: 'Negotiate seller concessions toward closing costs or 2-1 buydown escrow',
        helperText:
          'In a softer market, sellers often contribute 2–3% toward concessions (roughly $10–18K on a $580K home). Directing it to a buydown escrow gives you guaranteed monthly savings for 2 years rather than a one-time closing cost reduction. Conventional loans allow up to 3% seller concessions at 10% down, up to 6% at 25% down. Have your agent frame concessions as part of the offer rather than a separate negotiation — cleaner to execute.',
      },
    ],
  },
  {
    id: 'phase3',
    label: 'Phase 3 — At Closing',
    dotColor: 'bg-teal-500',
    items: [
      {
        id: 'p3_1',
        scenario: 'both',
        scSideOnly: true,
        text: 'Apply for SC homestead exemption within 90 days of closing (4% vs 6% assessment = $2,500–3,500/yr savings)',
        helperText:
          'SC primary residence is assessed at 4% of fair market value; investment/secondary property at 6%. On a $580K home, that\'s $23,200 vs $34,800 assessed value — at the local millage rate, saves roughly $2,500–3,500/year permanently. Apply at the York or Lancaster County Assessor\'s office within 90 days of closing. Bring closing disclosure, ID, and proof of residency. Do not miss this window — you\'ll have to wait a full year to re-apply.',
      },
      {
        id: 'p3_2',
        scenario: 'both',
        text: 'Set calendar reminder: property tax appeal window opens after first assessment notice',
        helperText:
          'Your first property tax assessment after purchase often resets to near the purchase price. If the assessed value appears inflated, appeal during the annual protest window (typically April–May in both SC and NC). Contingency-based consultants (pay only if they win) are available and often effective. Even a 10% reduction on a $580K assessment saves $250–350/year permanently. Set a calendar reminder for the first assessment notice.',
      },
      {
        id: 'p3_3',
        scenario: 'B',
        text: 'Confirm loan is conventional Fannie/Freddie (required for future recast)',
        helperText:
          'At closing, verify in the loan documents that your mortgage is a conventional Fannie Mae or Freddie Mac conforming loan. Look for "Fannie Mae" or "Freddie Mac" in the security instrument or note. This is the prerequisite for requesting a recast when Des Moines equity becomes available. Document the loan type and servicer contact information. If your loan is FHA by mistake, you cannot recast — catch this at closing, not later.',
      },
    ],
  },
  {
    id: 'phase4',
    label: 'Phase 4 — Year 1–2',
    dotColor: 'bg-violet-400',
    items: [
      {
        id: 'p4_1',
        scenario: 'both',
        text: 'Redirect 2-1 buydown savings to principal paydown each month (Year 1 and Year 2 savings shown in calculator)',
        helperText:
          'The 2-1 buydown lowers your payment in Year 1 and Year 2 vs. your note rate payment. Treat the difference as a mandatory principal paydown — pay the full note rate amount every month, directing the "extra" to principal. This accelerates equity, may trigger earlier PMI removal (Scenario B), and reduces total interest. See the financial summary card for exact Year 1 and Year 2 savings amounts based on your current calculator inputs.',
      },
      {
        id: 'p4_2',
        scenario: 'B',
        text: 'Track Des Moines rental income and expenses in a dedicated account for Schedule E tax filing',
        helperText:
          'Keep Des Moines rental income and all expenses completely separate from personal finances. A dedicated checking account makes Schedule E straightforward: rental income received, mortgage interest paid, property taxes, insurance, repairs, and depreciation ($8,400/yr non-cash). Save all receipts and document every repair vs. improvement (improvements are capitalized, not immediately deducted). Consider rental property accounting software or a dedicated spreadsheet.',
      },
      {
        id: 'p4_3',
        scenario: 'both',
        text: 'Evaluate refinance when rates drop ≥0.75% below your note rate',
        helperText:
          'The 0.75% threshold is a rule-of-thumb trigger — run the actual math when rates drop. Break-even = total closing costs ÷ monthly savings. At a $500K loan, 0.75% rate drop saves roughly $250–350/mo; typical closing costs are $3,000–6,000; break-even is 9–18 months. Don\'t refi on smaller drops unless you plan to hold 5+ years. Also consider whether a recast (if Scenario B) might be more cost-effective than a full refinance.',
      },
      {
        id: 'p4_4',
        scenario: 'B',
        text: 'Request PMI cancellation appraisal once 20% equity threshold is near',
        helperText:
          'Once you estimate you\'re near 80% LTV (original loan balance ÷ current value), order an independent appraisal. Charlotte metro appreciation may accelerate this timeline significantly. The Homeowners Protection Act requires servicers to cancel PMI at 80% LTV based on the original amortization schedule, but a current appraisal can establish a higher value and trigger earlier cancellation. Contact your servicer first — they have a specific process and approved appraisers.',
      },
    ],
  },
  {
    id: 'phase5',
    label: 'Phase 5 — Year 3–5',
    dotColor: 'bg-stone-400',
    items: [
      {
        id: 'p5_1',
        scenario: 'B',
        text: 'Reassess Des Moines: sell and recast Charlotte mortgage (~$800+/mo savings), or continue holding?',
        helperText:
          'When you\'re ready to reassess: selling Des Moines (net ~$122K+ after appreciation) and applying it as a lump sum to Charlotte, then recasting, could save $800+/mo with no refinance costs. Weigh against: continued Des Moines appreciation, ongoing rental income, and depreciation tax benefits. A 1031 exchange is also an option to defer capital gains and depreciation recapture taxes if you roll proceeds into another investment property. Engage a CPA before deciding.',
      },
      {
        id: 'p5_2',
        scenario: 'B',
        text: 'If PMI still active, order new appraisal and request early cancellation',
        helperText:
          'Charlotte metro has historically appreciated 5–8% annually. If PMI wasn\'t cancelled in Year 1–2, a new appraisal in Year 3–5 may easily show 80% LTV or better. The Homeowners Protection Act requires automatic PMI cancellation at 78% LTV on original amortization, but you can request cancellation at 80% LTV with evidence of current value. Order an independent appraisal (typically $400–600) and submit the request to your servicer.',
      },
      {
        id: 'p5_3',
        scenario: 'B',
        text: 'Review depreciation recapture tax before selling Des Moines (~25% of accumulated depreciation)',
        helperText:
          'When you sell a rental property, all accumulated depreciation is subject to a 25% "unrecaptured Section 1250 gain" tax — separate from capital gains tax. At $8,400/yr for 4 years = $33,600 accumulated depreciation × 25% = ~$8,400 in recapture tax. Factor this into your sell-vs-hold decision. A 1031 exchange defers both capital gains and depreciation recapture but requires rolling proceeds into a like-kind investment property within strict timelines.',
        details: [
          {
            heading: 'Tax breakdown on Des Moines sale',
            body: 'Purchase price: $231,500 · Est. sale price (Year 3–5): ~$360–380K\nCapital gain: ~$128–148K minus selling costs (~6%) = ~$107–127K net gain\nRecapture tax (25% of accumulated depreciation): ~$8,400–12,600 depending on years held\nLong-term capital gains rate: 15% for most households at your income level',
          },
          {
            heading: '1031 Exchange option',
            body: 'A 1031 exchange lets you defer all taxes by rolling proceeds into a like-kind investment property. Rules: identify replacement property within 45 days of close, close on it within 180 days. Must use a qualified intermediary (QI). Defers both capital gains AND depreciation recapture — taxes are only due when you eventually sell without exchanging.',
          },
        ],
      },
      {
        id: 'p5_4',
        scenario: 'both',
        text: 'Evaluate Charlotte home equity for HELOC or recast opportunity',
        helperText:
          'After 3–5 years of appreciation and principal paydown, Charlotte equity may support a HELOC for home improvements, investment, or other goals. Alternatively, if interest rates have come down and you haven\'t refinanced, this is also a good checkpoint to re-evaluate the refi math. A HELOC gives flexible access to equity with no closing costs but variable rate; a cash-out refi gives a lump sum at a fixed rate but resets your amortization.',
      },
    ],
  },
]

// ─── localStorage ─────────────────────────────────────────────────────────────

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem('fmp_home_checklist_prefs')
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

function savePrefs(p: Prefs): void {
  localStorage.setItem('fmp_home_checklist_prefs', JSON.stringify(p))
}

function loadChecklist(): ChecklistState {
  try {
    const raw = localStorage.getItem('fmp_home_checklist')
    if (!raw) return { checkedItems: {}, notes: {}, collapsedPhases: {} }
    return { checkedItems: {}, notes: {}, collapsedPhases: {}, ...JSON.parse(raw) }
  } catch {
    return { checkedItems: {}, notes: {}, collapsedPhases: {} }
  }
}

function saveChecklist(s: ChecklistState): void {
  localStorage.setItem('fmp_home_checklist', JSON.stringify(s))
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function isRelevant(item: ChecklistItem, scenario: Scenario): boolean {
  return item.scenario === 'both' || item.scenario === scenario
}

function fmt(n: number, d = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: d,
  }).format(n)
}

function piPayment(principal: number, mr: number, n: number): number {
  if (mr === 0) return principal / n
  return (principal * (mr * Math.pow(1 + mr, n))) / (Math.pow(1 + mr, n) - 1)
}

// ─── InfoModal ────────────────────────────────────────────────────────────────

interface InfoModalProps {
  item: ChecklistItem
  onClose: () => void
}

function InfoModal({ item, onClose }: InfoModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-stone-900/50 dark:bg-stone-950/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
      />

      {/* Modal card */}
      <motion.div
        className="relative w-full sm:max-w-lg bg-white dark:bg-stone-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-stone-100 dark:border-stone-700/60">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-1">
              More Details
            </p>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 leading-snug">
              {item.text}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {item.details!.map((section, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1.5">
                {section.heading}
              </p>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-700/60 bg-stone-50 dark:bg-stone-800/80">
          <p className="text-xs text-stone-400 dark:text-stone-500 italic">
            Not financial advice — verify with your lender and CPA before acting.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ─── ChecklistItemRow ─────────────────────────────────────────────────────────

interface RowProps {
  item: ChecklistItem
  scenario: Scenario
  checked: boolean
  note: string
  noteOpen: boolean
  onToggle: () => void
  onSetNote: (text: string) => void
  onToggleNote: () => void
  onShowDetails: () => void
}

function ChecklistItemRow({ item, scenario, checked, note, noteOpen, onToggle, onSetNote, onToggleNote, onShowDetails }: RowProps) {
  const relevant = isRelevant(item, scenario)

  return (
    <div
      className={`px-4 py-3 transition-colors ${
        relevant ? 'hover:bg-stone-50 dark:hover:bg-stone-700/20' : 'opacity-40'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={relevant ? onToggle : undefined}
          className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 transition-all flex items-center justify-center ${
            !relevant ? 'pointer-events-none' : ''
          } ${
            checked
              ? 'bg-teal-500 border-0 animate-check-pop'
              : 'border-2 border-stone-300 dark:border-stone-600 hover:border-teal-500'
          }`}
        >
          {checked && <Check size={9} className="text-white" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-1.5">
            <span
              className={`text-sm text-stone-800 dark:text-stone-200 leading-snug ${
                checked ? 'line-through text-stone-400 dark:text-stone-500' : ''
              }`}
            >
              {item.text}
            </span>
            {item.scenario === 'B' && (
              <span className="status-badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
                Scenario B
              </span>
            )}
            {item.scenario === 'A' && (
              <span className="status-badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                Scenario A
              </span>
            )}
            {item.scSideOnly && (
              <span className="status-badge bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 flex-shrink-0">
                SC side
              </span>
            )}
            {item.details && relevant && (
              <button
                onClick={onShowDetails}
                className="status-badge bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/30 dark:hover:text-teal-400 transition-colors flex-shrink-0 gap-1 cursor-pointer"
                title="More details"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                details
              </button>
            )}
          </div>

          {/* Note toggle */}
          {relevant && (
            <button
              onClick={onToggleNote}
              className="mt-1.5 flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            >
              <MessageSquare size={11} />
              {noteOpen ? 'Hide note' : note ? 'Edit note' : 'Add note'}
            </button>
          )}

          {/* Note textarea */}
          <AnimatePresence initial={false}>
            {noteOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <textarea
                  className="textarea-field text-xs mt-2"
                  rows={3}
                  value={note}
                  onChange={e => onSetNote(e.target.value)}
                  placeholder="Your notes..."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomePurchaseChecklist() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const [cl, setCl] = useState<ChecklistState>(loadChecklist)
  const [calcOpen, setCalcOpen] = useState(true)
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({})
  const [modalItem, setModalItem] = useState<ChecklistItem | null>(null)

  // ── Mortgage calculations ──────────────────────────────────────────────────

  const calc = useMemo(() => {
    const { price, downPct, rate, term, annualIncome, taxRate, annualInsurance, pmiRate, desMoinesRent, scenario } = prefs
    const downAmt = price * (downPct / 100)
    const loan = price - downAmt
    const n = term * 12
    const monthlyRate = rate / 100 / 12

    const pAndI = piPayment(loan, monthlyRate, n)
    const monthlyTax = (price * (taxRate / 100)) / 12
    const monthlyIns = annualInsurance / 12
    const monthlyPMI = downPct < 20 ? (loan * (pmiRate / 100)) / 12 : 0
    const totalMonthly = pAndI + monthlyTax + monthlyIns + monthlyPMI
    const grossMonthlyIncome = annualIncome / 12
    const desMoinesNetDTIExposure = scenario === 'B' ? Math.max(0, 1900 - desMoinesRent * 0.75) : 0
    const monthlyDebt = totalMonthly + desMoinesNetDTIExposure
    const dti = grossMonthlyIncome === 0 ? 0 : (monthlyDebt / grossMonthlyIncome) * 100

    const year1Rate = Math.max(0, rate - 2)
    const year2Rate = Math.max(0, rate - 1)
    const year1PI = piPayment(loan, year1Rate / 100 / 12, n)
    const year2PI = piPayment(loan, year2Rate / 100 / 12, n)
    const year1Savings = pAndI - year1PI
    const year2Savings = pAndI - year2PI

    return {
      downAmt, loan, pAndI, monthlyTax, monthlyIns, monthlyPMI,
      totalMonthly, grossMonthlyIncome, desMoinesNetDTIExposure, monthlyDebt,
      dti, year1Savings, year2Savings,
      rentalCredit: desMoinesRent * 0.75,
    }
  }, [prefs])

  // ── Progress counters ──────────────────────────────────────────────────────

  const { totalRelevant, totalChecked } = useMemo(() => {
    let total = 0
    let checked = 0
    for (const phase of PHASES) {
      for (const item of phase.items) {
        if (isRelevant(item, prefs.scenario)) {
          total++
          if (cl.checkedItems[item.id]) checked++
        }
      }
    }
    return { totalRelevant: total, totalChecked: checked }
  }, [prefs.scenario, cl.checkedItems])

  const progressPct = totalRelevant === 0 ? 0 : Math.round((totalChecked / totalRelevant) * 100)

  // ── State mutation helpers ─────────────────────────────────────────────────

  function updatePrefs(patch: Partial<Prefs>) {
    setPrefs(prev => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }

  function toggleScenario(s: Scenario) {
    setPrefs(prev => {
      let downPct = prev.downPct
      if (s === 'A' && downPct < 20) downPct = 20
      if (s === 'B' && downPct >= 20) downPct = 10
      const next = { ...prev, scenario: s, downPct }
      savePrefs(next)
      return next
    })
  }

  function toggleItem(id: string) {
    setCl(prev => {
      const next = { ...prev, checkedItems: { ...prev.checkedItems, [id]: !prev.checkedItems[id] } }
      saveChecklist(next)
      return next
    })
  }

  function setNote(id: string, text: string) {
    setCl(prev => {
      const next = { ...prev, notes: { ...prev.notes, [id]: text } }
      saveChecklist(next)
      return next
    })
  }

  function togglePhase(phaseId: string) {
    setCl(prev => {
      const next = { ...prev, collapsedPhases: { ...prev.collapsedPhases, [phaseId]: !prev.collapsedPhases[phaseId] } }
      saveChecklist(next)
      return next
    })
  }

  function toggleNote(item: ChecklistItem) {
    const isOpen = openNotes[item.id]
    if (!isOpen && !cl.notes[item.id]) {
      setNote(item.id, item.helperText)
    }
    setOpenNotes(prev => ({ ...prev, [item.id]: !isOpen }))
  }

  // ── DTI color ──────────────────────────────────────────────────────────────

  const dtiColor =
    calc.dti <= 30
      ? 'text-teal-600 dark:text-teal-400'
      : calc.dti <= 36.5
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  const dtiNote =
    calc.dti <= 30
      ? 'DTI within lender guidelines ✓'
      : calc.dti <= 36.5
      ? 'DTI elevated — confirm with lender'
      : 'DTI above conventional limit — review inputs'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Title row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Home Purchase Checklist
        </h1>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {totalChecked} / {totalRelevant} items · {progressPct}%
        </span>
      </div>

      {/* Scenario toggle */}
      <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl w-fit">
        {(['A', 'B'] as Scenario[]).map(s => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.97 }}
            onClick={() => toggleScenario(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              prefs.scenario === s
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {s === 'A' ? 'Scenario A: Sell Des Moines' : 'Scenario B: Keep as Rental'}
          </motion.button>
        ))}
      </div>

      {/* Calculator card */}
      <div className="card overflow-hidden">
        <div
          onClick={() => setCalcOpen(o => !o)}
          className="w-full px-4 py-3 flex items-center gap-2 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700/50 hover:bg-stone-100 dark:hover:bg-stone-700/40 transition-colors cursor-pointer"
        >
          <span className="font-semibold text-sm text-stone-700 dark:text-stone-300 flex-1 text-left">
            Mortgage Calculator
          </span>
          <div className="flex gap-2 mr-2">
            <button
              onClick={e => { e.stopPropagation(); updatePrefs({ price: 530000 }) }}
              className="px-2 py-0.5 text-xs rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
            >
              $530K
            </button>
            <button
              onClick={e => { e.stopPropagation(); updatePrefs({ price: 620000 }) }}
              className="px-2 py-0.5 text-xs rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
            >
              $620K
            </button>
          </div>
          <motion.span animate={{ rotate: calcOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={15} className="text-stone-400 flex-shrink-0" />
          </motion.span>
        </div>

        <AnimatePresence initial={false}>
          {calcOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                {/* Purchase price */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                    Purchase Price
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={300000} max={900000} step={5000}
                      value={prefs.price}
                      onChange={e => updatePrefs({ price: parseInt(e.target.value) })}
                      className="flex-1 accent-teal-600 h-1.5"
                    />
                    <input
                      type="number" min={300000} max={900000} step={5000}
                      value={prefs.price}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) updatePrefs({ price: v }) }}
                      className="input-field w-28 text-sm py-1 px-2"
                    />
                  </div>
                </div>

                {/* Down payment */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                    Down Payment — {prefs.downPct}%
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={3} max={40} step={1}
                      value={prefs.downPct}
                      onChange={e => updatePrefs({ downPct: parseInt(e.target.value) })}
                      className="flex-1 accent-teal-600 h-1.5"
                    />
                    <input
                      type="number" min={3} max={40} step={1}
                      value={prefs.downPct}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) updatePrefs({ downPct: v }) }}
                      className="input-field w-20 text-sm py-1 px-2"
                    />
                  </div>
                </div>

                {/* Interest rate */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                    Interest Rate — {prefs.rate.toFixed(3)}%
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={2} max={12} step={0.125}
                      value={prefs.rate}
                      onChange={e => updatePrefs({ rate: parseFloat(e.target.value) })}
                      className="flex-1 accent-teal-600 h-1.5"
                    />
                    <input
                      type="number" min={2} max={12} step={0.125}
                      value={prefs.rate}
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updatePrefs({ rate: v }) }}
                      className="input-field w-20 text-sm py-1 px-2"
                    />
                  </div>
                </div>

                {/* Loan term */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                    Loan Term
                  </label>
                  <select
                    value={prefs.term}
                    onChange={e => updatePrefs({ term: parseInt(e.target.value) })}
                    className="select-field text-sm py-1"
                  >
                    {[10, 15, 20, 25, 30].map(t => (
                      <option key={t} value={t}>{t} years</option>
                    ))}
                  </select>
                </div>

                {/* Annual income */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                    Annual Gross Income
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={80000} max={400000} step={1000}
                      value={prefs.annualIncome}
                      onChange={e => updatePrefs({ annualIncome: parseInt(e.target.value) })}
                      className="flex-1 accent-teal-600 h-1.5"
                    />
                    <input
                      type="number" min={80000} max={400000} step={1000}
                      value={prefs.annualIncome}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) updatePrefs({ annualIncome: v }) }}
                      className="input-field w-28 text-sm py-1 px-2"
                    />
                  </div>
                </div>

                {/* Property tax rate */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                    Property Tax Rate — {prefs.taxRate.toFixed(2)}%
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={0.1} max={3.0} step={0.05}
                      value={prefs.taxRate}
                      onChange={e => updatePrefs({ taxRate: parseFloat(e.target.value) })}
                      className="flex-1 accent-teal-600 h-1.5"
                    />
                    <input
                      type="number" min={0.1} max={3.0} step={0.05}
                      value={prefs.taxRate}
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updatePrefs({ taxRate: v }) }}
                      className="input-field w-20 text-sm py-1 px-2"
                    />
                  </div>
                </div>

                {/* Annual insurance */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                    Annual Insurance
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={500} max={8000} step={100}
                      value={prefs.annualInsurance}
                      onChange={e => updatePrefs({ annualInsurance: parseInt(e.target.value) })}
                      className="flex-1 accent-teal-600 h-1.5"
                    />
                    <input
                      type="number" min={500} max={8000} step={100}
                      value={prefs.annualInsurance}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) updatePrefs({ annualInsurance: v }) }}
                      className="input-field w-28 text-sm py-1 px-2"
                    />
                  </div>
                </div>

                {/* PMI rate — hidden when down >= 20% */}
                {prefs.downPct < 20 && (
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                      PMI Rate — {prefs.pmiRate.toFixed(2)}%
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={0.1} max={2.0} step={0.05}
                        value={prefs.pmiRate}
                        onChange={e => updatePrefs({ pmiRate: parseFloat(e.target.value) })}
                        className="flex-1 accent-teal-600 h-1.5"
                      />
                      <input
                        type="number" min={0.1} max={2.0} step={0.05}
                        value={prefs.pmiRate}
                        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updatePrefs({ pmiRate: v }) }}
                        className="input-field w-20 text-sm py-1 px-2"
                      />
                    </div>
                  </div>
                )}

                {/* Des Moines rent — Scenario B only */}
                {prefs.scenario === 'B' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">
                      Des Moines Monthly Rent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={800} max={4000} step={50}
                        value={prefs.desMoinesRent}
                        onChange={e => updatePrefs({ desMoinesRent: parseInt(e.target.value) })}
                        className="flex-1 accent-teal-600 h-1.5"
                      />
                      <input
                        type="number" min={800} max={4000} step={50}
                        value={prefs.desMoinesRent}
                        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) updatePrefs({ desMoinesRent: v }) }}
                        className="input-field w-28 text-sm py-1 px-2"
                      />
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Financial Summary card */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">Financial Summary</h2>
          <span className="text-xs text-stone-400 dark:text-stone-500">Live · updates with calculator</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Down payment */}
          <div className="rounded-xl bg-stone-50 dark:bg-stone-700/50 px-3 py-2.5">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">Down Payment</div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{fmt(calc.downAmt)}</div>
            <div className="text-xs text-stone-400 dark:text-stone-500">{prefs.downPct}%</div>
          </div>

          {/* Loan amount */}
          <div className="rounded-xl bg-stone-50 dark:bg-stone-700/50 px-3 py-2.5">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">Loan Amount</div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{fmt(calc.loan)}</div>
          </div>

          {/* Monthly P&I */}
          <div className="rounded-xl bg-stone-50 dark:bg-stone-700/50 px-3 py-2.5">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">Monthly P&amp;I</div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{fmt(calc.pAndI)}</div>
          </div>

          {/* Property tax */}
          <div className="rounded-xl bg-stone-50 dark:bg-stone-700/50 px-3 py-2.5">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">Property Tax</div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{fmt(calc.monthlyTax)}/mo</div>
          </div>

          {/* Insurance */}
          <div className="rounded-xl bg-stone-50 dark:bg-stone-700/50 px-3 py-2.5">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">Insurance</div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{fmt(calc.monthlyIns)}/mo</div>
          </div>

          {/* PMI — only when downPct < 20 */}
          {prefs.downPct < 20 && (
            <div className="rounded-xl bg-stone-50 dark:bg-stone-700/50 px-3 py-2.5">
              <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">PMI</div>
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{fmt(calc.monthlyPMI)}/mo</div>
            </div>
          )}

          {/* Total monthly */}
          <div className="rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 px-3 py-2.5">
            <div className="text-xs text-teal-600 dark:text-teal-400 mb-0.5">Total Monthly</div>
            <div className="text-sm font-bold text-teal-700 dark:text-teal-300">{fmt(calc.totalMonthly)}/mo</div>
          </div>

          {/* DTI */}
          <div className="rounded-xl bg-stone-50 dark:bg-stone-700/50 px-3 py-2.5">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">DTI</div>
            <div className={`text-sm font-bold ${dtiColor}`}>{calc.dti.toFixed(1)}%</div>
          </div>
        </div>

        {/* DTI note */}
        <p className={`text-xs ${dtiColor}`}>{dtiNote}</p>

        {/* Scenario B rental offset row */}
        {prefs.scenario === 'B' && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
            <p className="font-medium">Des Moines rental offset (Scenario B)</p>
            <p>
              ${prefs.desMoinesRent.toLocaleString()}/mo × 75% = {fmt(calc.rentalCredit)}/mo lender credit
              {calc.desMoinesNetDTIExposure > 0
                ? ` → net DTI exposure: ${fmt(calc.desMoinesNetDTIExposure)}/mo`
                : ' → Des Moines fully offset ✓'}
            </p>
          </div>
        )}

        {/* Buydown savings */}
        {(calc.year1Savings > 0 || calc.year2Savings > 0) && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
            <p className="font-medium">2-1 Buydown Savings (if negotiated)</p>
            <p>Year 1 ({Math.max(0, prefs.rate - 2).toFixed(3)}%): {fmt(calc.year1Savings)}/mo savings · Year 2 ({Math.max(0, prefs.rate - 1).toFixed(3)}%): {fmt(calc.year2Savings)}/mo savings</p>
          </div>
        )}

        {/* Palmetto Heroes reminder */}
        {prefs.scenario !== 'A' && (
          <p className="text-xs text-teal-600 dark:text-teal-400">
            SC side: Verify Palmetto Heroes eligibility — spouse RN license may qualify for rate reduction + DPA
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Overall Progress
          </span>
          <span className="text-xs text-stone-500 dark:text-stone-400">{progressPct}%</span>
        </div>
        <div className="h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-teal-500 dark:bg-teal-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Phase cards */}
      {PHASES.map(phase => {
        const relevantItems = phase.items.filter(i => isRelevant(i, prefs.scenario))
        const checkedCount = relevantItems.filter(i => cl.checkedItems[i.id]).length
        const isCollapsed = cl.collapsedPhases[phase.id]

        return (
          <div key={phase.id} className="card overflow-hidden">
            {/* Phase header */}
            <button
              onClick={() => togglePhase(phase.id)}
              className="w-full px-4 py-3 flex items-center gap-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700/50 hover:bg-stone-100 dark:hover:bg-stone-700/40 transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${phase.dotColor}`} />
              <span className="font-semibold text-sm text-stone-700 dark:text-stone-300 flex-1 text-left">
                {phase.label}
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">
                {checkedCount}/{relevantItems.length}
              </span>
              <motion.span
                animate={{ rotate: isCollapsed ? -90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} className="text-stone-400 flex-shrink-0" />
              </motion.span>
            </button>

            {/* Phase items */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-stone-50 dark:divide-stone-700/30">
                    {phase.items.map(item => (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        scenario={prefs.scenario}
                        checked={!!cl.checkedItems[item.id]}
                        note={cl.notes[item.id] ?? ''}
                        noteOpen={!!openNotes[item.id]}
                        onToggle={() => toggleItem(item.id)}
                        onSetNote={text => setNote(item.id, text)}
                        onToggleNote={() => toggleNote(item)}
                        onShowDetails={() => setModalItem(item)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Details modal */}
      <AnimatePresence>
        {modalItem && (
          <InfoModal item={modalItem} onClose={() => setModalItem(null)} />
        )}
      </AnimatePresence>

    </div>
  )
}
