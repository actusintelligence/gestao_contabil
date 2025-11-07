import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, Circle, Shield, UserCog, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Database } from '../../lib/database.types';
import { UsuariosForm } from './UsuariosForm';

type TenantUser = Database['public']['Tables']['tenant_users']['Row'];

const ROLE_LABELS = {
  admin_master: 'Admin Master',
  gestor: 'Gestor',
  membro: 'Membro',
};

const ROLE_ICONS = {
  admin_master: Shield,
  gestor: UserCog,
  membro: User,
};

const ROLE_COLORS = {
  admin_master: 'bg-red-100 text-red-700',
  gestor: 'bg-blue-100 text-blue-700',
  membro: 'bg-gray-100 text-gray-700',
};

export function UsuariosList() {
  const { tenant } = useTenant();
  const [usuarios, setUsuarios] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<TenantUser | undefined>();

  const loadUsuarios = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('nome');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, [tenant]);

  const handleEdit = (usuario: TenantUser) => {
    setSelectedUsuario(usuario);
    setShowForm(true);
  };

  const handleDelete = async (usuarioId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;

    try {
      const { error } = await supabase.from('tenant_users').delete().eq('id', usuarioId);

      if (error) throw error;
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      alert('Erro ao remover usuário');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedUsuario(undefined);
  };

  const handleSuccess = () => {
    handleCloseForm();
    loadUsuarios();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Usuários</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Usuário
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando usuários...</div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Nenhum usuário cadastrado</div>
      ) : (
        <div className="grid gap-3">
          {usuarios.map((usuario) => {
            const RoleIcon = ROLE_ICONS[usuario.role];

            return (
              <div
                key={usuario.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${ROLE_COLORS[usuario.role]}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{usuario.nome}</h3>
                        {usuario.ativo ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            ROLE_COLORS[usuario.role]
                          }`}
                        >
                          {ROLE_LABELS[usuario.role]}
                        </span>
                        {!usuario.ativo && (
                          <span className="text-xs text-gray-500 font-medium">Inativo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(usuario)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar usuário"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <UsuariosForm
          usuario={selectedUsuario}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
