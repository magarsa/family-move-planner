// Generates an .ics (iCalendar) file from property visits and key dates.
// Purely client-side — no external service needed.

interface CalEvent {
  uid:         string
  summary:     string
  description?: string
  dtstart:     Date
  dtend?:      Date
  allDay?:     boolean
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function toIcsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`
}

function toIcsDt(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00Z`
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function buildVEvent(ev: CalEvent): string {
  const now    = toIcsDt(new Date())
  const start  = ev.allDay ? `DTSTART;VALUE=DATE:${toIcsDate(ev.dtstart)}` : `DTSTART:${toIcsDt(ev.dtstart)}`
  const end    = ev.dtend
    ? (ev.allDay ? `DTEND;VALUE=DATE:${toIcsDate(ev.dtend)}` : `DTEND:${toIcsDt(ev.dtend)}`)
    : (ev.allDay
        ? `DTEND;VALUE=DATE:${toIcsDate(new Date(ev.dtstart.getTime() + 86400000))}`
        : `DTEND:${toIcsDt(new Date(ev.dtstart.getTime() + 3600000))}`)

  return [
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${now}`,
    start,
    end,
    `SUMMARY:${escape(ev.summary)}`,
    ev.description ? `DESCRIPTION:${escape(ev.description)}` : '',
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')
}

function buildIcs(events: CalEvent[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Move Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Family Move Planner',
    'X-WR-TIMEZONE:America/New_York',
    ...events.map(buildVEvent),
    'END:VCALENDAR',
  ].join('\r\n')
}

function downloadIcs(content: string, filename = 'move-plan.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Main export function ────────────────────────────────────────────────────

export interface MoveCalendarData {
  properties: Array<{
    id:       string
    address:  string | null
    area:     string | null
    visit_at: string | null
  }>
  profile: Array<{ key: string; value: string | null }>
}

export function exportMoveCalendar(data: MoveCalendarData): void {
  const pMap = Object.fromEntries(data.profile.map(r => [r.key, r.value ?? '']))
  const events: CalEvent[] = []

  // 1. Property visits
  for (const p of data.properties) {
    if (!p.visit_at) continue
    const d = new Date(p.visit_at)
    if (isNaN(d.getTime())) continue
    events.push({
      uid:         `visit-${p.id}@fmp`,
      summary:     `🏡 Visit: ${p.address?.split(',')[0] ?? p.area ?? 'Property'}`,
      description: p.address ?? '',
      dtstart:     d,
    })
  }

  // 2. Move start date
  if (pMap.move_start_date) {
    const d = new Date(pMap.move_start_date)
    if (!isNaN(d.getTime())) {
      events.push({
        uid:     'move-start@fmp',
        summary: '📦 Move Planning Starts',
        dtstart: d,
        allDay:  true,
      })
    }
  }

  // 3. Target move date
  if (pMap.move_target_date) {
    const d = new Date(pMap.move_target_date)
    if (!isNaN(d.getTime())) {
      events.push({
        uid:     'move-target@fmp',
        summary: '🏠 Target Move Date',
        dtstart: d,
        allDay:  true,
      })
    }
  }

  if (events.length === 0) {
    alert('No dates to export yet. Schedule property visits or set move dates in your Profile.')
    return
  }

  downloadIcs(buildIcs(events))
}
