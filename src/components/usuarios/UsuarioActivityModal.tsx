import { useEffect, useState } from 'react';
import { X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { formatDateBR, getDaysUntil, isOverdue } from '../../utils/dateUtils';

type Tarefa = Database['public']['Tables']['tarefas']['Row'] & {
  clientes?: Database['public']['Tables']['clientes']['Row'];
};

interface UsuarioActivityModalProps {
  usuarioId: string;
  usuarioNome: string;
  onClose: () => void;
}

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

export function UsuarioActivityModal({ usuarioId, usuarioNome, onClose }: UsuarioActivityModalProps) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadTarefas();
  }, [usuarioId]);

  const loadTarefas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tarefas')
        .select(`
          *,
          clientes(razao_social_nome)
        `)
        .eq('responsavel_id', usuarioId)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTarefas = tarefas.filter((t) => !filterStatus || t.status === filterStatus);

  const stats = {
    total: tarefas.length,
    concluidas: tarefas.filter((t) => t.status === 'concluida').length,
    emAndamento: tarefas.filter(
      (t) => t.status === 'em_andamento' || t.status === 'aguardando_cliente' || t.status === 'revisao'
    ).length,
    atrasadas: tarefas.filter((t) => t.status !== 'concluida' && isOverdue(t.data_vencimento))
      .length,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Atividades de {usuarioNome}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-600">Total</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats.total}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-600">Concluídas</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{stats.concluidas}</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-600">Em Andamento</p>
              <p className="text-2xl font-bold text-orange-700 mt-1">{stats.emAndamento}</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">Atrasadas</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{stats.atrasadas}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Filtrar por Status</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  !filterStatus
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todas ({tarefas.length})
              </button>
              <button
                onClick={() => setFilterStatus('concluida')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'concluida'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Concluídas ({tarefas.filter((t) => t.status === 'concluida').length})
              </button>
              <button
                onClick={() => setFilterStatus('em_andamento')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'em_andamento'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Em Andamento ({tarefas.filter((t) => t.status === 'em_andamento').length})
              </button>
              <button
                onClick={() => setFilterStatus('pendente')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'pendente'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pendentes ({tarefas.filter((t) => t.status === 'pendente').length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando tarefas...</div>
          ) : filteredTarefas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhuma tarefa encontrada</div>
          ) : (
            <div className="space-y-3">
              {filteredTarefas.map((tarefa) => {
                const daysUntil = getDaysUntil(tarefa.data_vencimento);
                const overdue = isOverdue(tarefa.data_vencimento);

                return (
                  <div
                    key={tarefa.id}
                    className={`border rounded-lg p-3 ${
                      overdue && tarefa.status !== 'concluida'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {tarefa.titulo}
                        </h4>
                        {tarefa.clientes && (
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {tarefa.clientes.razao_social_nome}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              STATUS_COLORS[tarefa.status]
                            }`}
                          >
                            {STATUS_LABELS[tarefa.status]}
                          </span>

                          <span className="text-xs text-gray-600">
                            Competência: {tarefa.competencia}
                          </span>

                          <div
                            className={`flex items-center gap-1 text-xs ${
                              overdue && tarefa.status !== 'concluida'
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {formatDateBR(tarefa.data_vencimento)}
                            {tarefa.status !== 'concluida' && (
                              <>
                                {overdue ? (
                                  <span className="text-red-600 font-medium">
                                    ({Math.abs(daysUntil)}d atrasado)
                                  </span>
                                ) : daysUntil <= 3 ? (
                                  <span className="text-orange-600 font-medium">
                                    ({daysUntil}d)
                                  </span>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>

                        {tarefa.status === 'concluida' && (
                          <div className="flex items-center gap-1 mt-2 text-green-600">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="text-xs font-medium">Concluída</span>
                          </div>
                        )}

                        {overdue && tarefa.status !== 'concluida' && (
                          <div className="flex items-center gap-1 mt-2 text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-xs font-medium">Atrasada!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
