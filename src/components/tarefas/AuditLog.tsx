import { useEffect, useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { formatDateTimeBR } from '../../utils/dateUtils';

type AuditLog = Database['public']['Tables']['task_audit_log']['Row'];

interface AuditLogProps {
  tarefaId: string;
}

const TIPO_ALTERACAO_LABELS: Record<string, string> = {
  criacao: 'Criação',
  atualizacao_status: 'Atualização de Status',
  atualizacao_responsavel: 'Atualização de Responsável',
  atualizacao_prioridade: 'Atualização de Prioridade',
  atualizacao_data: 'Atualização de Data',
  conclusao: 'Conclusão',
  reabertura: 'Reabertura',
  atualizacao_geral: 'Atualização Geral',
};

const TIPO_ALTERACAO_COLORS: Record<string, string> = {
  criacao: 'bg-blue-100 text-blue-700 border-blue-200',
  atualizacao_status: 'bg-purple-100 text-purple-700 border-purple-200',
  atualizacao_responsavel: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  atualizacao_prioridade: 'bg-orange-100 text-orange-700 border-orange-200',
  atualizacao_data: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  conclusao: 'bg-green-100 text-green-700 border-green-200',
  reabertura: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  atualizacao_geral: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function AuditLog({ tarefaId }: AuditLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadAuditLog();
  }, [tarefaId]);

  const loadAuditLog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_audit_log')
        .select('*')
        .eq('tarefa_id', tarefaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Histórico de Auditoria</h3>
          <span className="text-sm text-gray-500">({logs.length})</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-white max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Nenhum registro de auditoria</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-3 space-y-1 ${
                    TIPO_ALTERACAO_COLORS[log.tipo_alteracao]
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {TIPO_ALTERACAO_LABELS[log.tipo_alteracao]}
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                            Mais Recente
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium break-words">{log.descricao}</p>

                      {log.valor_anterior && log.valor_novo && (
                        <div className="text-xs mt-1 space-y-0.5">
                          <p>
                            <span className="font-semibold">Campo:</span> {log.campo_alterado}
                          </p>
                          <p>
                            <span className="font-semibold">De:</span> {log.valor_anterior}
                          </p>
                          <p>
                            <span className="font-semibold">Para:</span> {log.valor_novo}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-current border-opacity-20">
                        <span className="text-xs font-semibold">{log.user_nome}</span>
                        <span className="text-xs">{formatDateTimeBR(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
