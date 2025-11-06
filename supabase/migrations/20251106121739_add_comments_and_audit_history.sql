/*
  # Adicionar Sistema de Comentários e Auditoria Detalhada

  ## Descrição
  Adiciona tabelas para comentários nas tarefas e histórico detalhado de auditoria,
  permitindo rastreamento completo de todas as alterações.

  ## 1. Novas Tabelas

  ### `task_comments` (Comentários nas Tarefas)
  - `id` (uuid, primary key)
  - `tarefa_id` (uuid, foreign key) - Referência à tarefa
  - `user_id` (uuid, foreign key) - Referência ao auth.users
  - `conteudo` (text) - Texto do comentário
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz, nullable) - Data da última edição

  ### `task_audit_log` (Histórico Detalhado de Auditoria)
  - `id` (uuid, primary key)
  - `tarefa_id` (uuid, foreign key) - Referência à tarefa
  - `user_id` (uuid, foreign key) - Referência ao auth.users que fez a alteração
  - `user_nome` (text) - Nome do usuário (para auditoria offline)
  - `tipo_alteracao` (text) - Tipo: 'criacao', 'atualizacao_status', 'atualizacao_responsavel', 
                                     'atualizacao_prioridade', 'atualizacao_data', 'conclusao', 'reabertura'
  - `campo_alterado` (text) - Campo específico alterado (ex: status, responsavel_id)
  - `valor_anterior` (text) - Valor antes da alteração
  - `valor_novo` (text) - Valor após a alteração
  - `descricao` (text) - Descrição legível da alteração
  - `created_at` (timestamptz)

  ## 2. Segurança (RLS)
  - Políticas para garantir que usuários do tenant possam ver comentários e auditoria
  - Usuários podem criar comentários em tarefas do seu tenant
  - Histórico é imutável (insert only, sem update/delete)

  ## 3. Índices
  - Índices para melhorar performance de buscas
*/

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conteudo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Criar tabela de histórico de auditoria
CREATE TABLE IF NOT EXISTS task_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_nome text NOT NULL,
  tipo_alteracao text NOT NULL CHECK (tipo_alteracao IN (
    'criacao', 'atualizacao_status', 'atualizacao_responsavel',
    'atualizacao_prioridade', 'atualizacao_data', 'conclusao', 'reabertura', 'atualizacao_geral'
  )),
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  descricao text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_task_comments_tarefa ON task_comments(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON task_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_tarefa ON task_audit_log(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_user ON task_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_created ON task_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_audit_log_tipo ON task_audit_log(tipo_alteracao);

-- Habilitar RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para task_comments
CREATE POLICY "Usuários podem ver comentários de tarefas do seu tenant"
  ON task_comments FOR SELECT
  TO authenticated
  USING (
    tarefa_id IN (
      SELECT id FROM tarefas
      WHERE tarefas.tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid()
        AND tenant_users.ativo = true
      )
    )
  );

CREATE POLICY "Usuários podem criar comentários em tarefas do seu tenant"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    tarefa_id IN (
      SELECT id FROM tarefas
      WHERE tarefas.tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid()
        AND tenant_users.ativo = true
      )
    )
  );

CREATE POLICY "Usuários podem editar seus próprios comentários"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar seus próprios comentários"
  ON task_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas RLS para task_audit_log (somente leitura, imutável)
CREATE POLICY "Usuários podem ver histórico de auditoria de tarefas do seu tenant"
  ON task_audit_log FOR SELECT
  TO authenticated
  USING (
    tarefa_id IN (
      SELECT id FROM tarefas
      WHERE tarefas.tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid()
        AND tenant_users.ativo = true
      )
    )
  );

CREATE POLICY "Usuários podem inserir registros de auditoria"
  ON task_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    tarefa_id IN (
      SELECT id FROM tarefas
      WHERE tarefas.tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid()
        AND tenant_users.ativo = true
      )
    )
  );
