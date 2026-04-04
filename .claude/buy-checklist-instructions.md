Before building the Home Purchase Checklist feature, I want you to understand 
the financial context and scenarios that drove this checklist. This background 
should inform any labels, notes, helper text, or scenario toggles you build 
into the feature.

## Our Situation

- Family of 4 relocating from Des Moines, IA to Charlotte metro area (NC/SC border: 
  Indian Land, Fort Mill, Tega Cay, Waxhaw) by July 2026
- Joint income: $161,000/year (~$13,417/mo gross, ~$7,500/mo take-home)
- I am Software Engineer III working remote at an Insurance Comapany with great benefits and 118K/year base salary
- Spouse is a Registered Nurse (RN) — qualifies for SC Palmetto Heroes program
- Two kids (ages 5 and 2)

## Des Moines Property

- Purchase price: $231,500
- Remaining principal: $196,994
- Estimated current value: $340,000
- Gross equity: ~$143,000
- Net equity if sold (~6% selling costs): ~$122,600
- Current monthly payment (PITI + PMI + Escrow): ~$1,900/mo
- Plan: rent to family members who will maintain property and cover mortgage
- Because it's rented to family, there is no property management cost or hassle

## Charlotte Home Budget

Two price points being evaluated:
- Minimum target: $520,000
- Maximum target: $620,000

Down payment available from savings: up to 10%

## Two Core Scenarios Being Evaluated

### Scenario A — Sell Des Moines, Roll Equity Into Charlotte
- Net proceeds (~$122K) used as ~20% down on Charlotte home
- Eliminates PMI entirely
- Cleaner DTI, simpler lender approval
- Loses Des Moines as an appreciating asset

At $530K Charlotte home:
- Loan: $424K | Monthly PITI: ~$3,501 | DTI: ~24.3% ✅

At $620K Charlotte home:
- Loan: $498K | Monthly PITI: ~$4,109 | DTI: ~28.5% ✅

### Scenario B — Keep Des Moines as Rental, 10% Down on Charlotte
- Family covers Des Moines mortgage entirely (~$1,900/mo)
- 10% down from savings on Charlotte
- Lender will require formal signed lease (market rate) to count rental income offset
- Lender will apply 75% of rental income to offset Des Moines mortgage in DTI calc
- Retains $143K+ in Des Moines equity, builds dual appreciation
- Carries PMI on Charlotte until ~20% equity reached

At $530K Charlotte home:
- Loan: $477K | Monthly: ~$4,092 (incl. PMI ~$239) | DTI: ~31.7% ✅

At $620K Charlotte home:
- Loan: $558K | Monthly: ~$4,788 (incl. PMI ~$279) | DTI: ~36.5% ✅

## Key Money-Saving Strategies Identified

These should be reflected as checklist items with context:

1. **Palmetto Heroes Program (SC Housing)** — Spouse's RN license qualifies for 
   reduced rate + up to $8–12K down payment assistance. Only applies to SC-side 
   purchase. Income/price limits need verification (~$530K is borderline).

2. **Mortgage Recast** — If keeping Des Moines, plan to eventually sell it and 
   apply lump sum equity to Charlotte principal. Lender re-amortizes at same rate 
   with no refinance costs. Saves $800+/mo. Must confirm loan is conventional 
   Fannie/Freddie at origination.

3. **SC Homestead Exemption** — Primary residence assessed at 4% vs 6%. Saves 
   $2,500–3,500/year in property taxes permanently. Must apply within 90 days 
   of closing.

4. **Seller-Paid 2-1 Buydown** — Negotiate seller to fund buydown escrow. 
   Year 1 rate 2% below note rate, Year 2 1% below. Saves ~$718/mo in Year 1 
   on a $558K loan. Redirect savings to principal paydown.

5. **80-10-10 Piggyback Loan** — Avoids PMI without 20% down. 80% first 
   mortgage + 10% second loan + 10% cash. Second loan paid off aggressively.

6. **Des Moines Rental Depreciation** — $231,500 purchase price ÷ 27.5 years = 
   ~$8,400/year non-cash deduction offsetting ordinary income. CPA required.

7. **Float-Down Rate Lock** — Lock rate with option to capture lower rate if 
   market drops before closing.

8. **Property Tax Appeal** — Appeal assessed value after first notice if 
   over-assessed. Contingency-based consultants available.

9. **PMI Early Cancellation** — Once Charlotte home appreciates to 20% equity 
   threshold, order appraisal and request PMI removal. Charlotte market 
   appreciation may accelerate this.

10. **Buy-and-Refi Strategy** — Rates currently elevated (~7%). Plan to refi 
    when rates drop ≥0.75%. Break-even on refi costs at ~$456/mo savings 
    is 9–15 months.

## FHA Loan Status

FHA is NOT viable for this purchase. Charlotte MSA FHA loan limits (~$498–524K) 
are exceeded by both price points at 10% down. Conventional loan only.

## Preferred Charlotte Communities (in priority order)

SC side: Indian Land, Fort Mill, Tega Cay
NC side: Waxhaw

SC side is preferred if Palmetto Heroes program is confirmed eligible, 
otherwise NC side is equally considered.

## How to Use This Context in the Feature

The checklist should:
- Allow the user to select which scenario they are pursuing (A or B) and 
  filter or highlight relevant checklist items accordingly
- Show the relevant monthly payment and DTI for the selected scenario + 
  price point combination
- Flag items that are scenario-specific (e.g., recast planning only matters 
  in Scenario B; Palmetto Heroes only matters on SC-side purchase)
- Allow price point toggle ($530K vs $620K) that updates displayed numbers
- Each checklist item's notes field should pre-populate with the relevant 
  financial context above as helper text so I don't have to remember the 
  details while I'm in the field talking to lenders