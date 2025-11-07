import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { isOverdue, getDaysUntil } from '../../utils/dateUtils';
import { UsuarioActivityModal } from '../usuarios/UsuarioActivityModal';
import { Database } from '../../lib/database.types';

type TenantUser = Database['public']['Tables']['tenant_users']['Row'];
type Tarefa = Database['public']['Tables']['tarefas']['Row'] & {
  clientes?: Database['public']['Tables']['clientes']['Row'];
  tenant_users?: Database['public']['Tables']['tenant_users']['Row'];
};

interface UsuarioMetrics {
  usuario: TenantUser;
  total: number;
  concluidas: number;
  emAndamento: number;
  atrasadas: number;
  taxaConclusao: number;
  tarefasProximas: number;
}

export function DashboardAdvanced() {
  const { tenant } = useTenant();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [usuarios, setUsuarios] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30 | 'total'>(7);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<string | null>(null);
  const [selectedUsuarioNome, setSelectedUsuarioNome] = useState('');

  useEffect(() => {
    if (tenant) {
      loadData();
    }
  }, [tenant, period]);

  const loadData = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      const { data: tarefasData } = await supabase
        .from('tarefas')
        .select(`
          *,
          clientes(razao_social_nome),
          tenant_users(nome)
        `)
        .eq('tenant_id', tenant.id)
        .order('data_vencimento', { ascending: true });

      const { data: usuariosData } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome');

      if (tarefasData) {
        const now = new Date();
        let filteredTarefas = tarefasData;

        if (period !== 'total') {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - period);

          filteredTarefas = tarefasData.filter((t) => {
            const taskDate = new Date(t.data_vencimento);
            return taskDate >= startDate && taskDate <= now;
          });
        }

        setTarefas(filteredTarefas);
      }

      if (usuariosData) {
        setUsuarios(usuariosData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserMetrics = (usuario: TenantUser): UsuarioMetrics => {
    const userTarefas = tarefas.filter((t) => t.responsavel_id === usuario.id);

    const total = userTarefas.length;
    const concluidas = userTarefas.filter((t) => t.status === 'concluida').length;
    const emAndamento = userTarefas.filter(
      (t) =>
        t.status === 'em_andamento' ||
        t.status === 'aguardando_cliente' ||
        t.status === 'revisao'
    ).length;
    const atrasadas = userTarefas.filter(
      (t) => t.status !== 'concluida' && isOverdue(t.data_vencimento)
    ).length;
    const tarefasProximas = userTarefas.filter((t) => {
      if (t.status === 'concluida') return false;
      const dias = getDaysUntil(t.data_vencimento);
      return dias >= 0 && dias <= 7;
    }).length;

    const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    return {
      usuario,
      total,
      concluidas,
      emAndamento,
      atrasadas,
      taxaConclusao,
      tarefasProximas,
    };
  };

  const metricsArray = usuarios
    .map((usuario) => calculateUserMetrics(usuario))
    .sort((a, b) => b.total - a.total);

  const totals = {
    tarefas: tarefas.length,
    concluidas: tarefas.filter((t) => t.status === 'concluida').length,
    atrasadas: tarefas.filter((t) => t.status !== 'concluida' && isOverdue(t.data_vencimento))
      .length,
  };

  const totalTaxaConclusao =
    totals.tarefas > 0 ? Math.round((totals.concluidas / totals.tarefas) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Avançado</h2>
          <p className="text-gray-600 mt-1">Análise de desempenho por usuário e período</p>
        </div>

        <div className="flex gap-2">
          {[
            { label: '7 dias', value: 7 as const },
            { label: '14 dias', value: 14 as const },
            { label: '30 dias', value: 30 as const },
            { label: 'Total', value: 'total' as const },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Tarefas</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totals.tarefas}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Conclusão</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{totalTaxaConclusao}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${totalTaxaConclusao}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-5 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Tarefas Atrasadas</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{totals.atrasadas}</p>
            </div>
            <div className="p-3 bg-red-200 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuários Ativos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{usuarios.length}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Desempenho por Usuário</h3>

        {metricsArray.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Nenhum usuário com tarefas neste período
          </p>
        ) : (
          <div className="space-y-3">
            {metricsArray.map((metric) => (
              <button
                key={metric.usuario.id}
                onClick={() => {
                  setSelectedUsuarioId(metric.usuario.id);
                  setSelectedUsuarioNome(metric.usuario.nome);
                }}
                className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:shadow-md transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{metric.usuario.nome}</h4>
                    <p className="text-xs text-gray-500 mt-1">Clique para ver detalhes</p>
                  </div>

                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">{metric.total}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">{metric.concluidas}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-orange-50 rounded-lg p-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-700">
                      {metric.emAndamento}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-red-50 rounded-lg p-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-700">{metric.atrasadas}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-calendar-50 rounded-lg p-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">
                      {metric.tarefasProximas}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">Taxa</span>
                        <span className="text-sm font-bold text-gray-900">{metric.taxaConclusao}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${metric.taxaConclusao}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>
            <span className="font-semibold">Legenda:</span> Total de tarefas | Concluídas | Em
            Andamento | Atrasadas | Próximas a vencer (7 dias) | Taxa de Conclusão
          </p>
        </div>
      </div>

      {selectedUsuarioId && (
        <UsuarioActivityModal
          usuarioId={selectedUsuarioId}
          usuarioNome={selectedUsuarioNome}
          onClose={() => setSelectedUsuarioId(null)}
        />
      )}
    </div>
  );
}
