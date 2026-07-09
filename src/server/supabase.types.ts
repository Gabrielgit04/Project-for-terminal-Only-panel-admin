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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chofer: {
        Row: {
          cedula: number | null
          id: number
          nombres_apellidos: string
          placa_unidad: string | null
          deleted_at: string | null
          updated_at: string | null
        }
        Insert: {
          cedula?: number | null
          id?: number
          nombres_apellidos: string
          placa_unidad?: string | null
          deleted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          cedula?: number | null
          id?: number
          nombres_apellidos?: string
          placa_unidad?: string | null
          deleted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      DT9: {
        Row: {
          id: number
          id_chofer: number | null
          id_movilizacion: number | null
          id_organizacion: string | null
          id_ruta: number | null
          id_vehiculo: string | null
        }
        Insert: {
          id: number
          id_chofer?: number | null
          id_movilizacion?: number | null
          id_organizacion?: string | null
          id_ruta?: number | null
          id_vehiculo?: string | null
        }
        Update: {
          id?: number
          id_chofer?: number | null
          id_movilizacion?: number | null
          id_organizacion?: string | null
          id_ruta?: number | null
          id_vehiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "DT9_id_chofer_fkey"
            columns: ["id_chofer"]
            isOneToOne: true
            referencedRelation: "chofer"
            referencedColumns: ["cedula"]
          },
          {
            foreignKeyName: "DT9_id_movilizacion_fkey"
            columns: ["id_movilizacion"]
            isOneToOne: true
            referencedRelation: "movilizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DT9_id_organizacion_fkey"
            columns: ["id_organizacion"]
            isOneToOne: true
            referencedRelation: "organizaciones"
            referencedColumns: ["id_rif"]
          },
          {
            foreignKeyName: "DT9_id_ruta_fkey"
            columns: ["id_ruta"]
            isOneToOne: true
            referencedRelation: "rutas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DT9_id_vehiculo_fkey"
            columns: ["id_vehiculo"]
            isOneToOne: true
            referencedRelation: "vehiculos"
            referencedColumns: ["placa"]
          },
        ]
      }
      movilizaciones: {
        Row: {
          id: number
          estado: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: number
          estado?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: number
          estado?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      entrada: {
        Row: {
          id: number
          hora: string
          id_tipologia: number
          id_organizacion: string
          id_ruta: number
          id_chofer: number
          movilizacion_id: number | null
          placa_vehiculo: string | null
          puestos_ocupados: number | null
          estado: string
          deleted_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          hora?: string
          id_tipologia: number
          id_organizacion: string
          id_ruta: number
          id_chofer: number
          movilizacion_id?: number | null
          placa_vehiculo?: string | null
          puestos_ocupados?: number | null
          estado?: string
          deleted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          hora?: string
          id_tipologia?: number
          id_organizacion?: string
          id_ruta?: number
          id_chofer?: number
          movilizacion_id?: number | null
          placa_vehiculo?: string | null
          puestos_ocupados?: number | null
          estado?: string
          deleted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrada_movilizacion_id_fkey"
            columns: ["movilizacion_id"]
            isOneToOne: true
            referencedRelation: "movilizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrada_placa_vehiculo_fkey"
            columns: ["placa_vehiculo"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["placa"]
          },
        ]
      }
      salida: {
        Row: {
          id: number
          hora: string
          id_tipologia: number
          id_organizacion: string
          id_ruta: number
          id_chofer: number
          entrada_id: number | null
          placa_vehiculo: string | null
          total_tasas: number | null
          puestos_ocupados: number | null
          deleted_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          hora?: string
          id_tipologia: number
          id_organizacion: string
          id_ruta: number
          id_chofer: number
          entrada_id?: number | null
          placa_vehiculo?: string | null
          total_tasas?: number | null
          puestos_ocupados?: number | null
          deleted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          hora?: string
          id_tipologia?: number
          id_organizacion?: string
          id_ruta?: number
          id_chofer?: number
          entrada_id?: number | null
          placa_vehiculo?: string | null
          total_tasas?: number | null
          puestos_ocupados?: number | null
          deleted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salida_entrada_id_fkey"
            columns: ["entrada_id"]
            isOneToOne: true
            referencedRelation: "entrada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salida_placa_vehiculo_fkey"
            columns: ["placa_vehiculo"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["placa"]
          },
        ]
      }
      organizaciones: {
        Row: {
          id_rif: string
          nombre: string
        }
        Insert: {
          id_rif: string
          nombre: string
        }
        Update: {
          id_rif?: string
          nombre?: string
        }
        Relationships: []
      }
      rutas: {
        Row: {
          created_at: string
          deleted_at: string | null
          updated_at: string | null
          destino: string | null
          id: number
          id_organizacion: string | null
          origen: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          updated_at?: string | null
          destino?: string | null
          id?: number
          id_organizacion?: string | null
          origen?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          updated_at?: string | null
          destino?: string | null
          id?: number
          id_organizacion?: string | null
          origen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rutas_id_organizacion_fkey"
            columns: ["id_organizacion"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id_rif"]
          },
        ]
      }
      tipologia: {
        Row: {
          cantidad_puestos: number | null
          id: number
        }
        Insert: {
          cantidad_puestos?: number | null
          id?: number
        }
        Update: {
          cantidad_puestos?: number | null
          id?: number
        }
        Relationships: []
      }
      usuario: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          intentos_login: number | null
          nombre: string | null
          rol: string | null
          updated_at: string | null
          usuario: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id: string
          intentos_login?: number | null
          nombre?: string | null
          rol?: string | null
          updated_at?: string | null
          usuario: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          intentos_login?: number | null
          nombre?: string | null
          rol?: string | null
          updated_at?: string | null
          usuario?: string
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          cedula_propietario: string | null
          created_at: string | null
          deleted_at: string | null
          id_organizacion: string | null
          id_tipologia: number | null
          marca: string | null
          modelo: string | null
          placa: string
          propietario: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          cedula_propietario?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id_organizacion?: string | null
          id_tipologia?: number | null
          marca?: string | null
          modelo?: string | null
          placa: string
          propietario?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          cedula_propietario?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id_organizacion?: string | null
          id_tipologia?: number | null
          marca?: string | null
          modelo?: string | null
          placa?: string
          propietario?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vehiculo_tipologia"
            columns: ["id_tipologia"]
            isOneToOne: false
            referencedRelation: "tipologia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_id_organizacion_fkey"
            columns: ["id_organizacion"]
            isOneToOne: false
            referencedRelation: "organizaciones"
            referencedColumns: ["id_rif"]
          },
        ]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
