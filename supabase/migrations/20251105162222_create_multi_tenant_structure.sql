/*
  # Estrutura Multi-Tenant para Sistema de Gestão Contábil

  ## Descrição
  Cria a estrutura completa de multi-tenant para escritórios de contabilidade,
  incluindo gestão de usuários, clientes, tarefas recorrentes e workflow.

  ## 1. Novas Tabelas

  ### `tenants` (Escritórios de Contabilidade)
  - `id` (uuid, primary key)
  - `nome` (text) - Nome do escritório
  - `cnpj` (text, unique) - CNPJ do escritório
  - `email` (text) - Email de contato
  - `telefone` (text) - Telefone de contato
  - `ativo` (boolean) - Status do tenant
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `tenant_users` (Usuários vinculados a Tenants)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key) - Referência ao tenant
  - `user_id` (uuid, foreign key) - Referência ao auth.users
  - `role` (text) - Papel: 'admin_master', 'gestor', 'membro'
  - `nome` (text) - Nome completo do usuário
  - `ativo` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `clientes` (Clientes Finais - PJ/PF)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `tipo` (text) - 'PJ' ou 'PF'
  - `cnpj_cpf` (text) - CNPJ ou CPF
  - `razao_social_nome` (text) - Razão Social ou Nome
  - `nome_fantasia` (text) - Nome fantasia (para PJ)
  - `inscricao_estadual` (text)
  - `inscricao_municipal` (text)
  - `regime_tributario` (text) - 'simples_nacional', 'lucro_presumido', 'lucro_real'
  - `email` (text)
  - `telefone` (text)
  - `ativo` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `task_templates` (Templates de Tarefas Recorrentes)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `nome` (text) - Ex: "Apuração Simples Nacional"
  - `descricao` (text)
  - `recorrencia` (text) - 'mensal', 'trimestral', 'anual'
  - `dia_vencimento` (integer) - Dia do mês para vencimento
  - `usar_dia_util` (boolean) - Considerar apenas dias úteis
  - `regime_tributario_aplicavel` (text[]) - Array de regimes aplicáveis
  - `ativo` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `tarefas` (Tarefas Geradas)
  - `id` (uuid, primary key)
  - `tenant_id` (uuid, foreign key)
  - `cliente_id` (uuid, foreign key)
  - `template_id` (uuid, foreign key, nullable)
  - `titulo` (text)
  - `descricao` (text)
  - `status` (text) - 'pendente', 'em_andamento', 'aguardando_cliente', 'revisao', 'concluida'
  - `competencia` (text) - Ex: "01/2025"
  - `data_vencimento` (date)
  - `data_conclusao` (date, nullable)
  - `responsavel_id` (uuid, foreign key, nullable) - Referência a tenant_users
  - `prioridade` (text) - 'baixa', 'media', 'alta'
  - `observacoes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `task_history` (Histórico de Alterações)
  - `id` (uuid, primary key)
  - `tarefa_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `status_anterior` (text)
  - `status_novo` (text)
  - `comentario` (text)
  - `created_at` (timestamptz)

  ## 2. Segurança (RLS)
  - Políticas restritivas para garantir isolamento entre tenants
  - Usuários só podem acessar dados do seu tenant
  - Admin Master pode visualizar todos os tenants (role específica)

  ## 3. Índices
  - Índices para melhorar performance de consultas por tenant
  - Índices compostos para buscas frequentes

  ## 4. Observações Importantes
  - Sistema totalmente isolado por tenant (multi-tenant)
  - Suporte a papéis hierárquicos (admin_master > gestor > membro)
  - Campos de data/hora com formato brasileiro na aplicação
  - Estrutura preparada para integração futura com APIs contábeis
*/

-- Criar tabela de tenants (escritórios de contabilidade)
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  email text NOT NULL,
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de usuários vinculados a tenants
CREATE TABLE IF NOT EXISTS tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin_master', 'gestor', 'membro')),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Criar tabela de clientes (PJ/PF)
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('PJ', 'PF')),
  cnpj_cpf text NOT NULL,
  razao_social_nome text NOT NULL,
  nome_fantasia text,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario text CHECK (regime_tributario IN ('simples_nacional', 'lucro_presumido', 'lucro_real')),
  email text,
  telefone text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, cnpj_cpf)
);

-- Criar tabela de templates de tarefas recorrentes
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  descricao text,
  recorrencia text NOT NULL CHECK (recorrencia IN ('mensal', 'trimestral', 'anual')),
  dia_vencimento integer NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  usar_dia_util boolean DEFAULT true,
  regime_tributario_aplicavel text[] DEFAULT '{}',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'aguardando_cliente', 'revisao', 'concluida')),
  competencia text NOT NULL,
  data_vencimento date NOT NULL,
  data_conclusao date,
  responsavel_id uuid REFERENCES tenant_users(id) ON DELETE SET NULL,
  prioridade text DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de histórico de tarefas
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES tarefas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status_anterior text,
  status_novo text NOT NULL,
  comentario text,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_task_templates_tenant ON task_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_tenant ON tarefas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tarefas_vencimento ON tarefas(tenant_id, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente ON tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_task_history_tarefa ON task_history(tarefa_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tenants
CREATE POLICY "Admin master pode ver todos os tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin_master'
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Usuários podem ver seu próprio tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Admin master pode inserir tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin_master'
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Gestores podem atualizar seu tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('admin_master', 'gestor')
      AND tenant_users.ativo = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('admin_master', 'gestor')
      AND tenant_users.ativo = true
    )
  );

-- Políticas RLS para tenant_users
CREATE POLICY "Usuários podem ver membros do seu tenant"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.ativo = true
    )
  );

CREATE POLICY "Gestores podem inserir membros no seu tenant"
  ON tenant_users FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('admin_master', 'gestor')
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Gestores podem atualizar membros do seu tenant"
  ON tenant_users FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('admin_master', 'gestor')
      AND tu.ativo = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('admin_master', 'gestor')
      AND tu.ativo = true
    )
  );

-- Políticas RLS para clientes
CREATE POLICY "Usuários podem ver clientes do seu tenant"
  ON clientes FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Gestores e membros podem inserir clientes"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Gestores e membros podem atualizar clientes"
  ON clientes FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

-- Políticas RLS para task_templates
CREATE POLICY "Usuários podem ver templates do seu tenant"
  ON task_templates FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Gestores podem inserir templates"
  ON task_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('admin_master', 'gestor')
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Gestores podem atualizar templates"
  ON task_templates FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('admin_master', 'gestor')
      AND tenant_users.ativo = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.role IN ('admin_master', 'gestor')
      AND tenant_users.ativo = true
    )
  );

-- Políticas RLS para tarefas
CREATE POLICY "Usuários podem ver tarefas do seu tenant"
  ON tarefas FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Usuários podem inserir tarefas"
  ON tarefas FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

CREATE POLICY "Usuários podem atualizar tarefas"
  ON tarefas FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.ativo = true
    )
  );

-- Políticas RLS para task_history
CREATE POLICY "Usuários podem ver histórico de tarefas do seu tenant"
  ON task_history FOR SELECT
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

CREATE POLICY "Usuários podem inserir histórico"
  ON task_history FOR INSERT
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

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarefas_updated_at BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();