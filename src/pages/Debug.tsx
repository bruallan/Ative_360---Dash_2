import React from 'react';
import { useData } from '../context/DataContext';
import { Loader2, RefreshCw } from 'lucide-react';

export default function Debug() {
  const { tasks, clients, loading, fetchData } = useData();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Debug</h1>
        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar Dados
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total de Tarefas</h3>
          <p className="text-3xl font-bold text-slate-900">{tasks.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total de Clientes</h3>
          <p className="text-3xl font-bold text-slate-900">{clients.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Status</h3>
          <p className="text-3xl font-bold text-emerald-600">{loading ? 'Carregando...' : 'Pronto'}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">Lista de Clientes Identificados</h3>
        <div className="flex flex-wrap gap-2">
          {clients.map(client => (
            <span key={client} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium border border-slate-200">
              {client}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
