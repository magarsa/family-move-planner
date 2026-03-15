import { supabase } from './supabase'

export interface NearbyPlace {
  name: string
  distanceMi: number
  rating?: number
}

export interface NearbySchool {
  name: string
  distanceMi: number
  vicinity?: string
}

export interface WalkScore {
  walk: number
  transit: number
  bike: number
  description: string
}

export interface FloodZone {
  zone: string
  description: string
}

export interface Hazard {
  name: string
  type: string
  distanceMi: number
}

export interface ProximityData {
  grocery: NearbyPlace[]
  pharmacy: NearbyPlace[]
  parks: NearbyPlace[]
  dining: NearbyPlace[]
  shopping: NearbyPlace[]
  schools: NearbySchool[]
  walkScore: WalkScore | null
  floodZone: FloodZone | null
  hazards: Hazard[]
}

export interface PropertyAutofill {
  beds: number | null
  baths: number | null
  sqft: number | null
  price: number | null
  area: string | null
  zillow_url: string
  notes_prefix: string | null
}

export interface LookupResult {
  autofill: PropertyAutofill
  proximity: ProximityData | null
}

export async function lookupProperty(address: string, propertyId?: string): Promise<LookupResult> {
  const { data, error } = await supabase.functions.invoke('lookup-property', {
    body: { address, propertyId },
  })

  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error || 'Lookup failed')

  return data as LookupResult
}
