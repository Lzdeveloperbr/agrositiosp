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
          pesagens: Json
          peso_entrada_kg: number | null
          peso_venda_kg: number | null
          preco_compra: number | null
          preco_venda: number | null
          raca: string | null
          reproducao: Json
          saida_data: string | null
          saida_motivo: string | null
          sanidade: Json
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
          pesagens?: Json
          peso_entrada_kg?: number | null
          peso_venda_kg?: number | null
          preco_compra?: number | null
          preco_venda?: number | null
          raca?: string | null
          reproducao?: Json
          saida_data?: string | null
          saida_motivo?: string | null
          sanidade?: Json
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
          pesagens?: Json
          peso_entrada_kg?: number | null
          peso_venda_kg?: number | null
          preco_compra?: number | null
          preco_venda?: number | null
          raca?: string | null
          reproducao?: Json
          saida_data?: string | null
          saida_motivo?: string | null
          sanidade?: Json
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
      chuvas: {
        Row: {
          autor: string | null
          created_at: string
          data: string
          fazenda_id: string
          id: string
          local: string | null
          mm: number
          observacoes: string | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data: string
          fazenda_id: string
          id?: string
          local?: string | null
          mm?: number
          observacoes?: string | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id?: string
          id?: string
          local?: string | null
          mm?: number
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chuvas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          autor: string | null
          created_at: string
          data: string
          data_pedido: string | null
          data_recebimento: string | null
          fazenda_id: string
          fornecedor: string | null
          id: string
          itens: Json
          observacoes: string | null
          solicitante: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data: string
          data_pedido?: string | null
          data_recebimento?: string | null
          fazenda_id: string
          fornecedor?: string | null
          id?: string
          itens?: Json
          observacoes?: string | null
          solicitante?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          autor?: string | null
          created_at?: string
          data?: string
          data_pedido?: string | null
          data_recebimento?: string | null
          fazenda_id?: string
          fornecedor?: string | null
          id?: string
          itens?: Json
          observacoes?: string | null
          solicitante?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          created_at: string
          data: string
          fazenda_id: string
          fonte: string | null
          id: string
          observacao: string | null
          praca: string | null
          produto: string
          unidade: string
          updated_at: string
          valor: number
          variacao_pct: number | null
        }
        Insert: {
          created_at?: string
          data?: string
          fazenda_id: string
          fonte?: string | null
          id?: string
          observacao?: string | null
          praca?: string | null
          produto: string
          unidade?: string
          updated_at?: string
          valor: number
          variacao_pct?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          fazenda_id?: string
          fonte?: string | null
          id?: string
          observacao?: string | null
          praca?: string | null
          produto?: string
          unidade?: string
          updated_at?: string
          valor?: number
          variacao_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
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
      documentos_racao: {
        Row: {
          autor: string | null
          created_at: string
          data: string | null
          entrega_id: string | null
          fazenda_id: string
          granja_id: string | null
          id: string
          mime: string | null
          motorista: string | null
          nome: string
          url: string
          viagem: string | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data?: string | null
          entrega_id?: string | null
          fazenda_id: string
          granja_id?: string | null
          id?: string
          mime?: string | null
          motorista?: string | null
          nome: string
          url: string
          viagem?: string | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          data?: string | null
          entrega_id?: string | null
          fazenda_id?: string
          granja_id?: string | null
          id?: string
          mime?: string | null
          motorista?: string | null
          nome?: string
          url?: string
          viagem?: string | null
        }
        Relationships: []
      }
      engorda_animais: {
        Row: {
          brinco: string
          categoria: string | null
          created_at: string
          data_entrada: string
          fazenda_id: string
          id: string
          lote_id: string | null
          nascimento: string | null
          observacoes: string | null
          peso_entrada_kg: number | null
          raca: string | null
          sexo: string
          status: string
          updated_at: string
          valor_compra: number | null
        }
        Insert: {
          brinco: string
          categoria?: string | null
          created_at?: string
          data_entrada?: string
          fazenda_id: string
          id?: string
          lote_id?: string | null
          nascimento?: string | null
          observacoes?: string | null
          peso_entrada_kg?: number | null
          raca?: string | null
          sexo?: string
          status?: string
          updated_at?: string
          valor_compra?: number | null
        }
        Update: {
          brinco?: string
          categoria?: string | null
          created_at?: string
          data_entrada?: string
          fazenda_id?: string
          id?: string
          lote_id?: string | null
          nascimento?: string | null
          observacoes?: string | null
          peso_entrada_kg?: number | null
          raca?: string | null
          sexo?: string
          status?: string
          updated_at?: string
          valor_compra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engorda_animais_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engorda_animais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "engorda_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      engorda_lotes: {
        Row: {
          autor: string | null
          categoria: string | null
          created_at: string
          data_entrada: string
          encerrado: boolean
          fazenda_id: string
          id: string
          local: string | null
          meta_gmd: number | null
          numero: string
          observacoes: string | null
          origem: string | null
          peso_inicial_total_kg: number | null
          peso_medio_inicial_kg: number | null
          preco_arroba_venda: number | null
          previsao_saida: string | null
          quantidade: number
          raca: string | null
          sistema: string | null
          updated_at: string
          valor_compra: number | null
        }
        Insert: {
          autor?: string | null
          categoria?: string | null
          created_at?: string
          data_entrada?: string
          encerrado?: boolean
          fazenda_id: string
          id?: string
          local?: string | null
          meta_gmd?: number | null
          numero: string
          observacoes?: string | null
          origem?: string | null
          peso_inicial_total_kg?: number | null
          peso_medio_inicial_kg?: number | null
          preco_arroba_venda?: number | null
          previsao_saida?: string | null
          quantidade?: number
          raca?: string | null
          sistema?: string | null
          updated_at?: string
          valor_compra?: number | null
        }
        Update: {
          autor?: string | null
          categoria?: string | null
          created_at?: string
          data_entrada?: string
          encerrado?: boolean
          fazenda_id?: string
          id?: string
          local?: string | null
          meta_gmd?: number | null
          numero?: string
          observacoes?: string | null
          origem?: string | null
          peso_inicial_total_kg?: number | null
          peso_medio_inicial_kg?: number | null
          preco_arroba_venda?: number | null
          previsao_saida?: string | null
          quantidade?: number
          raca?: string | null
          sistema?: string | null
          updated_at?: string
          valor_compra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engorda_lotes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      engorda_pesagens: {
        Row: {
          animal_id: string | null
          autor: string | null
          created_at: string
          data: string
          fazenda_id: string
          id: string
          lote_id: string | null
          observacoes: string | null
          peso_medio_kg: number | null
          peso_total_kg: number | null
          quantidade: number | null
          updated_at: string
        }
        Insert: {
          animal_id?: string | null
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id: string
          id?: string
          lote_id?: string | null
          observacoes?: string | null
          peso_medio_kg?: number | null
          peso_total_kg?: number | null
          quantidade?: number | null
          updated_at?: string
        }
        Update: {
          animal_id?: string | null
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id?: string
          id?: string
          lote_id?: string | null
          observacoes?: string | null
          peso_medio_kg?: number | null
          peso_total_kg?: number | null
          quantidade?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engorda_pesagens_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "engorda_animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engorda_pesagens_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engorda_pesagens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "engorda_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_racao: {
        Row: {
          autor: string | null
          created_at: string
          data: string
          documento_url: string | null
          fazenda_id: string
          foto_caminhao_url: string | null
          galpao: string | null
          granja_id: string | null
          id: string
          lote_id: string | null
          motorista: string | null
          observacoes: string | null
          placa: string | null
          quantidade_kg: number
          tipo_racao: string | null
          updated_at: string
          viagem: string | null
        }
        Insert: {
          autor?: string | null
          created_at?: string
          data: string
          documento_url?: string | null
          fazenda_id: string
          foto_caminhao_url?: string | null
          galpao?: string | null
          granja_id?: string | null
          id?: string
          lote_id?: string | null
          motorista?: string | null
          observacoes?: string | null
          placa?: string | null
          quantidade_kg?: number
          tipo_racao?: string | null
          updated_at?: string
          viagem?: string | null
        }
        Update: {
          autor?: string | null
          created_at?: string
          data?: string
          documento_url?: string | null
          fazenda_id?: string
          foto_caminhao_url?: string | null
          galpao?: string | null
          granja_id?: string | null
          id?: string
          lote_id?: string | null
          motorista?: string | null
          observacoes?: string | null
          placa?: string | null
          quantidade_kg?: number
          tipo_racao?: string | null
          updated_at?: string
          viagem?: string | null
        }
        Relationships: []
      }
      estoque: {
        Row: {
          categoria: string
          created_at: string
          fazenda_id: string
          id: string
          lote_id: string | null
          minimo: number | null
          movimentacoes: Json
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
          lote_id?: string | null
          minimo?: number | null
          movimentacoes?: Json
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
          lote_id?: string | null
          minimo?: number | null
          movimentacoes?: Json
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
      fazendas: {
        Row: {
          cidade: string | null
          codigo_acesso: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
        }
        Insert: {
          cidade?: string | null
          codigo_acesso: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
        }
        Update: {
          cidade?: string | null
          codigo_acesso?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
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
          data_pagamento: string | null
          descricao: string
          fazenda_id: string
          id: string
          modulo: string | null
          status: string
          tipo: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          autor?: string | null
          categoria: string
          created_at?: string
          data: string
          data_pagamento?: string | null
          descricao: string
          fazenda_id: string
          id?: string
          modulo?: string | null
          status?: string
          tipo: string
          valor: number
          vencimento?: string | null
        }
        Update: {
          autor?: string | null
          categoria?: string
          created_at?: string
          data?: string
          data_pagamento?: string | null
          descricao?: string
          fazenda_id?: string
          id?: string
          modulo?: string | null
          status?: string
          tipo?: string
          valor?: number
          vencimento?: string | null
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
      fornecedores: {
        Row: {
          autor: string | null
          categoria: string
          cep: string | null
          cidade: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          favorito: boolean
          fazenda_id: string
          foto_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          observacoes: string | null
          responsavel: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          autor?: string | null
          categoria?: string
          cep?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          favorito?: boolean
          fazenda_id: string
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          observacoes?: string | null
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          autor?: string | null
          categoria?: string
          cep?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          favorito?: boolean
          fazenda_id?: string
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          observacoes?: string | null
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          admissao: string | null
          ativo: boolean
          autor: string | null
          cpf: string | null
          created_at: string
          demissao: string | null
          fazenda_id: string
          funcao: string | null
          id: string
          nome: string
          observacoes: string | null
          salario: number | null
          setor: string | null
          telefone: string | null
          tipo_pagamento: string
          updated_at: string
          valor_hora: number | null
        }
        Insert: {
          admissao?: string | null
          ativo?: boolean
          autor?: string | null
          cpf?: string | null
          created_at?: string
          demissao?: string | null
          fazenda_id: string
          funcao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          salario?: number | null
          setor?: string | null
          telefone?: string | null
          tipo_pagamento?: string
          updated_at?: string
          valor_hora?: number | null
        }
        Update: {
          admissao?: string | null
          ativo?: boolean
          autor?: string | null
          cpf?: string | null
          created_at?: string
          demissao?: string | null
          fazenda_id?: string
          funcao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          salario?: number | null
          setor?: string | null
          telefone?: string | null
          tipo_pagamento?: string
          updated_at?: string
          valor_hora?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_arquivos: {
        Row: {
          caminho: string | null
          confianca: number | null
          created_at: string
          destino: string | null
          erro: string | null
          fazenda_id: string
          id: string
          item_id: string
          mime: string | null
          modificado_em: string | null
          nome: string
          processado_em: string | null
          registros: number
          resumo: string | null
          status: string
          tamanho: number | null
          updated_at: string
          versao: string | null
        }
        Insert: {
          caminho?: string | null
          confianca?: number | null
          created_at?: string
          destino?: string | null
          erro?: string | null
          fazenda_id: string
          id?: string
          item_id: string
          mime?: string | null
          modificado_em?: string | null
          nome: string
          processado_em?: string | null
          registros?: number
          resumo?: string | null
          status?: string
          tamanho?: number | null
          updated_at?: string
          versao?: string | null
        }
        Update: {
          caminho?: string | null
          confianca?: number | null
          created_at?: string
          destino?: string | null
          erro?: string | null
          fazenda_id?: string
          id?: string
          item_id?: string
          mime?: string | null
          modificado_em?: string | null
          nome?: string
          processado_em?: string | null
          registros?: number
          resumo?: string | null
          status?: string
          tamanho?: number | null
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdrive_arquivos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_config: {
        Row: {
          ativo: boolean
          created_at: string
          fazenda_id: string
          id: string
          pasta_caminho: string | null
          pasta_id: string | null
          pasta_nome: string | null
          ultima_verificacao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          fazenda_id: string
          id?: string
          pasta_caminho?: string | null
          pasta_id?: string | null
          pasta_nome?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          fazenda_id?: string
          id?: string
          pasta_caminho?: string | null
          pasta_id?: string | null
          pasta_nome?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdrive_config_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: true
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      granjas_racao: {
        Row: {
          autor: string | null
          cidade: string | null
          created_at: string
          endereco: string | null
          fazenda_id: string
          id: string
          nome: string
          observacoes: string | null
          proprietario: string | null
          qtd_aves: number | null
          qtd_galpoes: number | null
          updated_at: string
        }
        Insert: {
          autor?: string | null
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          fazenda_id: string
          id?: string
          nome: string
          observacoes?: string | null
          proprietario?: string | null
          qtd_aves?: number | null
          qtd_galpoes?: number | null
          updated_at?: string
        }
        Update: {
          autor?: string | null
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          fazenda_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          proprietario?: string | null
          qtd_aves?: number | null
          qtd_galpoes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      importacoes_ia: {
        Row: {
          acao: string
          arquivo_id: string | null
          arquivo_nome: string | null
          chave: string | null
          confianca: number | null
          created_at: string
          dados: Json
          fazenda_id: string
          id: string
          registro_id: string | null
          tabela: string
        }
        Insert: {
          acao?: string
          arquivo_id?: string | null
          arquivo_nome?: string | null
          chave?: string | null
          confianca?: number | null
          created_at?: string
          dados?: Json
          fazenda_id: string
          id?: string
          registro_id?: string | null
          tabela: string
        }
        Update: {
          acao?: string
          arquivo_id?: string | null
          arquivo_nome?: string | null
          chave?: string | null
          confianca?: number | null
          created_at?: string
          dados?: Json
          fazenda_id?: string
          id?: string
          registro_id?: string | null
          tabela?: string
        }
        Relationships: [
          {
            foreignKeyName: "importacoes_ia_arquivo_id_fkey"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "onedrive_arquivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacoes_ia_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      leite_animais: {
        Row: {
          autor: string | null
          brinco: string
          categoria: string
          created_at: string
          data_entrada: string
          fazenda_id: string
          id: string
          local: string | null
          mae: string | null
          nascimento: string | null
          nome: string | null
          observacoes: string | null
          origem: string | null
          pai: string | null
          peso_kg: number | null
          raca: string | null
          sexo: string
          status: string
          updated_at: string
          valor_aquisicao: number | null
        }
        Insert: {
          autor?: string | null
          brinco: string
          categoria?: string
          created_at?: string
          data_entrada?: string
          fazenda_id: string
          id?: string
          local?: string | null
          mae?: string | null
          nascimento?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          pai?: string | null
          peso_kg?: number | null
          raca?: string | null
          sexo?: string
          status?: string
          updated_at?: string
          valor_aquisicao?: number | null
        }
        Update: {
          autor?: string | null
          brinco?: string
          categoria?: string
          created_at?: string
          data_entrada?: string
          fazenda_id?: string
          id?: string
          local?: string | null
          mae?: string | null
          nascimento?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          pai?: string | null
          peso_kg?: number | null
          raca?: string | null
          sexo?: string
          status?: string
          updated_at?: string
          valor_aquisicao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leite_animais_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      leite_eventos: {
        Row: {
          animal_id: string | null
          autor: string | null
          created_at: string
          custo: number | null
          data: string
          data_fim: string | null
          data_prevista: string | null
          dosagem: string | null
          fazenda_id: string
          id: string
          medicamento: string | null
          observacoes: string | null
          problema: string | null
          responsavel: string | null
          resultado: string | null
          tipo: string
          touro_semen: string | null
          updated_at: string
        }
        Insert: {
          animal_id?: string | null
          autor?: string | null
          created_at?: string
          custo?: number | null
          data?: string
          data_fim?: string | null
          data_prevista?: string | null
          dosagem?: string | null
          fazenda_id: string
          id?: string
          medicamento?: string | null
          observacoes?: string | null
          problema?: string | null
          responsavel?: string | null
          resultado?: string | null
          tipo: string
          touro_semen?: string | null
          updated_at?: string
        }
        Update: {
          animal_id?: string | null
          autor?: string | null
          created_at?: string
          custo?: number | null
          data?: string
          data_fim?: string | null
          data_prevista?: string | null
          dosagem?: string | null
          fazenda_id?: string
          id?: string
          medicamento?: string | null
          observacoes?: string | null
          problema?: string | null
          responsavel?: string | null
          resultado?: string | null
          tipo?: string
          touro_semen?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leite_eventos_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "leite_animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leite_eventos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      leite_lactacoes: {
        Row: {
          animal_id: string
          created_at: string
          data_parto: string
          data_secagem: string | null
          data_secagem_prevista: string | null
          fazenda_id: string
          id: string
          numero: number
          observacoes: string | null
          pico_litros: number | null
          status: string
          updated_at: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          data_parto: string
          data_secagem?: string | null
          data_secagem_prevista?: string | null
          fazenda_id: string
          id?: string
          numero?: number
          observacoes?: string | null
          pico_litros?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          data_parto?: string
          data_secagem?: string | null
          data_secagem_prevista?: string | null
          fazenda_id?: string
          id?: string
          numero?: number
          observacoes?: string | null
          pico_litros?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leite_lactacoes_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "leite_animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leite_lactacoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      leite_producao: {
        Row: {
          animal_id: string | null
          autor: string | null
          created_at: string
          data: string
          fazenda_id: string
          id: string
          manha: number
          noite: number
          observacoes: string | null
          ordenhas: number
          tarde: number
          total: number
          updated_at: string
        }
        Insert: {
          animal_id?: string | null
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id: string
          id?: string
          manha?: number
          noite?: number
          observacoes?: string | null
          ordenhas?: number
          tarde?: number
          total?: number
          updated_at?: string
        }
        Update: {
          animal_id?: string | null
          autor?: string | null
          created_at?: string
          data?: string
          fazenda_id?: string
          id?: string
          manha?: number
          noite?: number
          observacoes?: string | null
          ordenhas?: number
          tarde?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leite_producao_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "leite_animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leite_producao_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          aplicacoes: Json
          autor: string | null
          created_at: string
          data_entrada: string
          encerrado: boolean
          entries: Json
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
          aplicacoes?: Json
          autor?: string | null
          created_at?: string
          data_entrada: string
          encerrado?: boolean
          entries?: Json
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
          aplicacoes?: Json
          autor?: string | null
          created_at?: string
          data_entrada?: string
          encerrado?: boolean
          entries?: Json
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
      maquinas: {
        Row: {
          abastecimentos: Json
          ano: number | null
          autor: string | null
          created_at: string
          fazenda_id: string
          horimetro: number | null
          id: string
          manutencoes: Json
          marca: string | null
          modelo: string | null
          nome: string
          observacoes: string | null
          placa: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          abastecimentos?: Json
          ano?: number | null
          autor?: string | null
          created_at?: string
          fazenda_id: string
          horimetro?: number | null
          id?: string
          manutencoes?: Json
          marca?: string | null
          modelo?: string | null
          nome: string
          observacoes?: string | null
          placa?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          abastecimentos?: Json
          ano?: number | null
          autor?: string | null
          created_at?: string
          fazenda_id?: string
          horimetro?: number | null
          id?: string
          manutencoes?: Json
          marca?: string | null
          modelo?: string | null
          nome?: string
          observacoes?: string | null
          placa?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maquinas_fazenda_id_fkey"
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
          leituras: Json
          nome: string
        }
        Insert: {
          codigo_instalacao?: string | null
          codigo_relogio?: string | null
          created_at?: string
          fazenda_id: string
          id?: string
          leituras?: Json
          nome: string
        }
        Update: {
          codigo_instalacao?: string | null
          codigo_relogio?: string | null
          created_at?: string
          fazenda_id?: string
          id?: string
          leituras?: Json
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
      mensagens: {
        Row: {
          autor: string
          created_at: string
          fazenda_id: string
          id: string
          texto: string
        }
        Insert: {
          autor: string
          created_at?: string
          fazenda_id: string
          id?: string
          texto: string
        }
        Update: {
          autor?: string
          created_at?: string
          fazenda_id?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoramentos: {
        Row: {
          acao: string | null
          alvo: string
          autor: string | null
          created_at: string
          data: string
          dose: string | null
          fazenda_id: string
          fotos: Json
          gps: Json | null
          id: string
          local: string | null
          modulo: string
          observacoes: string | null
          produto: string | null
          severidade: string
        }
        Insert: {
          acao?: string | null
          alvo: string
          autor?: string | null
          created_at?: string
          data: string
          dose?: string | null
          fazenda_id: string
          fotos?: Json
          gps?: Json | null
          id?: string
          local?: string | null
          modulo?: string
          observacoes?: string | null
          produto?: string | null
          severidade?: string
        }
        Update: {
          acao?: string | null
          alvo?: string
          autor?: string | null
          created_at?: string
          data?: string
          dose?: string | null
          fazenda_id?: string
          fotos?: Json
          gps?: Json | null
          id?: string
          local?: string | null
          modulo?: string
          observacoes?: string | null
          produto?: string | null
          severidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoramentos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      onedrive_arquivos: {
        Row: {
          caminho: string | null
          confianca: number | null
          created_at: string
          destino: string | null
          erro: string | null
          fazenda_id: string
          id: string
          item_id: string
          mime: string | null
          modificado_em: string | null
          nome: string
          processado_em: string | null
          registros: number
          resumo: string | null
          status: string
          tamanho: number | null
          updated_at: string
          versao: string | null
        }
        Insert: {
          caminho?: string | null
          confianca?: number | null
          created_at?: string
          destino?: string | null
          erro?: string | null
          fazenda_id: string
          id?: string
          item_id: string
          mime?: string | null
          modificado_em?: string | null
          nome: string
          processado_em?: string | null
          registros?: number
          resumo?: string | null
          status?: string
          tamanho?: number | null
          updated_at?: string
          versao?: string | null
        }
        Update: {
          caminho?: string | null
          confianca?: number | null
          created_at?: string
          destino?: string | null
          erro?: string | null
          fazenda_id?: string
          id?: string
          item_id?: string
          mime?: string | null
          modificado_em?: string | null
          nome?: string
          processado_em?: string | null
          registros?: number
          resumo?: string | null
          status?: string
          tamanho?: number | null
          updated_at?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onedrive_arquivos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      onedrive_config: {
        Row: {
          ativo: boolean
          created_at: string
          delta_link: string | null
          fazenda_id: string
          id: string
          pasta_caminho: string | null
          pasta_id: string | null
          pasta_nome: string | null
          ultima_verificacao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          delta_link?: string | null
          fazenda_id: string
          id?: string
          pasta_caminho?: string | null
          pasta_id?: string | null
          pasta_nome?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          delta_link?: string | null
          fazenda_id?: string
          id?: string
          pasta_caminho?: string | null
          pasta_id?: string | null
          pasta_nome?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onedrive_config_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: true
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_metas: {
        Row: {
          ano: number
          atividade: string
          autor: string | null
          categoria: string
          created_at: string
          fazenda_id: string
          id: string
          mes: number
          observacoes: string | null
          previsto: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          atividade?: string
          autor?: string | null
          categoria: string
          created_at?: string
          fazenda_id: string
          id?: string
          mes: number
          observacoes?: string | null
          previsto?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          atividade?: string
          autor?: string | null
          categoria?: string
          created_at?: string
          fazenda_id?: string
          id?: string
          mes?: number
          observacoes?: string | null
          previsto?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_metas_fazenda_id_fkey"
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
      planilhas: {
        Row: {
          atividade: string | null
          autor: string | null
          celulas: Json
          colunas: Json
          config: Json
          created_at: string
          fazenda_id: string
          id: string
          linhas: number
          modelo: string
          nome: string
          updated_at: string
          vinculo: Json
        }
        Insert: {
          atividade?: string | null
          autor?: string | null
          celulas?: Json
          colunas?: Json
          config?: Json
          created_at?: string
          fazenda_id: string
          id?: string
          linhas?: number
          modelo?: string
          nome: string
          updated_at?: string
          vinculo?: Json
        }
        Update: {
          atividade?: string | null
          autor?: string | null
          celulas?: Json
          colunas?: Json
          config?: Json
          created_at?: string
          fazenda_id?: string
          id?: string
          linhas?: number
          modelo?: string
          nome?: string
          updated_at?: string
          vinculo?: Json
        }
        Relationships: [
          {
            foreignKeyName: "planilhas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      plantios: {
        Row: {
          area_ha: number
          autor: string | null
          created_at: string
          cultura: string
          data_colheita: string | null
          data_plantio: string
          fazenda_id: string
          id: string
          local: string | null
          observacoes: string | null
          preco_kg: number | null
          previsao_colheita: string | null
          produtividade_kg: number | null
          quantidade_sementes: number | null
          status: string
          tipo_solo: string | null
          tratos: Json
          unidade_sementes: string | null
          updated_at: string
          variedade: string | null
        }
        Insert: {
          area_ha?: number
          autor?: string | null
          created_at?: string
          cultura: string
          data_colheita?: string | null
          data_plantio: string
          fazenda_id: string
          id?: string
          local?: string | null
          observacoes?: string | null
          preco_kg?: number | null
          previsao_colheita?: string | null
          produtividade_kg?: number | null
          quantidade_sementes?: number | null
          status?: string
          tipo_solo?: string | null
          tratos?: Json
          unidade_sementes?: string | null
          updated_at?: string
          variedade?: string | null
        }
        Update: {
          area_ha?: number
          autor?: string | null
          created_at?: string
          cultura?: string
          data_colheita?: string | null
          data_plantio?: string
          fazenda_id?: string
          id?: string
          local?: string | null
          observacoes?: string | null
          preco_kg?: number | null
          previsao_colheita?: string | null
          produtividade_kg?: number | null
          quantidade_sementes?: number | null
          status?: string
          tipo_solo?: string | null
          tratos?: Json
          unidade_sementes?: string | null
          updated_at?: string
          variedade?: string | null
        }
        Relationships: []
      }
      pontos: {
        Row: {
          atividade: string | null
          autor: string | null
          created_at: string
          data: string
          entrada: string | null
          extras: number
          fazenda_id: string
          funcionario_id: string | null
          horas: number
          id: string
          intervalo_min: number
          observacoes: string | null
          saida: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          atividade?: string | null
          autor?: string | null
          created_at?: string
          data: string
          entrada?: string | null
          extras?: number
          fazenda_id: string
          funcionario_id?: string | null
          horas?: number
          id?: string
          intervalo_min?: number
          observacoes?: string | null
          saida?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          atividade?: string | null
          autor?: string | null
          created_at?: string
          data?: string
          entrada?: string | null
          extras?: number
          fazenda_id?: string
          funcionario_id?: string | null
          horas?: number
          id?: string
          intervalo_min?: number
          observacoes?: string | null
          saida?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pontos_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      prioridades: {
        Row: {
          autor: string | null
          categoria: string
          created_at: string
          custo_estimado: number | null
          custo_real: number | null
          descricao: string | null
          fazenda_id: string
          fonte_arquivo: string | null
          id: string
          mes: string
          ordem: number
          prazo: string | null
          prioridade: string
          progresso: number
          responsavel: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          autor?: string | null
          categoria?: string
          created_at?: string
          custo_estimado?: number | null
          custo_real?: number | null
          descricao?: string | null
          fazenda_id: string
          fonte_arquivo?: string | null
          id?: string
          mes: string
          ordem?: number
          prazo?: string | null
          prioridade?: string
          progresso?: number
          responsavel?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          autor?: string | null
          categoria?: string
          created_at?: string
          custo_estimado?: number | null
          custo_real?: number | null
          descricao?: string | null
          fazenda_id?: string
          fonte_arquivo?: string | null
          id?: string
          mes?: string
          ordem?: number
          prazo?: string | null
          prioridade?: string
          progresso?: number
          responsavel?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prioridades_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      sanidade_registros: {
        Row: {
          alvo: string
          autor: string | null
          brincos: string | null
          carencia_ate: string | null
          carencia_dias: number
          created_at: string
          crmv: string | null
          custo: number | null
          data: string
          documento: string | null
          dose: string | null
          especie: string
          fabricante: string | null
          fazenda_id: string
          id: string
          lote_produto: string | null
          observacoes: string | null
          produto: string | null
          quantidade: number | null
          responsavel: string | null
          tipo: string
          updated_at: string
          via: string | null
        }
        Insert: {
          alvo: string
          autor?: string | null
          brincos?: string | null
          carencia_ate?: string | null
          carencia_dias?: number
          created_at?: string
          crmv?: string | null
          custo?: number | null
          data: string
          documento?: string | null
          dose?: string | null
          especie?: string
          fabricante?: string | null
          fazenda_id: string
          id?: string
          lote_produto?: string | null
          observacoes?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          tipo?: string
          updated_at?: string
          via?: string | null
        }
        Update: {
          alvo?: string
          autor?: string | null
          brincos?: string | null
          carencia_ate?: string | null
          carencia_dias?: number
          created_at?: string
          crmv?: string | null
          custo?: number | null
          data?: string
          documento?: string | null
          dose?: string | null
          especie?: string
          fabricante?: string | null
          fazenda_id?: string
          id?: string
          lote_produto?: string | null
          observacoes?: string | null
          produto?: string | null
          quantidade?: number | null
          responsavel?: string | null
          tipo?: string
          updated_at?: string
          via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sanidade_registros_fazenda_id_fkey"
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
      atualizar_coords_fazenda: {
        Args: {
          p_cidade: string
          p_codigo: string
          p_lat: number
          p_lon: number
        }
        Returns: {
          cidade: string
          id: string
          latitude: number
          longitude: number
        }[]
      }
      criar_fazenda: {
        Args: { p_codigo: string; p_nome: string }
        Returns: {
          cidade: string
          codigo_acesso: string
          id: string
          latitude: number
          longitude: number
          nome: string
        }[]
      }
      current_fazenda_id: { Args: never; Returns: string }
      entrar_fazenda: {
        Args: { p_codigo: string }
        Returns: {
          cidade: string
          id: string
          latitude: number
          longitude: number
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
