import { useState, useEffect } from 'react';
import { SECTORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Filter, Link as LinkIcon, Save, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { format } from 'date-fns';

export default function ClientPanel() {
  const { tasks, clients, loading, addLog } = useData();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [stats, setStats] = useState<any[]>([]);
  const [clientLinks, setClientLinks] = useState<Record<string, string>>({});
  const [embedLink, setEmbedLink] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTasks, setModalTasks] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    fetch('/api/client-links')
      .then(async res => {
        if (!res.ok) {
           const text = await res.text();
           addLog('/api/client-links', res.status, { error: text });
           throw new Error(text);
        }
        return res.json();
      })
      .then(data => {
        setClientLinks(data);
        addLog('/api/client-links', 200, { action: 'fetch', count: Object.keys(data).length });
      })
      .catch(err => console.error('Error fetching client links:', err));
  }, []);

  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0]);
    }
  }, [clients]);

  useEffect(() => {
    if (selectedClient) {
      calculateStats();
      setEmbedLink(clientLinks[selectedClient] || '');
      setIsEditingLink(false);
    }
  }, [selectedClient, tasks, clientLinks]);

  const saveLink = async () => {
    try {
      const res = await fetch('/api/client-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: selectedClient, link: embedLink })
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text };
      }

      addLog('/api/client-links', res.status, { action: 'save', client: selectedClient, response: data });

      if (res.ok) {
        // Refresh links
        fetch('/api/client-links')
          .then(r => r.json())
          .then(d => setClientLinks(d));
        setIsEditingLink(false);
        alert('Link salvo com sucesso!');
      } else {
        alert(`Erro ao salvar: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      console.error('Error saving link:', err);
      addLog('/api/client-links', 0, { error: err.message });
      alert(`Erro ao conectar com o servidor: ${err.message}`);
    }
  };

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
      const delivered = sectorTasks.filter((t: any) => t.status.status === 'entregue' || t.status.status === 'complete' || t.status.status === 'closed');
      const notDelivered = sectorTasks.filter((t: any) => !(t.status.status === 'entregue' || t.status.status === 'complete' || t.status.status === 'closed'));

      return {
        name: sector.name,
        Entregue: delivered.length,
        'Não Entregue': notDelivered.length,
        total: sectorTasks.length,
        tasksDelivered: delivered,
        tasksNotDelivered: notDelivered
      };
    });

    setStats(newStats);
  };

  const handleBarClick = (data: any, index: number, e: any) => {
    // Recharts onClick doesn't give us which bar (stack) was clicked easily in the payload directly as a property
    // But we can infer it or just show all tasks for that sector?
    // Actually, Recharts `onClick` on the `Bar` component gives the specific data for that bar.
    // However, if we put onClick on BarChart, it gives the active payload.
    // Let's try putting onClick on the Bar components.
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
                              {entry.value} ({total > 0 ? Math.round((Number(entry.value) / total) * 100) : 0}%)
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
              <Bar 
                dataKey="Entregue" 
                fill="#475569" 
                radius={[4, 4, 0, 0]} 
                cursor="pointer"
                onClick={(data) => {
                  setModalTitle(`Tarefas Entregues - ${data.name}`);
                  setModalTasks(data.tasksDelivered);
                  setIsModalOpen(true);
                }}
              />
              <Bar 
                dataKey="Não Entregue" 
                fill="#94a3b8" 
                radius={[4, 4, 0, 0]} 
                cursor="pointer"
                onClick={(data) => {
                  setModalTitle(`Tarefas Não Entregues - ${data.name}`);
                  setModalTasks(data.tasksNotDelivered);
                  setIsModalOpen(true);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Looker Studio Embed */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Dashboard Analytics</h3>
          <button 
            onClick={() => setIsEditingLink(!isEditingLink)}
            className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" />
            {isEditingLink ? 'Cancelar' : 'Alterar Link'}
          </button>
        </div>

        {isEditingLink ? (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Insira o link incorporado do seu Dashboard do Looker Studio
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={embedLink}
                onChange={(e) => setEmbedLink(e.target.value)}
                className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
                placeholder="https://lookerstudio.google.com/embed/..."
              />
              <button 
                onClick={saveLink}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                <Save className="w-4 h-4 mr-2" />
                Confirmar
              </button>
            </div>
          </div>
        ) : null}

        <div className="aspect-video w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100 relative">
          {clientLinks[selectedClient] ? (
            <iframe 
              src={clientLinks[selectedClient]} 
              frameBorder="0" 
              style={{ border: 0 }} 
              allowFullScreen 
              className="w-full h-full"
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <BarChart className="w-12 h-12 mb-2 opacity-20" />
              <p>Nenhum dashboard vinculado</p>
              <button 
                onClick={() => setIsEditingLink(true)}
                className="mt-4 text-sm text-slate-600 hover:text-slate-900 underline"
              >
                Adicionar Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{modalTitle}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {modalTasks.length > 0 ? (
                modalTasks.map((task: any) => (
                  <div key={task.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-medium text-slate-900 text-sm">{task.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                        task.status.status === 'entregue' || task.status.status === 'complete' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {task.status.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span>Criado: {format(new Date(parseInt(task.date_created)), 'dd/MM/yyyy')}</span>
                      {task.due_date && (
                        <span>Prazo: {format(new Date(parseInt(task.due_date)), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">Nenhuma tarefa encontrada</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
