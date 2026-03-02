import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

export default function ExecutionLog() {
  const { logs } = useData();
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState('');

  const toggleLog = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const filteredLogs = logs.filter(log => 
    log.url.toLowerCase().includes(filter.toLowerCase()) || 
    JSON.stringify(log.data).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Log de Execução</h1>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Filtrar logs..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          />
        </div>

        <div className="space-y-2">
          {filteredLogs.map((log, index) => (
            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleLog(index)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {expandedLogs.has(index) ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.status >= 400 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {log.status}
                  </span>
                  <span className="text-xs font-mono text-slate-600 truncate" title={log.url}>{log.url}</span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              {expandedLogs.has(index) && (
                <div className="p-4 bg-slate-900 text-slate-50 overflow-x-auto">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-slate-400">Nenhum log encontrado</div>
          )}
        </div>
      </div>
    </div>
  );
}
