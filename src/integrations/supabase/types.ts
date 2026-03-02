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
      active_benches: {
        Row: {
          bench_number: number
          created_at: string
          last_seen: string
          session_id: string
        }
        Insert: {
          bench_number: number
          created_at?: string
          last_seen?: string
          session_id: string
        }
        Update: {
          bench_number?: number
          created_at?: string
          last_seen?: string
          session_id?: string
        }
        Relationships: []
      }
      motoristas_base_dia: {
        Row: {
          data_importacao: string
          id: string
          id_motorista: string
          nome: string
          rota: string
          tipo_veiculo: string | null
        }
        Insert: {
          data_importacao?: string
          id?: string
          id_motorista: string
          nome: string
          rota: string
          tipo_veiculo?: string | null
        }
        Update: {
          data_importacao?: string
          id?: string
          id_motorista?: string
          nome?: string
          rota?: string
          tipo_veiculo?: string | null
        }
        Relationships: []
      }
      queue_drivers: {
        Row: {
          bench_number: number | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string
          full_name: string
          id: string
          route_letter: string
          route_number: number
          status: string
        }
        Insert: {
          bench_number?: number | null
          called_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string
          full_name: string
          id?: string
          route_letter: string
          route_number: number
          status?: string
        }
        Update: {
          bench_number?: number | null
          called_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string
          full_name?: string
          id?: string
          route_letter?: string
          route_number?: number
          status?: string
        }
        Relationships: []
      }
      service_history: {
        Row: {
          bench_number: number
          called_at: string
          checked_in_at: string
          driver_name: string
          id: string
          released: boolean
          released_at: string | null
          route_letter: string
          route_number: number
        }
        Insert: {
          bench_number: number
          called_at?: string
          checked_in_at: string
          driver_name: string
          id?: string
          released?: boolean
          released_at?: string | null
          route_letter: string
          route_number: number
        }
        Update: {
          bench_number?: number
          called_at?: string
          checked_in_at?: string
          driver_name?: string
          id?: string
          released?: boolean
          released_at?: string | null
          route_letter?: string
          route_number?: number
        }
        Relationships: []
      }
      volumosos: {
        Row: {
          bench_number: number | null
          cage_number: number | null
          created_at: string
          id: string
          observation: string | null
          quantity: number
          retired_at: string | null
          route_letter: string
          route_number: number
          status: string
        }
        Insert: {
          bench_number?: number | null
          cage_number?: number | null
          created_at?: string
          id?: string
          observation?: string | null
          quantity?: number
          retired_at?: string | null
          route_letter: string
          route_number: number
          status?: string
        }
        Update: {
          bench_number?: number | null
          cage_number?: number | null
          created_at?: string
          id?: string
          observation?: string | null
          quantity?: number
          retired_at?: string | null
          route_letter?: string
          route_number?: number
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_bench: {
        Args: { p_bench_number: number; p_session_id: string }
        Returns: boolean
      }
      claim_driver: {
        Args: { p_bench_number: number; p_driver_id?: string }
        Returns: {
          bench_number: number | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string
          full_name: string
          id: string
          route_letter: string
          route_number: number
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "queue_drivers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_stale_benches: { Args: never; Returns: undefined }
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
