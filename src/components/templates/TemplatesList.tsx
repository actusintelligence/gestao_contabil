import { useEffect, useState } from 'react';
import { Plus, Edit, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Database } from '../../lib/database.types';
import { TemplateForm } from './TemplateForm';

type TaskTemplate = Database['public']['Tables']['task_templates']['Row'];

const RECORRENCIA_LABELS = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  anual: 'Anual',
};

const REGIME_LABELS = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
};

export function TemplatesList() {
  const { tenant } = useTenant();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | undefined>();

  const loadTemplates = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('nome');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [tenant]);

  const handleEdit = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedTemplate(undefined);
  };

  const handleSuccess = () => {
    handleCloseForm();
    loadTemplates();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Templates de Tarefas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum template cadastrado
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{template.nome}</h3>
                      {template.ativo ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    {template.descricao && (
                      <p className="text-sm text-gray-600 mt-1">{template.descricao}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>Recorrência: {RECORRENCIA_LABELS[template.recorrencia]}</span>
                      <span>Vencimento: Dia {template.dia_vencimento}</span>
                      {template.usar_dia_util && (
                        <span className="text-blue-600">Ajusta p/ dia útil</span>
                      )}
                    </div>
                    {template.regime_tributario_aplicavel.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {template.regime_tributario_aplicavel.map((regime) => (
                          <span
                            key={regime}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {REGIME_LABELS[regime as keyof typeof REGIME_LABELS] || regime}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TemplateForm
          template={selectedTemplate}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
