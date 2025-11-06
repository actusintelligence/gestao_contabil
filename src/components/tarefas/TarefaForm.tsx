import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../lib/database.types';

type Tarefa = Database['public']['Tables']['tarefas']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];
type TenantUser = Database['public']['Tables']['tenant_users']['Row'];

interface TarefaFormProps {
  tarefa?: Tarefa;
  onClose: () => void;
  onSuccess: () => void;
}

export function TarefaForm({ tarefa, onClose, onSuccess }: TarefaFormProps) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<TenantUser[]>([]);
  const [formData, setFormData] = useState({
    cliente_id: tarefa?.cliente_id || '',
    titulo: tarefa?.titulo || '',
    descricao: tarefa?.descricao || '',
    status: tarefa?.status || 'pendente' as 'pendente' | 'em_andamento' | 'aguardando_cliente' | 'revisao' | 'concluida',
    competencia: tarefa?.competencia || '',
    data_vencimento: tarefa?.data_vencimento || '',
    responsavel_id: tarefa?.responsavel_id || '',
    prioridade: tarefa?.prioridade || 'media' as 'baixa' | 'media' | 'alta',
    observacoes: tarefa?.observacoes || '',
  });

  useEffect(() => {
    if (tenant) {
      loadClientes();
      loadUsuarios();
    }
  }, [tenant]);

  const loadClientes = async () => {
    if (!tenant) return;

    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('razao_social_nome');

    setClientes(data || []);
  };

  const loadUsuarios = async () => {
    if (!tenant) return;

    const { data } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome');

    setUsuarios(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);
    try {
      const oldStatus = tarefa?.status;

      if (tarefa) {
        const { error } = await supabase
          .from('tarefas')
          .update(formData)
          .eq('id', tarefa.id);
        if (error) throw error;

        if (oldStatus !== formData.status) {
          await supabase.from('task_history').insert([
            {
              tarefa_id: tarefa.id,
              user_id: user?.id,
              status_anterior: oldStatus,
              status_novo: formData.status,
            },
          ]);
        }
      } else {
        const { data: newTarefa, error } = await supabase
          .from('tarefas')
          .insert([{ ...formData, tenant_id: tenant.id }])
          .select()
          .single();

        if (error) throw error;

        if (newTarefa) {
          await supabase.from('task_history').insert([
            {
              tarefa_id: newTarefa.id,
              user_id: user?.id,
              status_novo: 'pendente',
            },
          ]);
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      alert('Erro ao salvar tarefa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.razao_social_nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competência *
              </label>
              <input
                type="text"
                value={formData.competencia}
                onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                placeholder="MM/AAAA"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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
                Prioridade *
              </label>
              <select
                value={formData.prioridade}
                onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável
            </label>
            <select
              value={formData.responsavel_id}
              onChange={(e) => setFormData({ ...formData, responsavel_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sem responsável</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
