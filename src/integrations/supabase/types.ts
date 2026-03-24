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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      dca_scenarios: {
        Row: {
          budget_invested: number
          budget_percent_used: number | null
          buy_price: number | null
          created_at: string
          fee_amount: number
          fee_applied: number
          holding_id: string
          id: string
          include_fees: boolean
          input1_label: string
          input1_value: number
          input2_label: string
          input2_value: number
          method: string
          new_avg_cost: number
          new_total_shares: number
          notes: string | null
          recommended_target: number | null
          shares_to_buy: number
          ticker: string
          total_spend: number
        }
        Insert: {
          budget_invested: number
          budget_percent_used?: number | null
          buy_price?: number | null
          created_at?: string
          fee_amount: number
          fee_applied: number
          holding_id: string
          id?: string
          include_fees: boolean
          input1_label: string
          input1_value: number
          input2_label: string
          input2_value: number
          method: string
          new_avg_cost: number
          new_total_shares: number
          notes?: string | null
          recommended_target?: number | null
          shares_to_buy: number
          ticker: string
          total_spend: number
        }
        Update: {
          budget_invested?: number
          budget_percent_used?: number | null
          buy_price?: number | null
          created_at?: string
          fee_amount?: number
          fee_applied?: number
          holding_id?: string
          id?: string
          include_fees?: boolean
          input1_label?: string
          input1_value?: number
          input2_label?: string
          input2_value?: number
          method?: string
          new_avg_cost?: number
          new_total_shares?: number
          notes?: string | null
          recommended_target?: number | null
          shares_to_buy?: number
          ticker?: string
          total_spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "dca_scenarios_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          avg_cost: number
          created_at: string
          fee: number
          fee_type: string
          fee_value: number
          id: string
          shares: number
          ticker: string
        }
        Insert: {
          avg_cost: number
          created_at?: string
          fee?: number
          fee_type?: string
          fee_value?: number
          id?: string
          shares: number
          ticker: string
        }
        Update: {
          avg_cost?: number
          created_at?: string
          fee?: number
          fee_type?: string
          fee_value?: number
          id?: string
          shares?: number
          ticker?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          holding_id: string
          ticker: string
          transaction_type: string
          buy_price: number
          shares_bought: number
          budget_invested: number
          fee_applied: number
          total_spend: number
          include_fees: boolean
          fee_type_snapshot: string
          fee_value_snapshot: number
          previous_shares: number
          previous_avg_cost: number
          new_total_shares: number
          new_avg_cost: number
          method: string
          notes: string | null
          is_undone: boolean
          undone_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          holding_id: string
          ticker: string
          transaction_type?: string
          buy_price: number
          shares_bought: number
          budget_invested: number
          fee_applied?: number
          total_spend: number
          include_fees?: boolean
          fee_type_snapshot?: string
          fee_value_snapshot?: number
          previous_shares: number
          previous_avg_cost: number
          new_total_shares: number
          new_avg_cost: number
          method: string
          notes?: string | null
          is_undone?: boolean
          undone_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          holding_id?: string
          ticker?: string
          transaction_type?: string
          buy_price?: number
          shares_bought?: number
          budget_invested?: number
          fee_applied?: number
          total_spend?: number
          include_fees?: boolean
          fee_type_snapshot?: string
          fee_value_snapshot?: number
          previous_shares?: number
          previous_avg_cost?: number
          new_total_shares?: number
          new_avg_cost?: number
          method?: string
          notes?: string | null
          is_undone?: boolean
          undone_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      what_if_comparisons: {
        Row: {
          created_at: string
          id: string
          scenarios: Json
          total_budget: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scenarios?: Json
          total_budget: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scenarios?: Json
          total_budget?: number
          user_id?: string
        }
        Relationships: []
      }
      optimization_scenarios: {
        Row: {
          allocation_results_json: string
          created_at: string
          id: string
          include_fees: boolean
          name: string
          optimization_mode: string
          projected_portfolio_avg: number
          selected_holdings_json: string
          total_budget: number
          total_fees: number
          total_spend: number
          user_id: string
        }
        Insert: {
          allocation_results_json?: string
          created_at?: string
          id?: string
          include_fees?: boolean
          name: string
          optimization_mode: string
          projected_portfolio_avg?: number
          selected_holdings_json?: string
          total_budget: number
          total_fees?: number
          total_spend?: number
          user_id: string
        }
        Update: {
          allocation_results_json?: string
          created_at?: string
          id?: string
          include_fees?: boolean
          name?: string
          optimization_mode?: string
          projected_portfolio_avg?: number
          selected_holdings_json?: string
          total_budget?: number
          total_fees?: number
          total_spend?: number
          user_id?: string
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
