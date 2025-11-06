import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Users, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { isOverdue, getDaysUntil, formatDateBR } from '../../utils/dateUtils';

interface DashboardMetrics {
  totalTarefas: number;
  tarefasConcluidas: number;
  tarefasPendentes: number;
  tarefasAtrasadas: number;
  tarefasProximasVencer: number;
  totalClientes: number;
  taxaConclusao: number;
}

interface TarefaProxima {
  id: string;
  titulo: string;
  data_vencimento: string;
  cliente_nome: string;
  dias_restantes: number;
}

export function Dashboard() {
  const { tenant } = useTenant();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTarefas: 0,
    tarefasConcluidas: 0,
    tarefasPendentes: 0,
    tarefasAtrasadas: 0,
    tarefasProximasVencer: 0,
    totalClientes: 0,
    taxaConclusao: 0,
  });
  const [tarefasProximas, setTarefasProximas] = useState<TarefaProxima[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      loadDashboardData();
    }
  }, [tenant]);

  const loadDashboardData = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      const { data: tarefas } = await supabase
        .from('tarefas')
        .select(`
          *,
          clientes(razao_social_nome)
        `)
        .eq('tenant_id', tenant.id);

      const { data: clientes } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true);

      if (tarefas) {
        const total = tarefas.length;
        const concluidas = tarefas.filter((t) => t.status === 'concluida').length;
        const pendentes = tarefas.filter((t) => t.status !== 'concluida').length;

        const atrasadas = tarefas.filter(
          (t) => t.status !== 'concluida' && isOverdue(t.data_vencimento)
        ).length;

        const proximasVencer = tarefas.filter((t) => {
          if (t.status === 'concluida') return false;
          const dias = getDaysUntil(t.data_vencimento);
          return dias >= 0 && dias <= 7;
        }).length;

        const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0;

        setMetrics({
          totalTarefas: total,
          tarefasConcluidas: concluidas,
          tarefasPendentes: pendentes,
          tarefasAtrasadas: atrasadas,
          tarefasProximasVencer: proximasVencer,
          totalClientes: clientes?.length || 0,
          taxaConclusao,
        });

        const proximas: TarefaProxima[] = tarefas
          .filter((t) => {
            if (t.status === 'concluida') return false;
            const dias = getDaysUntil(t.data_vencimento);
            return dias >= -7 && dias <= 7;
          })
          .map((t) => ({
            id: t.id,
            titulo: t.titulo,
            data_vencimento: t.data_vencimento,
            cliente_nome: t.clientes?.razao_social_nome || 'Cliente não encontrado',
            dias_restantes: getDaysUntil(t.data_vencimento),
          }))
          .sort((a, b) => a.dias_restantes - b.dias_restantes)
          .slice(0, 10);

        setTarefasProximas(proximas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Visão geral do escritório</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Tarefas</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.totalTarefas}</p>
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
              <p className="text-3xl font-bold text-green-600 mt-1">{metrics.taxaConclusao}%</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${metrics.taxaConclusao}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-lg p-5 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Tarefas Atrasadas</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{metrics.tarefasAtrasadas}</p>
            </div>
            <div className="p-3 bg-red-200 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-orange-200 rounded-lg p-5 bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">Vencem em 7 dias</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {metrics.tarefasProximasVencer}
              </p>
            </div>
            <div className="p-3 bg-orange-200 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status das Tarefas</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Concluídas</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {metrics.tarefasConcluidas}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700">Em Andamento</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{metrics.tarefasPendentes}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-700">Atrasadas</span>
              </div>
              <span className="text-sm font-semibold text-red-600">{metrics.tarefasAtrasadas}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Total de Clientes</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{metrics.totalClientes}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Próximos Vencimentos e Atrasados
          </h3>
          {tarefasProximas.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhuma tarefa próxima ao vencimento
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {tarefasProximas.map((tarefa) => (
                <div
                  key={tarefa.id}
                  className={`p-3 rounded-lg border ${
                    tarefa.dias_restantes < 0
                      ? 'bg-red-50 border-red-200'
                      : tarefa.dias_restantes <= 3
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{tarefa.titulo}</p>
                      <p className="text-xs text-gray-600 mt-1 truncate">{tarefa.cliente_nome}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-600">{formatDateBR(tarefa.data_vencimento)}</p>
                      <p
                        className={`text-xs font-medium mt-1 ${
                          tarefa.dias_restantes < 0
                            ? 'text-red-600'
                            : tarefa.dias_restantes <= 3
                            ? 'text-orange-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {tarefa.dias_restantes < 0
                          ? `${Math.abs(tarefa.dias_restantes)} dias atrasado`
                          : tarefa.dias_restantes === 0
                          ? 'Vence hoje'
                          : `${tarefa.dias_restantes} dias`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
