import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../lib/database.types';
import { TaskComments } from './TaskComments';
import { AuditLog } from './AuditLog';
import { formatDateBR } from '../../utils/dateUtils';

type Tarefa = Database['public']['Tables']['tarefas']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];
type TenantUser = Database['public']['Tables']['tenant_users']['Row'];

interface TarefaDetailModalProps {
  tarefaId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_LABELS = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  aguardando_cliente: 'Aguardando Cliente',
  revisao: 'Revisão',
  concluida: 'Concluída',
};

export function TarefaDetailModal({ tarefaId, onClose, onUpdate }: TarefaDetailModalProps) {
  const { user, tenantUser } = useAuth();
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [responsavel, setResponsavel] = useState<TenantUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Tarefa>>({});

  const loadTarefaDetails = async () => {
    setLoading(true);
    try {
      const { data: tarefaData, error: tarefaError } = await supabase
        .from('tarefas')
        .select('*')
        .eq('id', tarefaId)
        .maybeSingle();

      if (tarefaError) throw tarefaError;
      if (!tarefaData) {
        alert('Tarefa não encontrada');
        onClose();
        return;
      }

      setTarefa(tarefaData);
      setEditData(tarefaData);

      const { data: clienteData } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', tarefaData.cliente_id)
        .maybeSingle();

      if (clienteData) setCliente(clienteData);

      if (tarefaData.responsavel_id) {
        const { data: responsavelData } = await supabase
          .from('tenant_users')
          .select('*')
          .eq('id', tarefaData.responsavel_id)
          .maybeSingle();

        if (responsavelData) setResponsavel(responsavelData);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!tarefa) return;

    setSaving(true);
    try {
      const oldStatus = tarefa.status;
      const oldPrioridade = tarefa.prioridade;
      const oldResponsavelId = tarefa.responsavel_id;
      const oldDataVencimento = tarefa.data_vencimento;

      const updatePayload = {
        status: editData.status || tarefa.status,
        prioridade: editData.prioridade || tarefa.prioridade,
        responsavel_id: editData.responsavel_id || tarefa.responsavel_id,
        data_vencimento: editData.data_vencimento || tarefa.data_vencimento,
        observacoes: editData.observacoes || tarefa.observacoes,
      };

      const { error: updateError } = await supabase
        .from('tarefas')
        .update(updatePayload)
        .eq('id', tarefa.id);

      if (updateError) throw updateError;

      if (oldStatus !== updatePayload.status) {
        await supabase.from('task_audit_log').insert([
          {
            tarefa_id: tarefa.id,
            user_id: user?.id,
            user_nome: tenantUser?.nome || 'Usuário Desconhecido',
            tipo_alteracao: 'atualizacao_status',
            campo_alterado: 'status',
            valor_anterior: oldStatus,
            valor_novo: updatePayload.status,
            descricao: `Status alterado de ${STATUS_LABELS[oldStatus]} para ${STATUS_LABELS[updatePayload.status]}`,
          },
        ]);
      }

      if (oldPrioridade !== updatePayload.prioridade) {
        await supabase.from('task_audit_log').insert([
          {
            tarefa_id: tarefa.id,
            user_id: user?.id,
            user_nome: tenantUser?.nome || 'Usuário Desconhecido',
            tipo_alteracao: 'atualizacao_prioridade',
            campo_alterado: 'prioridade',
            valor_anterior: oldPrioridade,
            valor_novo: updatePayload.prioridade,
            descricao: `Prioridade alterada de ${oldPrioridade} para ${updatePayload.prioridade}`,
          },
        ]);
      }

      if (oldResponsavelId !== updatePayload.responsavel_id) {
        await supabase.from('task_audit_log').insert([
          {
            tarefa_id: tarefa.id,
            user_id: user?.id,
            user_nome: tenantUser?.nome || 'Usuário Desconhecido',
            tipo_alteracao: 'atualizacao_responsavel',
            campo_alterado: 'responsavel_id',
            valor_anterior: oldResponsavelId || 'Nenhum',
            valor_novo: updatePayload.responsavel_id || 'Nenhum',
            descricao: `Responsável alterado`,
          },
        ]);
      }

      if (oldDataVencimento !== updatePayload.data_vencimento) {
        await supabase.from('task_audit_log').insert([
          {
            tarefa_id: tarefa.id,
            user_id: user?.id,
            user_nome: tenantUser?.nome || 'Usuário Desconhecido',
            tipo_alteracao: 'atualizacao_data',
            campo_alterado: 'data_vencimento',
            valor_anterior: formatDateBR(oldDataVencimento),
            valor_novo: formatDateBR(updatePayload.data_vencimento),
            descricao: `Data de vencimento alterada de ${formatDateBR(oldDataVencimento)} para ${formatDateBR(updatePayload.data_vencimento)}`,
          },
        ]);
      }

      setEditing(false);
      onUpdate();
      await loadTarefaDetails();
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      alert('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!tarefa) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Detalhes da Tarefa</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">{tarefa.titulo}</h3>

            {cliente && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Cliente</p>
                  <p className="font-medium text-gray-900">{cliente.razao_social_nome}</p>
                </div>
                <div>
                  <p className="text-gray-600">Competência</p>
                  <p className="font-medium text-gray-900">{tarefa.competencia}</p>
                </div>
              </div>
            )}

            {editing ? (
              <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editData.status || tarefa.status}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          status: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="aguardando_cliente">Aguardando Cliente</option>
                      <option value="revisao">Revisão</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={editData.prioridade || tarefa.prioridade}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          prioridade: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Vencimento
                    </label>
                    <input
                      type="date"
                      value={editData.data_vencimento || tarefa.data_vencimento}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          data_vencimento: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsável
                    </label>
                    <select
                      value={editData.responsavel_id || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          responsavel_id: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sem responsável</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={editData.observacoes || tarefa.observacoes || ''}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        observacoes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditData(tarefa);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600">Status</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {STATUS_LABELS[tarefa.status]}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600">Prioridade</p>
                  <p className="font-medium text-gray-900 mt-1 capitalize">
                    {tarefa.prioridade}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600">Vencimento</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {formatDateBR(tarefa.data_vencimento)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600">Responsável</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {responsavel?.nome || 'Sem responsável'}
                  </p>
                </div>
              </div>
            )}

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Editar Tarefa
              </button>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <TaskComments tarefaId={tarefaId} />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <AuditLog tarefaId={tarefaId} />
          </div>
        </div>
      </div>
    </div>
  );
}
