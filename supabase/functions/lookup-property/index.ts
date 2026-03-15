import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface RentCastProperty {
  bedrooms?: number
  bathrooms?: number
  squareFootage?: number
  price?: number
  lastSalePrice?: number
  city?: string
  state?: string
  zipCode?: string
  yearBuilt?: number
  lotSize?: number
  propertyType?: string
  latitude?: number
  longitude?: number
}

interface RentCastListing {
  price?: number
  listPrice?: number
}

interface PlacesResult {
  name: string
  vicinity?: string
  rating?: number
  geometry?: { location: { lat: number; lng: number } }
  types?: string[]
}

interface NearbyPlace {
  name: string
  distanceMi: number
  rating?: number
}

interface ProximityData {
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

interface NearbySchool {
  name: string
  distanceMi: number
  vicinity?: string
  types?: string[]
}

interface WalkScore {
  walk: number
  transit: number
  bike: number
  description: string
}

interface FloodZone {
  zone: string
  description: string
}

interface Hazard {
  name: string
  type: string
  distanceMi: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function distanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function floodZoneDescription(zone: string): string {
  if (zone.startsWith('AE') || zone.startsWith('AH') || zone.startsWith('AO') || zone === 'A') {
    return 'High flood risk — base flood zone'
  }
  if (zone.startsWith('VE') || zone === 'V') return 'High flood risk — coastal'
  if (zone === 'X' || zone === 'B' || zone === 'C') return 'Minimal flood hazard'
  if (zone.startsWith('A')) return 'Moderate-to-high flood risk'
  return zone
}

function schoolTypeFromPlaces(types: string[] = []): string {
  if (types.includes('secondary_school')) return 'Public'
  if (types.includes('primary_school')) return 'Public'
  if (types.includes('university')) return 'Private'
  return 'Public'
}

function gradesFromPlaces(types: string[] = []): string | null {
  if (types.includes('primary_school')) return 'K-5'
  if (types.includes('secondary_school')) return '9-12'
  return null
}

async function fetchPlaces(
  lat: number,
  lng: number,
  placeType: string,
  radiusMeters: number,
  apiKey: string
): Promise<PlacesResult[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${placeType}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json() as { results?: PlacesResult[] }
  return data.results || []
}

function topPlaces(results: PlacesResult[], lat: number, lng: number, limit = 3): NearbyPlace[] {
  return results
    .map(r => ({
      name: r.name,
      distanceMi: r.geometry
        ? Math.round(distanceMi(lat, lng, r.geometry.location.lat, r.geometry.location.lng) * 10) / 10
        : 999,
      rating: r.rating,
    }))
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, limit)
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address, propertyId } = await req.json() as { address: string; propertyId?: string }

