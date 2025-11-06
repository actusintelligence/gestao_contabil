export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          nome: string
          cnpj: string
          email: string
          telefone: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj: string
          email: string
          telefone?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string
          email?: string
          telefone?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tenant_users: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: 'admin_master' | 'gestor' | 'membro'
          nome: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role: 'admin_master' | 'gestor' | 'membro'
          nome: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: 'admin_master' | 'gestor' | 'membro'
          nome?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          tenant_id: string
          tipo: 'PJ' | 'PF'
          cnpj_cpf: string
          razao_social_nome: string
          nome_fantasia: string | null
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          regime_tributario: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null
          email: string | null
          telefone: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          tipo: 'PJ' | 'PF'
          cnpj_cpf: string
          razao_social_nome: string
          nome_fantasia?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          regime_tributario?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null
          email?: string | null
          telefone?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          tipo?: 'PJ' | 'PF'
          cnpj_cpf?: string
          razao_social_nome?: string
          nome_fantasia?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          regime_tributario?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null
          email?: string | null
          telefone?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      task_templates: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          descricao: string | null
          recorrencia: 'mensal' | 'trimestral' | 'anual'
          dia_vencimento: number
          usar_dia_util: boolean
          regime_tributario_aplicavel: string[]
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          nome: string
          descricao?: string | null
          recorrencia: 'mensal' | 'trimestral' | 'anual'
          dia_vencimento: number
          usar_dia_util?: boolean
          regime_tributario_aplicavel?: string[]
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          descricao?: string | null
          recorrencia?: 'mensal' | 'trimestral' | 'anual'
          dia_vencimento?: number
          usar_dia_util?: boolean
          regime_tributario_aplicavel?: string[]
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tarefas: {
        Row: {
          id: string
          tenant_id: string
          cliente_id: string
          template_id: string | null
          titulo: string
          descricao: string | null
          status: 'pendente' | 'em_andamento' | 'aguardando_cliente' | 'revisao' | 'concluida'
          competencia: string
          data_vencimento: string
          data_conclusao: string | null
          responsavel_id: string | null
          prioridade: 'baixa' | 'media' | 'alta'
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cliente_id: string
          template_id?: string | null
          titulo: string
          descricao?: string | null
          status?: 'pendente' | 'em_andamento' | 'aguardando_cliente' | 'revisao' | 'concluida'
          competencia: string
          data_vencimento: string
          data_conclusao?: string | null
          responsavel_id?: string | null
          prioridade?: 'baixa' | 'media' | 'alta'
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cliente_id?: string
          template_id?: string | null
          titulo?: string
          descricao?: string | null
          status?: 'pendente' | 'em_andamento' | 'aguardando_cliente' | 'revisao' | 'concluida'
          competencia?: string
          data_vencimento?: string
          data_conclusao?: string | null
          responsavel_id?: string | null
          prioridade?: 'baixa' | 'media' | 'alta'
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_history: {
        Row: {
          id: string
          tarefa_id: string
          user_id: string | null
          status_anterior: string | null
          status_novo: string
          comentario: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tarefa_id: string
          user_id?: string | null
          status_anterior?: string | null
          status_novo: string
          comentario?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tarefa_id?: string
          user_id?: string | null
          status_anterior?: string | null
          status_novo?: string
          comentario?: string | null
          created_at?: string
        }
      }
      task_comments: {
        Row: {
          id: string
          tarefa_id: string
          user_id: string
          conteudo: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          tarefa_id: string
          user_id: string
          conteudo: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          tarefa_id?: string
          user_id?: string
          conteudo?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      task_audit_log: {
        Row: {
          id: string
          tarefa_id: string
          user_id: string | null
          user_nome: string
          tipo_alteracao: 'criacao' | 'atualizacao_status' | 'atualizacao_responsavel' | 'atualizacao_prioridade' | 'atualizacao_data' | 'conclusao' | 'reabertura' | 'atualizacao_geral'
          campo_alterado: string | null
          valor_anterior: string | null
          valor_novo: string | null
          descricao: string
          created_at: string
        }
        Insert: {
          id?: string
          tarefa_id: string
          user_id?: string | null
          user_nome: string
          tipo_alteracao: 'criacao' | 'atualizacao_status' | 'atualizacao_responsavel' | 'atualizacao_prioridade' | 'atualizacao_data' | 'conclusao' | 'reabertura' | 'atualizacao_geral'
          campo_alterado?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          descricao: string
          created_at?: string
        }
        Update: {
          id?: string
          tarefa_id?: string
          user_id?: string | null
          user_nome?: string
          tipo_alteracao?: 'criacao' | 'atualizacao_status' | 'atualizacao_responsavel' | 'atualizacao_prioridade' | 'atualizacao_data' | 'conclusao' | 'reabertura' | 'atualizacao_geral'
          campo_alterado?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          descricao?: string
          created_at?: string
        }
      }
    }
  }
}
