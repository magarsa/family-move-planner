export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface AiAnalysisCategory {
  grade: Grade
  label: string  // e.g. "Schools", "Budget Fit"
  icon: string   // emoji e.g. "🎓"
  text: string   // 1-2 sentence explanation
}

export interface AiAnalysis {
  overallGrade: Grade
  summary: string                              // 2-3 sentence overview
  categories: Record<string, AiAnalysisCategory>
  pros: string[]                               // 3-5 items
  cons: string[]                               // 2-4 items
  warnings: string[]                           // 0-3 amber-flag items
  verdict: string                              // one-sentence bottom line
  analyzedAt: string                           // ISO timestamp
  modelUsed: string
}

export type AnalysisEntityType = 'property' | 'school'
