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
  public: {
    Tables: {
      animais: {
        Row: {
          autor: string | null
          brinco: string
          categoria: string | null
          created_at: string
          data_entrada: string
          fazenda_id: string
          id: string
          nascimento: string | null
          nome: string | null
          observacoes: string | null
          origem: string | null
          pasto_id: string | null
          peso_entrada_kg: number | null
          peso_venda_kg: number | null
          preco_compra: number | null
          preco_venda: number | null
          raca: string | null
          saida_data: string | null
          saida_motivo: string | null
          sexo: string
          status: string
          updated_at: string
        }
        Insert: {
          autor?: string | null
          brinco: string
          categoria?: string | null
          created_at?: string
          data_entrada: string
          fazenda_id: string
          id?: string
          nascimento?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          pasto_id?: string | null
          peso_entrada_kg?: number | null
          peso_venda_kg?: number | null
          preco_compra?: number | null
          preco_venda?: number | null
          raca?: string | null
          saida_data?: string | null
          saida_motivo?: string | null
          sexo: string
          status?: string
          updated_at?: string
        }
        Update: {
          autor?: string | null
          brinco?: string
          categoria?: string | null
          created_at?: string
          data_entrada?: string
          fazenda_id?: string
          id?: string
          nascimento?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          pasto_id?: string | null
          peso_entrada_kg?: number | null
          peso_venda_kg?: number | null
          preco_compra?: number | null
          preco_venda?: number | null
          raca?: string | null
          saida_data?: string | null
          saida_motivo?: string | null
          sexo?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "animais_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animais_pasto_id_fkey"
            columns: ["pasto_id"]
            isOneToOne: false
            referencedRelation: "pastos"
            referencedColumns: ["id"]
          },
        ]
      }
      diario: {
        Row: {
          autor: string | null
          categoria: string
          clima: Json | null
          created_at: string
          data: string
          fazenda_id: string
          fotos: Json
          gps: Json | null
          id: string
          texto: string | null
          titulo: string
        }
        Insert: {
          autor?: string | null
          categoria?: string
          clima?: Json | null
          created_at?: string
          data: string
          fazenda_id: string
          fotos?: Json
          gps?: Json | null
          id?: string
          texto?: string | null
          titulo: string
        }
        Update: {
          autor?: string | null
          categoria?: string
          clima?: Json | null
          created_at?: string
          data?: string
          fazenda_id?: string
          fotos?: Json
          gps?: Json | null
          id?: string
          texto?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          categoria: string
          created_at: string
          fazenda_id: string
          id: string
          minimo: number | null
          nome: string
          observacoes: string | null
          quantidade: number
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          fazenda_id: string
          id?: string
          minimo?: number | null
          nome: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          fazenda_id?: string
          id?: string
          minimo?: number | null
          nome?: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_mov: {
        Row: {
          autor: string | null
          created_at: string
          data: string
          fazenda_id: string
          id: string
          item_id: string
          nota: string | null
          quantidade: number
          tipo: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data: string
          fazenda_id: string
          id?: string
          item_id: string
          nota?: string | null
          quantidade: number
          tipo: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id?: string
          id?: string
          item_id?: string
          nota?: string | null
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_mov_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_mov_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      fazendas: {
        Row: {
          codigo_acesso: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          codigo_acesso: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          codigo_acesso?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      financeiro: {
        Row: {
          autor: string | null
          categoria: string
          created_at: string
          data: string
          descricao: string
          fazenda_id: string
          id: string
          modulo: string | null
          tipo: string
          valor: number
        }
        Insert: {
          autor?: string | null
          categoria: string
          created_at?: string
          data: string
          descricao: string
          fazenda_id: string
          id?: string
          modulo?: string | null
          tipo: string
          valor: number
        }
        Update: {
          autor?: string | null
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          fazenda_id?: string
          id?: string
          modulo?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      leituras: {
        Row: {
          autor: string | null
          created_at: string
          data: string
          fazenda_id: string
          id: string
          medidor_id: string
          valor: number
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data: string
          fazenda_id: string
          id?: string
          medidor_id: string
          valor: number
        }
        Update: {
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id?: string
          id?: string
          medidor_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "leituras_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leituras_medidor_id_fkey"
            columns: ["medidor_id"]
            isOneToOne: false
            referencedRelation: "medidores"
            referencedColumns: ["id"]
          },
        ]
      }
      lote_entradas: {
        Row: {
          autor: string | null
          created_at: string
          data: string
          fazenda_id: string
          id: string
          lote_id: string
          mortalidade: number
          observacoes: string | null
          peso_medio_g: number | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data: string
          fazenda_id: string
          id?: string
          lote_id: string
          mortalidade?: number
          observacoes?: string | null
          peso_medio_g?: number | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id?: string
          id?: string
          lote_id?: string
          mortalidade?: number
          observacoes?: string | null
          peso_medio_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_entradas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_entradas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          autor: string | null
          created_at: string
          data_entrada: string
          encerrado: boolean
          fazenda_id: string
          id: string
          integradora: string | null
          numero: string
          percentual_lucro: number
          preco_kg_vivo: number | null
          previsao_abate_dias: number
          quantidade_inicial: number
          updated_at: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data_entrada: string
          encerrado?: boolean
          fazenda_id: string
          id?: string
          integradora?: string | null
          numero: string
          percentual_lucro?: number
          preco_kg_vivo?: number | null
          previsao_abate_dias?: number
          quantidade_inicial: number
          updated_at?: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          data_entrada?: string
          encerrado?: boolean
          fazenda_id?: string
          id?: string
          integradora?: string | null
          numero?: string
          percentual_lucro?: number
          preco_kg_vivo?: number | null
          previsao_abate_dias?: number
          quantidade_inicial?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      medidores: {
        Row: {
          codigo_instalacao: string | null
          codigo_relogio: string | null
          created_at: string
          fazenda_id: string
          id: string
          nome: string
        }
        Insert: {
          codigo_instalacao?: string | null
          codigo_relogio?: string | null
          created_at?: string
          fazenda_id: string
          id?: string
          nome: string
        }
        Update: {
          codigo_instalacao?: string | null
          codigo_relogio?: string | null
          created_at?: string
          fazenda_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "medidores_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pastos: {
        Row: {
          area_ha: number | null
          capacidade: number | null
          created_at: string
          fazenda_id: string
          id: string
          nome: string
          observacoes: string | null
        }
        Insert: {
          area_ha?: number | null
          capacidade?: number | null
          created_at?: string
          fazenda_id: string
          id?: string
          nome: string
          observacoes?: string | null
        }
        Update: {
          area_ha?: number | null
          capacidade?: number | null
          created_at?: string
          fazenda_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pastos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesagens: {
        Row: {
          animal_id: string
          autor: string | null
          created_at: string
          data: string
          fazenda_id: string
          id: string
          observacoes: string | null
          peso_kg: number
        }
        Insert: {
          animal_id: string
          autor?: string | null
          created_at?: string
          data: string
          fazenda_id: string
          id?: string
          observacoes?: string | null
          peso_kg: number
        }
        Update: {
          animal_id?: string
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id?: string
          id?: string
          observacoes?: string | null
          peso_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "pesagens_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesagens_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      sanidade: {
        Row: {
          animal_id: string
          autor: string | null
          created_at: string
          data: string
          dose: string | null
          fazenda_id: string
          id: string
          observacoes: string | null
          produto: string
          proxima_data: string | null
          tipo: string
        }
        Insert: {
          animal_id: string
          autor?: string | null
          created_at?: string
          data: string
          dose?: string | null
          fazenda_id: string
          id?: string
          observacoes?: string | null
          produto: string
          proxima_data?: string | null
          tipo: string
        }
        Update: {
          animal_id?: string
          autor?: string | null
          created_at?: string
          data?: string
          dose?: string | null
          fazenda_id?: string
          id?: string
          observacoes?: string | null
          produto?: string
          proxima_data?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanidade_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanidade_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          autor: string | null
          categoria: string
          concluida: boolean
          created_at: string
          descricao: string | null
          fazenda_id: string
          id: string
          prioridade: string
          titulo: string
          vencimento: string | null
        }
        Insert: {
          autor?: string | null
          categoria?: string
          concluida?: boolean
          created_at?: string
          descricao?: string | null
          fazenda_id: string
          id?: string
          prioridade?: string
          titulo: string
          vencimento?: string | null
        }
        Update: {
          autor?: string | null
          categoria?: string
          concluida?: boolean
          created_at?: string
          descricao?: string | null
          fazenda_id?: string
          id?: string
          prioridade?: string
          titulo?: string
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_fazenda: {
        Args: { p_codigo: string; p_nome: string }
        Returns: {
          codigo_acesso: string
          id: string
          nome: string
        }[]
      }
      current_fazenda_id: { Args: never; Returns: string }
      entrar_fazenda: {
        Args: { p_codigo: string }
        Returns: {
          id: string
          nome: string
        }[]
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
