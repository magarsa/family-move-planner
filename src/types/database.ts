export interface Database {
  public: {
    Tables: {
      profile: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'updated_at'>
        Update: Partial<Omit<ProfileRow, 'key'>>
      }
      branches: {
        Row: BranchRow
        Insert: Omit<BranchRow, 'id' | 'updated_at'>
        Update: Partial<Omit<BranchRow, 'id'>>
      }
      todos: {
        Row: TodoRow
        Insert: Omit<TodoRow, 'id' | 'created_at'>
        Update: Partial<Omit<TodoRow, 'id'>>
      }
      whatifs: {
        Row: WhatIfRow
        Insert: Omit<WhatIfRow, 'id' | 'updated_at'>
        Update: Partial<Omit<WhatIfRow, 'id'>>
      }
      notes: {
        Row: NoteRow
        Insert: Omit<NoteRow, 'id' | 'created_at'>
        Update: Partial<Omit<NoteRow, 'id'>>
      }
    }
  }
}

export interface ProfileRow {
  key: string
  value: string | null
  updated_at: string
  updated_by: string | null
}

export interface BranchOption {
  label: string
  pros: string[]
  cons: string[]
}

export interface BranchRow {
  id: string
  title: string
  description: string | null
  status: 'Open' | 'In Progress' | 'Decided'
  decision_made: string | null
  options: BranchOption[] | null
  notes: string | null
  sort_order: number | null
  updated_at: string
  updated_by: string | null
}

export interface TodoRow {
  id: string
  text: string
  tier: 'Do First' | 'Do Soon' | 'Do When Ready' | 'Later'
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  branch_id: string | null
  created_at: string
  created_by: string | null
  sort_order: number | null
}

export interface WhatIfRow {
  id: string
  scenario: string
  branch: string | null
  status: 'Unplanned' | 'Monitoring' | 'Triggered' | 'Resolved'
  notes: string | null
  updated_at: string
  updated_by: string | null
}

export interface NoteRow {
  id: string
  content: string
  author: string | null
  created_at: string
}