    if (!address?.trim()) {
      return new Response(
        JSON.stringify({ error: 'address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rentcastKey = Deno.env.get('RENTCAST_API_KEY')
    const googleKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    console.log('[lookup-property] address:', address)
    console.log('[lookup-property] keys present — rentcast:', !!rentcastKey, 'google:', !!googleKey)

    // ── 1. RentCast property lookup ──────────────────────────────────────────
    let property: RentCastProperty = {}
    let listing: RentCastListing | null = null
    if (rentcastKey) {
      const [rcRes, listingRes] = await Promise.all([
        fetch(
          `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(address)}&limit=1`,
          { headers: { 'X-Api-Key': rentcastKey, 'Accept': 'application/json' } }
        ),
        fetch(
          `https://api.rentcast.io/v1/listings/sale?address=${encodeURIComponent(address)}&limit=1`,
          { headers: { 'X-Api-Key': rentcastKey, 'Accept': 'application/json' } }
        ),
      ])
      console.log('[lookup-property] rentcast /properties status:', rcRes.status)
      console.log('[lookup-property] rentcast /listings/sale status:', listingRes.status)
      if (rcRes.ok) {
        const rcData = await rcRes.json() as RentCastProperty[] | RentCastProperty
        property = Array.isArray(rcData) ? (rcData[0] || {}) : rcData
      }
      if (listingRes.ok) {
        const listingData = await listingRes.json() as RentCastListing[] | RentCastListing
        listing = Array.isArray(listingData) ? (listingData[0] || null) : listingData
      }
    }

    const lat = property.latitude
    const lng = property.longitude
    const city = property.city || ''
    const state = property.state || ''

    console.log('[lookup-property] lat:', lat, 'lng:', lng, 'city:', city, 'state:', state)
    const area = city && state ? `${city}, ${state}` : ''

    // Build a Zillow search URL from address
    const zillowSlug = address.trim().replace(/\s+/g, '-').replace(/[,#]/g, '')
    const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(zillowSlug)}_rb/`

    // Notes prefix from extra property data
    const noteParts: string[] = []
    if (property.yearBuilt) noteParts.push(`Year built: ${property.yearBuilt}`)
    if (property.lotSize) noteParts.push(`Lot: ${(property.lotSize / 43560).toFixed(2)} acres`)
    if (property.propertyType) noteParts.push(`Type: ${property.propertyType}`)
    const listPrice = listing?.price || listing?.listPrice || null
    const fallbackPrice = property.price || property.lastSalePrice || null
    if (!listPrice && fallbackPrice) noteParts.push('Price: estimated value (no active listing found)')
    const notesPrefix = noteParts.length ? noteParts.join(' · ') : null

    // Property autofill fields
    const autofill = {
      beds: property.bedrooms ?? null,
      baths: property.bathrooms ?? null,
      sqft: property.squareFootage ?? null,
      price: listPrice || fallbackPrice,
      area: area || null,
      zillow_url: zillowUrl,
      notes_prefix: notesPrefix,
    }

    // ── 2. Proximity data (parallel, only if we have lat/lng) ────────────────
    let proximity: ProximityData | null = null

    if (lat && lng && googleKey) {
      const RADIUS = 8000 // ~5 miles in meters

      const [
        groceryResults,
        pharmacyResults,
        parkResults,
        diningResults,
        shoppingResults,
        schoolResults,
        primarySchoolResults,
        secondarySchoolResults,
      ] = await Promise.all([
        fetchPlaces(lat, lng, 'grocery_or_supermarket', RADIUS, googleKey),
        fetchPlaces(lat, lng, 'pharmacy', RADIUS, googleKey),
        fetchPlaces(lat, lng, 'park', RADIUS, googleKey),
        fetchPlaces(lat, lng, 'restaurant', RADIUS, googleKey),
        fetchPlaces(lat, lng, 'shopping_mall', RADIUS, googleKey),
        fetchPlaces(lat, lng, 'school', RADIUS, googleKey),
        fetchPlaces(lat, lng, 'primary_school', RADIUS, googleKey),
        fetchPlaces(lat, lng, 'secondary_school', RADIUS, googleKey),
      ])

      // Merge and deduplicate schools by name (case-insensitive)
      const seenSchools = new Set<string>()
      const dedupedSchools = [...schoolResults, ...primarySchoolResults, ...secondarySchoolResults].filter(r => {
        const key = r.name.toLowerCase()
        if (seenSchools.has(key)) return false
        seenSchools.add(key)
        return true
      })

      // FEMA flood zone
      let floodZone: FloodZone | null = null
      try {
        const femaRes = await fetch(
          `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE&returnGeometry=false&f=json`
        )
        if (femaRes.ok) {
          const femaData = await femaRes.json() as { features?: Array<{ attributes?: { FLD_ZONE?: string } }> }
          const zone = femaData.features?.[0]?.attributes?.FLD_ZONE
          if (zone) {
            floodZone = { zone, description: floodZoneDescription(zone) }
          }
        }
      } catch { /* non-critical */ }

      // EPA hazards (FRS facility search within ~1 mile = 1609m)
      const hazards: Hazard[] = []
      try {
        const epaRes = await fetch(
          `https://data.epa.gov/efservice/FACILITY_SEARCH/LATITUDE/${lat - 0.02}:${lat + 0.02}/LONGITUDE/${lng - 0.02}:${lng + 0.02}/JSON`
        )
        if (epaRes.ok) {
          const epaData = await epaRes.json() as Array<{
            FACILITY_NAME?: string
            PRIMARY_SIC_CODE_DESCRIPTION?: string
            LATITUDE83?: number
            LONGITUDE83?: number
          }>
          for (const facility of (epaData || []).slice(0, 20)) {
            if (!facility.LATITUDE83 || !facility.LONGITUDE83) continue
            const d = distanceMi(lat, lng, facility.LATITUDE83, facility.LONGITUDE83)
            if (d <= 1.0) {
              hazards.push({
                name: facility.FACILITY_NAME || 'Unknown facility',
                type: facility.PRIMARY_SIC_CODE_DESCRIPTION || 'Industrial',
                distanceMi: Math.round(d * 10) / 10,
              })
            }
          }
        }
      } catch { /* non-critical */ }

      proximity = {
        grocery: topPlaces(groceryResults, lat, lng),
        pharmacy: topPlaces(pharmacyResults, lat, lng),
        parks: topPlaces(parkResults, lat, lng),
        dining: topPlaces(diningResults, lat, lng, 2),
        shopping: topPlaces(shoppingResults, lat, lng, 2),
        schools: dedupedSchools
          .map(r => ({
            name: r.name,
            distanceMi: r.geometry
              ? Math.round(distanceMi(lat, lng, r.geometry.location.lat, r.geometry.location.lng) * 10) / 10
              : 999,
            vicinity: r.vicinity,
            types: r.types,
          }))
          .sort((a, b) => a.distanceMi - b.distanceMi)
          .slice(0, 10),
        walkScore: null,
        floodZone,
        hazards,
      }

      // ── 3. Upsert nearby schools into schools table and link to property ────
      if (propertyId && proximity.schools.length > 0) {
        const supabase = createClient(supabaseUrl, serviceKey)

        for (const school of proximity.schools) {
          // Check for existing school by name (case-insensitive)
          const { data: existing } = await supabase
            .from('schools')
            .select('id')
            .ilike('name', school.name)
            .limit(1)
            .single()

          let schoolId: string

          if (existing?.id) {
            schoolId = existing.id
          } else {
            // Insert new school with basic info
            const { data: inserted } = await supabase
              .from('schools')
              .insert({
                name: school.name,
                school_type: schoolTypeFromPlaces(school.types),
                grades: gradesFromPlaces(school.types),
                area: area || null,
                notes: school.vicinity || null,
                status: 'Researching',
              })
              .select('id')
              .single()

            if (!inserted?.id) continue
            schoolId = inserted.id
          }

          // Link to property (ignore conflict — already linked is fine)
          await supabase
            .from('property_schools')
            .upsert({ property_id: propertyId, school_id: schoolId })
        }
      }
    }

    console.log('[lookup-property] proximity null?', proximity === null)
    if (proximity) {
      console.log('[lookup-property] proximity grocery count:', proximity.grocery.length)
      console.log('[lookup-property] proximity schools count:', proximity.schools.length)
      console.log('[lookup-property] floodZone:', proximity.floodZone?.zone ?? 'none')
    }

    return new Response(
      JSON.stringify({ ok: true, autofill, proximity }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('lookup-property error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
