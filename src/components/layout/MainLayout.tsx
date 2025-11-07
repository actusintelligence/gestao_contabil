import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../dashboard/Dashboard';
import { DashboardAdvanced } from '../dashboard/DashboardAdvanced';
import { ClientesList } from '../clientes/ClientesList';
import { TarefasList } from '../tarefas/TarefasList';
import { TemplatesList } from '../templates/TemplatesList';
import { UsuariosList } from '../usuarios/UsuariosList';
import { TaskGenerator } from '../tarefas/TaskGenerator';

export function MainLayout() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'dashboard-avancado':
        return <DashboardAdvanced />;
      case 'clientes':
        return <ClientesList />;
      case 'tarefas':
        return (
          <div className="space-y-6">
            <TaskGenerator />
            <TarefasList />
          </div>
        );
      case 'templates':
        return <TemplatesList />;
      case 'usuarios':
        return <UsuariosList />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
