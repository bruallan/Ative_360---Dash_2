import { useState, useEffect } from 'react';
import { SECTORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, ArrowLeft, RefreshCw } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useData } from '../context/DataContext';
import { 
  isTaskActiveInPeriod, 
  isTaskCompletedInPeriod, 
  isTaskOverdueAtEndOfPeriod, 
  isTaskCompletedOnTimeInPeriod 
} from '../utils/taskFilters';

export default function Overview() {
  const { tasks: allTasks, loading } = useData();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [appliedDateRange, setAppliedDateRange] = useState(dateRange);
  const [stats, setStats] = useState<any[]>([]);
  const [kpi, setKpi] = useState({ 
    active: 0, 
    activeNew: 0, 
    activeOld: 0, 
    completed: 0, 
    overdue: 0, 
    reliability: 0 
  });

  useEffect(() => {
    if (allTasks.length > 0) {
      calculateStats();
    }
  }, [appliedDateRange, allTasks]);

  const calculateStats = () => {
    // Parse 'YYYY-MM-DD' as local time to avoid UTC offset issues
    const [startYear, startMonth, startDay] = appliedDateRange.start.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0).getTime();

    const [endYear, endMonth, endDay] = appliedDateRange.end.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
    const endDateMs = endDate.getTime();

    const newStats = [];
    let totalActive = 0;
    let totalActiveNew = 0;
    let totalActiveOld = 0;
    let totalCompleted = 0;
    let totalCompletedOnTime = 0;
    let totalOverdue = 0;

    for (const sector of SECTORS) {
      const sectorTasks = allTasks.filter((t: any) => t.sector === sector.name);
      
      // Filter tasks active in period
      const activeTasks = sectorTasks.filter((t: any) => isTaskActiveInPeriod(t, startDate, endDateMs));
      
      // Filter tasks completed in period
      const completedTasks = sectorTasks.filter((t: any) => isTaskCompletedInPeriod(t, startDate, endDateMs));
      
      // Overdue at the end of the period (from active tasks)
      const overdueTasks = activeTasks.filter((t: any) => isTaskOverdueAtEndOfPeriod(t, endDateMs));

      // Reliability
      const completedOnTime = completedTasks.filter((t: any) => isTaskCompletedOnTimeInPeriod(t, startDate, endDateMs));

      // Active breakdown
      const activeNew = activeTasks.filter((t: any) => t.date_created && parseInt(t.date_created) >= startDate).length;
      const activeOld = activeTasks.length - activeNew;

      totalActive += activeTasks.length;
      totalActiveNew += activeNew;
      totalActiveOld += activeOld;
      totalCompleted += completedTasks.length;
      totalCompletedOnTime += completedOnTime.length;
      totalOverdue += overdueTasks.length;

      newStats.push({
        name: sector.name,
        Entregue: completedTasks.length,
        'Não Entregue': activeTasks.length - completedTasks.length // Approximation for chart
      });
    }

    setStats(newStats);
    setKpi({
      active: totalActive,
      activeNew: totalActiveNew,
      activeOld: totalActiveOld,
      completed: totalCompleted,
      overdue: totalOverdue,
      reliability: totalCompleted > 0 ? Math.round((totalCompletedOnTime / totalCompleted) * 100) : 100
    });
  };

  const handlePrevMonth = () => {
    const currentStart = new Date(dateRange.start);
    const prev = subMonths(currentStart, 1);
    const newRange = {
      start: format(startOfMonth(prev), 'yyyy-MM-dd'),
      end: format(endOfMonth(prev), 'yyyy-MM-dd')
    };
    setDateRange(newRange);
    setAppliedDateRange(newRange);
  };

  const handleApplyFilter = () => {
    setAppliedDateRange(dateRange);
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
          <button 
            onClick={handleApplyFilter}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-md hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Carregar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Tarefas Ativas</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{loading && allTasks.length === 0 ? '...' : kpi.active}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span title="Criadas no período" className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Novas: <span className="font-semibold text-slate-700">{kpi.activeNew}</span>
            </span>
            <span title="Criadas antes do período" className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-200"></span>
              Anteriores: <span className="font-semibold text-slate-700">{kpi.activeOld}</span>
            </span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Tarefas Concluídas</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{loading && allTasks.length === 0 ? '...' : kpi.completed}</p>
          <p className="text-xs text-slate-400 mt-1">No período selecionado</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Tarefas em Atraso</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{loading && allTasks.length === 0 ? '...' : kpi.overdue}</p>
          <p className="text-xs text-slate-400 mt-1">No final do período</p>
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
