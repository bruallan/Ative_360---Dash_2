import { useState, useEffect } from 'react';
import { SECTORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Filter } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function ClientPanel() {
  const { tasks, clients, loading } = useData();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients]);

  useEffect(() => {
    if (selectedClient) {
      calculateStats();
    }
  }, [selectedClient, tasks]);

  const calculateStats = () => {
    const clientTasks = tasks.filter((task: any) => {
      const clientField = task.custom_fields?.find((f: any) => f.name === 'Cliente');
      if (!clientField || !clientField.value) return false;
      
      let clientName = '';
      if (clientField.type === 'drop_down') {
         const option = clientField.type_config.options.find((o: any) => o.orderindex === clientField.value);
         if (option) clientName = option.name;
      } else {
         clientName = clientField.value;
      }
      return clientName === selectedClient;
    });

    const newStats = SECTORS.map(sector => {
      const sectorTasks = clientTasks.filter((t: any) => t.sector === sector.name);
      const delivered = sectorTasks.filter((t: any) => t.status.status === 'entregue' || t.status.status === 'complete' || t.status.status === 'closed').length;
      const notDelivered = sectorTasks.length - delivered;

      return {
        name: sector.name,
        Entregue: delivered,
        'Não Entregue': notDelivered,
        total: sectorTasks.length
      };
    });

    setStats(newStats);
  };

  if (loading && tasks.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-slate-600" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Painel de Clientes</h1>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="text-sm border-none focus:ring-0 p-0 w-48 bg-transparent font-medium text-slate-700"
          >
            {clients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-6">Status por Setor: {selectedClient}</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const total = data.total;
                    return (
                      <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-sm">
                        <p className="font-semibold mb-2">{label}</p>
                        {payload.map((entry: any) => (
                          <div key={entry.name} className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-500">{entry.name}:</span>
                            <span className="font-medium">
                              {entry.value} ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="Entregue" fill="#475569" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Não Entregue" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Looker Studio Embed */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">Dashboard Analytics</h3>
        <div className="aspect-video w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
          <iframe 
            src="https://lookerstudio.google.com/embed/reporting/9e54cd09-d40f-4c63-a035-5e8be55b929c/page/p_zkb544482c" 
            frameBorder="0" 
            style={{ border: 0 }} 
            allowFullScreen 
            className="w-full h-full"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
