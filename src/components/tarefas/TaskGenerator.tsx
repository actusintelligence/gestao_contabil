import { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { calculateDueDate, formatCompetencia, getMonthsForRecurrence } from '../../utils/dateUtils';

export function TaskGenerator() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [competencia, setCompetencia] = useState(() => {
    const now = new Date();
    return formatCompetencia(now);
  });

  const generateTasks = async () => {
    if (!tenant) return;

    setLoading(true);
    setResult(null);

    try {
      const { data: templates, error: templatesError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true);

      if (templatesError) throw templatesError;

      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true);

      if (clientesError) throw clientesError;

      if (!templates || templates.length === 0) {
        setResult({ success: 0, errors: ['Nenhum template ativo encontrado'] });
        return;
      }

      if (!clientes || clientes.length === 0) {
        setResult({ success: 0, errors: ['Nenhum cliente ativo encontrado'] });
        return;
      }

      let successCount = 0;
      const errors: string[] = [];

      for (const template of templates) {
        for (const cliente of clientes) {
          if (
            template.regime_tributario_aplicavel.length > 0 &&
            cliente.regime_tributario &&
            !template.regime_tributario_aplicavel.includes(cliente.regime_tributario)
          ) {
            continue;
          }

          const { data: existing } = await supabase
            .from('tarefas')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('cliente_id', cliente.id)
            .eq('template_id', template.id)
            .eq('competencia', competencia)
            .maybeSingle();

          if (existing) {
            continue;
          }

          const dataVencimento = calculateDueDate(
            competencia,
            template.dia_vencimento,
            template.usar_dia_util
          );

          const { error: insertError } = await supabase.from('tarefas').insert([
            {
              tenant_id: tenant.id,
              cliente_id: cliente.id,
              template_id: template.id,
              titulo: template.nome,
              descricao: template.descricao,
              competencia,
              data_vencimento: dataVencimento.toISOString().split('T')[0],
              status: 'pendente',
              prioridade: 'media',
            },
          ]);

          if (insertError) {
            errors.push(
              `Erro ao criar tarefa para ${cliente.razao_social_nome}: ${insertError.message}`
            );
          } else {
            successCount++;
          }
        }
      }

      setResult({ success: successCount, errors });
    } catch (error) {
      console.error('Erro ao gerar tarefas:', error);
      setResult({ success: 0, errors: ['Erro ao gerar tarefas'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Gerador de Tarefas Recorrentes
          </h3>
          <p className="text-sm text-gray-600">
            Cria automaticamente tarefas baseadas nos templates
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Competência
          </label>
          <input
            type="text"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            placeholder="MM/AAAA"
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Formato: MM/AAAA (ex: 01/2025)</p>
        </div>

        <button
          onClick={generateTasks}
          disabled={loading || !competencia.match(/^\d{2}\/\d{4}$/)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Gerando tarefas...' : 'Gerar Tarefas'}
        </button>

        {result && (
          <div className="mt-4 space-y-2">
            {result.success > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  {result.success} tarefa(s) criada(s) com sucesso!
                </p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-yellow-700">
                    Avisos durante a geração:
                  </p>
                </div>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  {result.errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>E mais {result.errors.length - 5} erro(s)...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
