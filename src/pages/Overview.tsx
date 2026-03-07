import { useState, useEffect } from 'react';
import { SECTORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, ArrowLeft } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useData } from '../context/DataContext';

export default function Overview() {
  const { tasks: allTasks, loading } = useData();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [stats, setStats] = useState<any[]>([]);
  const [kpi, setKpi] = useState({ active: 0, overdue: 0, reliability: 0 });

  useEffect(() => {
    if (allTasks.length > 0) {
      calculateStats();
    }
  }, [dateRange, allTasks]);

  const calculateStats = () => {
    // Removed date filtering to show all tasks for now
    // const startDate = new Date(dateRange.start).getTime();
    // const endDate = new Date(dateRange.end).getTime();

    // Filter by date
    // const filteredTasks = allTasks.filter((t: any) => {
    //   const created = parseInt(t.date_created);
    //   return created >= startDate && created <= endDate;
    // });
    
    const filteredTasks = allTasks; // Use all tasks

    const newStats = [];
    let totalDelivered = 0;
    let totalTasks = 0;
    let totalActive = 0;
    let totalOverdue = 0;

    for (const sector of SECTORS) {
      const sectorTasks = filteredTasks.filter((t: any) => t.sector === sector.name);
      
      const delivered = sectorTasks.filter((t: any) => t.status.status === 'entregue' || t.status.status === 'complete' || t.status.status === 'closed').length;
      const notDelivered = sectorTasks.length - delivered;
      
      // KPI Calcs
      const active = sectorTasks.filter((t: any) => t.status.status !== 'entregue' && t.status.status !== 'complete' && t.status.status !== 'closed').length;
      
      // Check overdue (if due_date exists and is in past and not complete)
      const overdue = sectorTasks.filter((t: any) => {
        if (t.status.status === 'entregue' || t.status.status === 'complete' || t.status.status === 'closed') return false;
        if (!t.due_date) return false;
        return parseInt(t.due_date) < Date.now();
      }).length;

      totalDelivered += delivered;
      totalTasks += sectorTasks.length;
      totalActive += active;
      totalOverdue += overdue;

      newStats.push({
        name: sector.name,
        Entregue: delivered,
        'Não Entregue': notDelivered
      });
    }

    setStats(newStats);
    setKpi({
      active: totalActive,
      overdue: totalOverdue,
      reliability: totalTasks > 0 ? Math.round((totalDelivered / totalTasks) * 100) : 100
    });
  };

  const handlePrevMonth = () => {
    const currentStart = new Date(dateRange.start);
    const prev = subMonths(currentStart, 1);
    setDateRange({
      start: format(startOfMonth(prev), 'yyyy-MM-dd'),
      end: format(endOfMonth(prev), 'yyyy-MM-dd')
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-100 rounded-md text-slate-600"
            title="Mês Anterior"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-2 border-l border-r border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-sm border-none focus:ring-0 p-0 w-32"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-sm border-none focus:ring-0 p-0 w-32"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Tarefas Ativas</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{loading && allTasks.length === 0 ? '...' : kpi.active}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Tarefas em Atraso</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{loading && allTasks.length === 0 ? '...' : kpi.overdue}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Confiabilidade</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{loading && allTasks.length === 0 ? '...' : `${kpi.reliability}%`}</p>
          <p className="text-xs text-slate-400 mt-1">Entregas no prazo</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-6">Performance por Setor</h3>
        <div className="h-[400px]">
          {loading && allTasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">Carregando dados...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="Entregue" fill="#475569" radius={[4, 4, 0, 0]} /> {/* Slate 600 */}
                <Bar dataKey="Não Entregue" fill="#94a3b8" radius={[4, 4, 0, 0]} /> {/* Slate 400 */}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Looker Studio Embed */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4">Dashboard Geral</h3>
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
