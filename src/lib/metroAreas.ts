export const METRO_AREAS: Record<string, string[]> = {
  Charlotte: [
    'Fort Mill, SC', 'Tega Cay, SC', 'Clover, SC', 'Lake Wylie, SC', 'Indian Land, SC',
    'Waxhaw, NC', 'Huntersville, NC', 'Concord, NC', 'Monroe, NC', 'Mooresville, NC',
  ],
  'Greenville SC': [
    'Greenville, SC', 'Simpsonville, SC', 'Mauldin, SC', 'Greer, SC',
    'Taylors, SC', 'Fountain Inn, SC', 'Powdersville, SC',
  ],
  'Raleigh NC': [
    'Raleigh, NC', 'Cary, NC', 'Apex, NC', 'Morrisville, NC', 'Wake Forest, NC',
    'Holly Springs, NC', 'Fuquay-Varina, NC', 'Durham, NC', 'Chapel Hill, NC',
  ],
}

export const AREA_OPTIONS = [
  ...METRO_AREAS['Charlotte'],
  ...METRO_AREAS['Greenville SC'],
  ...METRO_AREAS['Raleigh NC'],
  'Other',
]

export const METRO_FILTERS = ['All', 'Charlotte', 'Greenville SC', 'Raleigh NC'] as const
export type MetroFilter = typeof METRO_FILTERS[number]
