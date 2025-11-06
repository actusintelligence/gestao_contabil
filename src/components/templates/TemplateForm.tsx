import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Database } from '../../lib/database.types';

type TaskTemplate = Database['public']['Tables']['task_templates']['Row'];

interface TemplateFormProps {
  template?: TaskTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

const REGIME_OPTIONS = [
  { value: 'simples_nacional', label: 'Simples Nacional' },
  { value: 'lucro_presumido', label: 'Lucro Presumido' },
  { value: 'lucro_real', label: 'Lucro Real' },
];

export function TemplateForm({ template, onClose, onSuccess }: TemplateFormProps) {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: template?.nome || '',
    descricao: template?.descricao || '',
    recorrencia: template?.recorrencia || 'mensal' as 'mensal' | 'trimestral' | 'anual',
    dia_vencimento: template?.dia_vencimento || 20,
    usar_dia_util: template?.usar_dia_util ?? true,
    regime_tributario_aplicavel: template?.regime_tributario_aplicavel || [] as string[],
    ativo: template?.ativo ?? true,
  });

  const handleRegimeChange = (regime: string) => {
    const current = formData.regime_tributario_aplicavel;
    if (current.includes(regime)) {
      setFormData({
        ...formData,
        regime_tributario_aplicavel: current.filter(r => r !== regime),
      });
    } else {
      setFormData({
        ...formData,
        regime_tributario_aplicavel: [...current, regime],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);
    try {
      if (template) {
        const { error } = await supabase
          .from('task_templates')
          .update(formData)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_templates')
          .insert([{ ...formData, tenant_id: tenant.id }]);
        if (error) throw error;
      }
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      alert('Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Editar Template' : 'Novo Template de Tarefa'}
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
              Nome da Tarefa *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Apuração Simples Nacional"
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
              placeholder="Descreva os detalhes da tarefa..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recorrência *
              </label>
              <select
                value={formData.recorrencia}
                onChange={(e) => setFormData({ ...formData, recorrencia: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia do Vencimento *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dia_vencimento}
                onChange={(e) => setFormData({ ...formData, dia_vencimento: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="usar_dia_util"
              checked={formData.usar_dia_util}
              onChange={(e) => setFormData({ ...formData, usar_dia_util: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="usar_dia_util" className="ml-2 text-sm text-gray-700">
              Ajustar para dia útil (se vencimento cair em fim de semana/feriado)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Regimes Tributários Aplicáveis
            </label>
            <div className="space-y-2">
              {REGIME_OPTIONS.map((regime) => (
                <div key={regime.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={regime.value}
                    checked={formData.regime_tributario_aplicavel.includes(regime.value)}
                    onChange={() => handleRegimeChange(regime.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={regime.value} className="ml-2 text-sm text-gray-700">
                    {regime.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Deixe vazio para aplicar a todos os regimes
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
              Template ativo
            </label>
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
