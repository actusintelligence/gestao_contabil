import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Database } from '../../lib/database.types';

type TenantUser = Database['public']['Tables']['tenant_users']['Row'];

interface UsuariosFormProps {
  usuario?: TenantUser;
  onClose: () => void;
  onSuccess: () => void;
}

export function UsuariosForm({ usuario, onClose, onSuccess }: UsuariosFormProps) {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    role: usuario?.role || 'membro' as 'admin_master' | 'gestor' | 'membro',
    ativo: usuario?.ativo ?? true,
  });

  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setLoading(true);
    setEmailError('');

    try {
      if (usuario) {
        const { error } = await supabase
          .from('tenant_users')
          .update({
            nome: formData.nome,
            role: formData.role,
            ativo: formData.ativo,
          })
          .eq('id', usuario.id);

        if (error) throw error;
      } else {
        const { data: emailCheckData } = await supabase
          .from('tenant_users')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('user_id', formData.email)
          .maybeSingle();

        if (emailCheckData) {
          setEmailError('Este usuário já está vinculado ao tenant');
          setLoading(false);
          return;
        }

        const { data: authUser } = await supabase.auth.admin.listUsers();

        const existingUser = authUser?.users.find((u) => u.email === formData.email);

        if (!existingUser) {
          setEmailError('Usuário não encontrado no sistema. Peça que ele se registre primeiro.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.from('tenant_users').insert([
          {
            tenant_id: tenant.id,
            user_id: existingUser.id,
            nome: formData.nome,
            role: formData.role,
          },
        ]);

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setEmailError('Erro ao salvar usuário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {usuario ? 'Editar Usuário' : 'Adicionar Usuário'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {emailError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {emailError}
            </div>
          )}

          {!usuario && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email do Usuário *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="usuario@example.com"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                O usuário precisa estar registrado no sistema
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Papel *
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as 'admin_master' | 'gestor' | 'membro',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="membro">Membro da Equipe</option>
              <option value="gestor">Gestor de Contabilidade</option>
              <option value="admin_master">Admin Master</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Membro: executa tarefas | Gestor: gerencia equipe | Admin: acesso total
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
              Usuário ativo
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
