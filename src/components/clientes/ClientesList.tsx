import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Building2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Database } from '../../lib/database.types';
import { ClienteForm } from './ClienteForm';

type Cliente = Database['public']['Tables']['clientes']['Row'];

const REGIME_LABELS = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
};

export function ClientesList() {
  const { tenant } = useTenant();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | undefined>();

  const loadClientes = async () => {
    if (!tenant) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('razao_social_nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, [tenant]);

  const filteredClientes = clientes.filter((c) =>
    c.razao_social_nome.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj_cpf.includes(search) ||
    (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedCliente(undefined);
  };

  const handleSuccess = () => {
    handleCloseForm();
    loadClientes();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ/CPF ou nome fantasia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando clientes...</div>
      ) : filteredClientes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${cliente.tipo === 'PJ' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {cliente.tipo === 'PJ' ? (
                      <Building2 className={`w-5 h-5 ${cliente.tipo === 'PJ' ? 'text-blue-600' : 'text-green-600'}`} />
                    ) : (
                      <User className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{cliente.razao_social_nome}</h3>
                    {cliente.nome_fantasia && (
                      <p className="text-sm text-gray-600">{cliente.nome_fantasia}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>{cliente.tipo === 'PJ' ? 'CNPJ' : 'CPF'}: {cliente.cnpj_cpf}</span>
                      {cliente.regime_tributario && (
                        <span>Regime: {REGIME_LABELS[cliente.regime_tributario]}</span>
                      )}
                      {!cliente.ativo && (
                        <span className="text-red-600 font-medium">Inativo</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(cliente)}
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
        <ClienteForm
          cliente={selectedCliente}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
