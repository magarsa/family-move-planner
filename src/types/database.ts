export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          decision_made: string | null
          description: string | null
          id: string
          notes: string | null
          options: Json | null
          sort_order: number | null
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          decision_made?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          options?: Json | null
          sort_order?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          decision_made?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          options?: Json | null
          sort_order?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          author: string | null
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          branch_id: string | null
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          parent_id: string | null
          property_id: string | null
          sale_timeline_phase_id: string | null
          sort_order: number | null
          text: string
          tier: string
        }
        Insert: {
          branch_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          parent_id?: string | null
          property_id?: string | null
          sale_timeline_phase_id?: string | null
          sort_order?: number | null
          text: string
          tier: string
        }
        Update: {
          branch_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          parent_id?: string | null
          property_id?: string | null
          sale_timeline_phase_id?: string | null
          sort_order?: number | null
          text?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_improvements: {
        Row: {
          id: string
          property_id: string
          name: string
          description: string | null
          icon: string | null
          value_add_low: number | null
          value_add_high: number | null
          value_note: string | null
          status: string
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          property_id: string
          name: string
          description?: string | null
          icon?: string | null
          value_add_low?: number | null
          value_add_high?: number | null
          value_note?: string | null
          status?: string
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          name?: string
          description?: string | null
          icon?: string | null
          value_add_low?: number | null
          value_add_high?: number | null
          value_note?: string | null
          status?: string
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_improvements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_readiness_scores: {
        Row: {
          id: string
          property_id: string
          category: string
          score: number
          note: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          property_id: string
          category: string
          score: number
          note?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          category?: string
          score?: number
          note?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_readiness_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_scenarios: {
        Row: {
          id: string
          property_id: string
          scenario_number: number
          title: string
          description: string | null
          is_recommended: boolean | null
          prep_cost_low: number | null
          prep_cost_high: number | null
          prep_cost_mid: number | null
          sale_price_low: number | null
          sale_price_high: number | null
          net_proceeds_low: number | null
          net_proceeds_high: number | null
          warning_note: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          property_id: string
          scenario_number: number
          title: string
          description?: string | null
          is_recommended?: boolean | null
          prep_cost_low?: number | null
          prep_cost_high?: number | null
          prep_cost_mid?: number | null
          sale_price_low?: number | null
          sale_price_high?: number | null
          net_proceeds_low?: number | null
          net_proceeds_high?: number | null
          warning_note?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          scenario_number?: number
          title?: string
          description?: string | null
          is_recommended?: boolean | null
          prep_cost_low?: number | null
          prep_cost_high?: number | null
          prep_cost_mid?: number | null
          sale_price_low?: number | null
          sale_price_high?: number | null
          net_proceeds_low?: number | null
          net_proceeds_high?: number | null
          warning_note?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_scenarios_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_scenario_items: {
        Row: {
          id: string
          scenario_id: string
          label: string
          cost_low: number | null
          cost_high: number | null
          cost_fixed: number | null
          is_total: boolean | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          scenario_id: string
          label: string
          cost_low?: number | null
          cost_high?: number | null
          cost_fixed?: number | null
          is_total?: boolean | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          scenario_id?: string
          label?: string
          cost_low?: number | null
          cost_high?: number | null
          cost_fixed?: number | null
          is_total?: boolean | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_scenario_items_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "sale_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_timeline_phases: {
        Row: {
          id: string
          property_id: string
          phase_number: number
          week_label: string
          date_range: string | null
          title: string
          urgency: string | null
          completed: boolean | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          property_id: string
          phase_number: number
          week_label: string
          date_range?: string | null
          title: string
          urgency?: string | null
          completed?: boolean | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          property_id?: string
          phase_number?: number
          week_label?: string
          date_range?: string | null
          title?: string
          urgency?: string | null
          completed?: boolean | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_timeline_phases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_timeline_tasks: {
        Row: {
          id: string
          phase_id: string
          task_text: string
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          phase_id: string
          task_text: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          phase_id?: string
          task_text?: string
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_timeline_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "sale_timeline_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      whatifs: {
        Row: {
          branch: string | null
          id: string
          notes: string | null
          scenario: string
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          branch?: string | null
          id?: string
          notes?: string | null
          scenario: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          branch?: string | null
          id?: string
          notes?: string | null
          scenario?: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          address: string
          area: string | null
          status: string | null
          price: number | null
          beds: number | null
          baths: number | null
          sqft: number | null
          zillow_url: string | null
          notes: string | null
          branch_id: string | null
          visit_at: string | null
          visit_notes: string | null
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_analyzed_by: string | null
          added_by: string | null
          created_at: string | null
          updated_at: string | null
          updated_by: string | null
          proximity: Json | null
        }
        Insert: {
          id?: string
          address: string
          area?: string | null
          status?: string | null
          price?: number | null
          beds?: number | null
          baths?: number | null
          sqft?: number | null
          zillow_url?: string | null
          notes?: string | null
          branch_id?: string | null
          visit_at?: string | null
          visit_notes?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_analyzed_by?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          proximity?: Json | null
        }
        Update: {
          id?: string
          address?: string
          area?: string | null
          status?: string | null
          price?: number | null
          beds?: number | null
          baths?: number | null
          sqft?: number | null
          zillow_url?: string | null
          notes?: string | null
          branch_id?: string | null
          visit_at?: string | null
          visit_notes?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_analyzed_by?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          proximity?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          id: string
          name: string
          district: string | null
          area: string | null
          grades: string | null
          school_type: string | null
          greatschools_url: string | null
          notes: string | null
          status: string | null
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_analyzed_by: string | null
          added_by: string | null
          created_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          district?: string | null
          area?: string | null
          grades?: string | null
          school_type?: string | null
          greatschools_url?: string | null
          notes?: string | null
          status?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_analyzed_by?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          district?: string | null
          area?: string | null
          grades?: string | null
          school_type?: string | null
          greatschools_url?: string | null
          notes?: string | null
          status?: string | null
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_analyzed_by?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          name: string
          role: string | null
          company: string | null
          phone: string | null
          email: string | null
          website: string | null
          status: string | null
          notes: string | null
          linked_property_id: string | null
          added_by: string | null
          created_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          role?: string | null
          company?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          status?: string | null
          notes?: string | null
          linked_property_id?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          role?: string | null
          company?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          status?: string | null
          notes?: string | null
          linked_property_id?: string | null
          added_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_linked_property_id_fkey"
            columns: ["linked_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          id: string
          contact_id: string
          content: string
          note_type: string | null
          amount: number | null
          note_date: string | null
          added_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          contact_id: string
          content: string
          note_type?: string | null
          amount?: number | null
          note_date?: string | null
          added_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          contact_id?: string
          content?: string
          note_type?: string | null
          amount?: number | null
          note_date?: string | null
          added_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_schools: {
        Row: {
          property_id: string
          school_id: string
        }
        Insert: {
          property_id: string
          school_id: string
        }
        Update: {
          property_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_schools_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          id: string
          report_type: string
          title: string
          html_content: string | null
          status: string
          requested_by: string | null
          generated_by: string | null
          error_message: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          report_type: string
          title: string
          html_content?: string | null
          status?: string
          requested_by?: string | null
          generated_by?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          report_type?: string
          title?: string
          html_content?: string | null
          status?: string
          requested_by?: string | null
          generated_by?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
