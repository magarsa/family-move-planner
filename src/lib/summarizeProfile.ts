import { supabase } from './supabase'

export interface ProfilePriorities {
  must: string[]
  dealbreak: string[]
  strong: string[]
}

export async function summarizeProfile(priorities: ProfilePriorities): Promise<string> {
  const { data, error } = await supabase.functions.invoke('summarize-profile', {
    body: { priorities },
  })

  if (error) {
    throw new Error(error.message || 'Edge function invocation failed')
  }

  if (!data?.ok || typeof data?.summary !== 'string') {
    throw new Error(data?.error || 'No summary returned from edge function')
  }

  return data.summary
}
