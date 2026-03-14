import { supabase } from './supabase'
import type { AiAnalysis, AnalysisEntityType } from '../types/analysis'

export async function analyzeEntity(
  entityType: AnalysisEntityType,
  entityId: string,
  entityData: Record<string, unknown>
): Promise<AiAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze', {
    body: { entityType, entityId, entityData },
  })

  if (error) {
    throw new Error(error.message || 'Edge function invocation failed')
  }

  if (!data?.ok || !data?.analysis) {
    throw new Error(data?.error || 'No analysis returned from Edge Function')
  }

  return data.analysis as AiAnalysis
}
