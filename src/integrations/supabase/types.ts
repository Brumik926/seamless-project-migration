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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: string
          balance: number
          created_at: string
          currency: string
          iban: string
          id: string
          is_primary: boolean
          name: string
          user_id: string
        }
        Insert: {
          account_type?: string
          balance?: number
          created_at?: string
          currency?: string
          iban: string
          id?: string
          is_primary?: boolean
          name: string
          user_id: string
        }
        Update: {
          account_type?: string
          balance?: number
          created_at?: string
          currency?: string
          iban?: string
          id?: string
          is_primary?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      card_limits: {
        Row: {
          atm_daily: number
          card_id: string
          internet_daily: number
          pos_daily: number
          updated_at: string
          user_id: string
        }
        Insert: {
          atm_daily?: number
          card_id: string
          internet_daily?: number
          pos_daily?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          atm_daily?: number
          card_id?: string
          internet_daily?: number
          pos_daily?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_limits_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          account_id: string
          brand: string
          card_type: string
          contactless: boolean
          created_at: string
          credit_available: number | null
          credit_limit: number | null
          design: string
          expiry: string
          holder_name: string
          id: string
          internet_payments: boolean
          masked_number: string
          name: string
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          brand: string
          card_type: string
          contactless?: boolean
          created_at?: string
          credit_available?: number | null
          credit_limit?: number | null
          design?: string
          expiry: string
          holder_name?: string
          id?: string
          internet_payments?: boolean
          masked_number: string
          name: string
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          brand?: string
          card_type?: string
          contactless?: boolean
          created_at?: string
          credit_available?: number | null
          credit_limit?: number | null
          design?: string
          expiry?: string
          holder_name?: string
          id?: string
          internet_payments?: boolean
          masked_number?: string
          name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_templates: {
        Row: {
          amount: number | null
          constant_symbol: string | null
          created_at: string
          iban: string
          id: string
          message: string | null
          name: string
          recipient_name: string
          specific_symbol: string | null
          user_id: string
          variable_symbol: string | null
        }
        Insert: {
          amount?: number | null
          constant_symbol?: string | null
          created_at?: string
          iban: string
          id?: string
          message?: string | null
          name: string
          recipient_name: string
          specific_symbol?: string | null
          user_id?: string
          variable_symbol?: string | null
        }
        Update: {
          amount?: number | null
          constant_symbol?: string | null
          created_at?: string
          iban?: string
          id?: string
          message?: string | null
          name?: string
          recipient_name?: string
          specific_symbol?: string | null
          user_id?: string
          variable_symbol?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          city: string | null
          client_number: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          street: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          client_number?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          client_number?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          street?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      recipients: {
        Row: {
          created_at: string
          iban: string
          id: string
          is_favorite: boolean
          name: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          iban: string
          id?: string
          is_favorite?: boolean
          name: string
          note?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          iban?: string
          id?: string
          is_favorite?: boolean
          name?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      standing_orders: {
        Row: {
          account_id: string
          amount: number
          constant_symbol: string | null
          created_at: string
          end_date: string | null
          frequency: string
          iban: string
          id: string
          is_active: boolean
          last_executed_at: string | null
          message: string | null
          name: string
          next_date: string
          recipient_name: string
          specific_symbol: string | null
          user_id: string
          variable_symbol: string | null
        }
        Insert: {
          account_id: string
          amount: number
          constant_symbol?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          iban: string
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          message?: string | null
          name: string
          next_date: string
          recipient_name: string
          specific_symbol?: string | null
          user_id?: string
          variable_symbol?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          constant_symbol?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          iban?: string
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          message?: string | null
          name?: string
          next_date?: string
          recipient_name?: string
          specific_symbol?: string | null
          user_id?: string
          variable_symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standing_orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          id: string
          kind: string
          note: string | null
          phone: string
          preferred_at: string
          status: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          phone: string
          preferred_at: string
          status?: string
          topic?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          phone?: string
          preferred_at?: string
          status?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          balance_after: number | null
          booked_at: string
          card_id: string | null
          category: string
          co2_kg: number | null
          constant_symbol: string | null
          counterparty_iban: string | null
          counterparty_name: string
          created_at: string
          currency: string
          direction: string
          execution_date: string
          id: string
          idempotency_key: string | null
          message: string | null
          payer_reference: string | null
          specific_symbol: string | null
          standing_order_id: string | null
          status: string
          tx_type: string
          user_id: string
          variable_symbol: string | null
        }
        Insert: {
          account_id: string
          amount: number
          balance_after?: number | null
          booked_at?: string
          card_id?: string | null
          category?: string
          co2_kg?: number | null
          constant_symbol?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string
          created_at?: string
          currency?: string
          direction: string
          execution_date?: string
          id?: string
          idempotency_key?: string | null
          message?: string | null
          payer_reference?: string | null
          specific_symbol?: string | null
          standing_order_id?: string | null
          status?: string
          tx_type: string
          user_id: string
          variable_symbol?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number | null
          booked_at?: string
          card_id?: string | null
          category?: string
          co2_kg?: number | null
          constant_symbol?: string | null
          counterparty_iban?: string | null
          counterparty_name?: string
          created_at?: string
          currency?: string
          direction?: string
          execution_date?: string
          id?: string
          idempotency_key?: string | null
          message?: string | null
          payer_reference?: string | null
          specific_symbol?: string | null
          standing_order_id?: string | null
          status?: string
          tx_type?: string
          user_id?: string
          variable_symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_standing_order_id_fkey"
            columns: ["standing_order_id"]
            isOneToOne: false
            referencedRelation: "standing_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          hide_balances: boolean
          language: string
          nav_item: string
          notify_cards: boolean
          notify_marketing: boolean
          notify_payments: boolean
          show_cards: boolean
          show_quick_payment: boolean
          show_rates: boolean
          show_savings: boolean
          show_spending: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          hide_balances?: boolean
          language?: string
          nav_item?: string
          notify_cards?: boolean
          notify_marketing?: boolean
          notify_payments?: boolean
          show_cards?: boolean
          show_quick_payment?: boolean
          show_rates?: boolean
          show_savings?: boolean
          show_spending?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          hide_balances?: boolean
          language?: string
          nav_item?: string
          notify_cards?: boolean
          notify_marketing?: boolean
          notify_payments?: boolean
          show_cards?: boolean
          show_quick_payment?: boolean
          show_rates?: boolean
          show_savings?: boolean
          show_spending?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _fmt_eur: { Args: { p: number }; Returns: string }
      _notify: {
        Args: {
          p_body: string
          p_kind: string
          p_link?: string
          p_title: string
          p_user: string
        }
        Returns: undefined
      }
      _settle_outgoing: { Args: { p_tx_id: string }; Returns: boolean }
      bank_today: { Args: never; Returns: string }
      cancel_scheduled_payment: { Args: { p_tx_id: string }; Returns: boolean }
      execute_payment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category?: string
          p_constant_symbol?: string
          p_execution_date: string
          p_iban: string
          p_idempotency_key: string
          p_message?: string
          p_payer_reference?: string
          p_recipient_name: string
          p_specific_symbol?: string
          p_variable_symbol?: string
        }
        Returns: Json
      }
      generate_sk_iban: { Args: never; Returns: string }
      is_valid_iban: { Args: { p: string }; Returns: boolean }
      normalize_iban: { Args: { p: string }; Returns: string }
      process_due_items: { Args: never; Returns: number }
      seed_demo_data: {
        Args: { p_email: string; p_name: string; p_user: string }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
