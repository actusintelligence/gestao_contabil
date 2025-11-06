import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Clock, AlertCircle, CheckCircle2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Database } from '../../lib/database.types';
import { TarefaForm } from './TarefaForm';
import { TarefaDetailModal } from './TarefaDetailModal';
import { formatDateBR, getDaysUntil, isOverdue } from '../../utils/dateUtils';

type Tarefa = Database['public']['Tables']['tarefas']['Row'] & {
  clientes?: Database['public']['Tables']['clientes']['Row'];
  tenant_users?: Database['public']['Tables']['tenant_users']['Row'];
};

const STATUS_LABELS = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  aguardando_cliente: 'Aguardando Cliente',
  revisao: 'Revisão',
  concluida: 'Concluída',
};

const STATUS_COLORS = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  aguardando_cliente: 'bg-yellow-100 text-yellow-700',
  revisao: 'bg-orange-100 text-orange-700',
  concluida: 'bg-green-100 text-green-700',
};

const PRIORIDADE_COLORS = {
  baixa: 'text-gray-600',
  media: 'text-blue-600',
  alta: 'text-red-600',
};

export function TarefasList() {
  const { tenant } = useTenant();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | undefined>();
  const [detailModalTarefaId, setDetailModalTarefaId] = useState<string | null>(null);

  const loadTarefas = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tarefas')
        .select(`
          *,
          clientes(razao_social_nome),
          tenant_users(nome)
        `)
        .eq('tenant_id', tenant.id)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTarefas();
  }, [tenant]);

  const filteredTarefas = tarefas.filter((t) => {
    const matchesSearch =
      !search ||
      t.titulo.toLowerCase().includes(search.toLowerCase()) ||
      t.competencia.includes(search) ||
      (t.clientes && t.clientes.razao_social_nome.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = !filterStatus || t.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedTarefa(undefined);
  };

  const handleSuccess = () => {
    handleCloseForm();
    loadTarefas();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tarefas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por título, cliente ou competência..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="aguardando_cliente">Aguardando Cliente</option>
          <option value="revisao">Revisão</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando tarefas...</div>
      ) : filteredTarefas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {search || filterStatus ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa cadastrada'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTarefas.map((tarefa) => {
            const daysUntil = getDaysUntil(tarefa.data_vencimento);
            const overdue = isOverdue(tarefa.data_vencimento);

            return (
              <div
                key={tarefa.id}
                className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  overdue && tarefa.status !== 'concluida'
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{tarefa.titulo}</h3>
                        {tarefa.clientes && (
                          <p className="text-sm text-gray-600 mt-1">
                            Cliente: {tarefa.clientes.razao_social_nome}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              STATUS_COLORS[tarefa.status]
                            }`}
                          >
                            {STATUS_LABELS[tarefa.status]}
                          </span>

                          <span className="text-sm text-gray-600">
                            Competência: {tarefa.competencia}
                          </span>

                          <span
                            className={`text-sm flex items-center gap-1 ${
                              overdue && tarefa.status !== 'concluida'
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            Vencimento: {formatDateBR(tarefa.data_vencimento)}
                            {tarefa.status !== 'concluida' && (
                              <>
                                {overdue ? (
                                  <span className="text-red-600 font-medium">
                                    ({Math.abs(daysUntil)} dias atrasado)
                                  </span>
                                ) : daysUntil <= 7 ? (
                                  <span className="text-orange-600 font-medium">
                                    ({daysUntil} dias)
                                  </span>
                                ) : null}
                              </>
                            )}
                          </span>

                          {tarefa.tenant_users && (
                            <span className="text-sm text-gray-600">
                              Responsável: {tarefa.tenant_users.nome}
                            </span>
                          )}
                        </div>

                        {tarefa.status === 'concluida' && (
                          <div className="flex items-center gap-2 mt-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Concluída
                              {tarefa.data_conclusao && ` em ${formatDateBR(tarefa.data_conclusao)}`}
                            </span>
                          </div>
                        )}

                        {overdue && tarefa.status !== 'concluida' && (
                          <div className="flex items-center gap-2 mt-2 text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Tarefa atrasada!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setDetailModalTarefaId(tarefa.id)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Ver detalhes e comentários"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(tarefa)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar tarefa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TarefaForm
          tarefa={selectedTarefa}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}

      {detailModalTarefaId && (
        <TarefaDetailModal
          tarefaId={detailModalTarefaId}
          onClose={() => setDetailModalTarefaId(null)}
          onUpdate={loadTarefas}
        />
      )}
    </div>
  );
}
