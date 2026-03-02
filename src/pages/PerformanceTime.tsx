import { useState, useEffect } from 'react';
import { SECTORS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Calendar, ArrowLeft, X, CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { clsx } from 'clsx';
import { useData } from '../context/DataContext';

const COLORS = {
  completed: '#475569', // Slate 600
  pending: '#94a3b8',   // Slate 400
  overdue: '#e2e8f0',   // Slate 200
};

export default function PerformanceTime() {
  const { tasks: allTasks, loading } = useData();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [dateRange, allTasks]);

  const fetchData = async () => {
    if (loading && allTasks.length === 0) return;

    try {
      // 1. Fetch Members (We still fetch this separately or we could put in context too)
      // For now, let's fetch it here as it's small.
      const membersRes = await fetch('/api/members');
      const membersData = await membersRes.json();
      const teamMembers = membersData.teams?.[0]?.members?.map((m: any) => m.user) || [];

      // 2. Filter Tasks by Date
      // Removed date filtering to show all tasks
      // const startDate = new Date(dateRange.start).getTime();
      // const endDate = new Date(dateRange.end).getTime();

      // const filteredTasks = allTasks.filter((t: any) => {
      //   const created = parseInt(t.date_created);
      //   return created >= startDate && created <= endDate;
      // });
      
      const filteredTasks = allTasks;

      // 3. Process Data per Member
      const processedMembers = teamMembers.map((member: any) => {
        const memberTasks = filteredTasks.filter((t: any) => 
          t.assignees.some((a: any) => a.id === member.id)
        );

        const active = memberTasks.filter((t: any) => t.status.status !== 'entregue' && t.status.status !== 'complete' && t.status.status !== 'closed').length;
        
        const completed = memberTasks.filter((t: any) => t.status.status === 'entregue' || t.status.status === 'complete' || t.status.status === 'closed').length;
        
        const overdue = memberTasks.filter((t: any) => {
          if (t.status.status === 'entregue' || t.status.status === 'complete' || t.status.status === 'closed') return false;
          if (!t.due_date) return false;
          return parseInt(t.due_date) < Date.now();
        }).length;

        const pending = memberTasks.length - completed - overdue; // Remaining tasks that are not overdue

        return {
          ...member,
          stats: {
            active,
            completed,
            pending: pending < 0 ? 0 : pending,
            overdue,
            total: memberTasks.length
          },
          tasks: memberTasks
        };
      });

      setMembers(processedMembers);

    } catch (err) {
      console.error(err);
    }
  };

  const handlePrevMonth = () => {
    const currentStart = new Date(dateRange.start);
    const prev = subMonths(currentStart, 1);
    setDateRange({
      start: format(startOfMonth(prev), 'yyyy-MM-dd'),
      end: format(endOfMonth(prev), 'yyyy-MM-dd')
    });
  };

  const getTaskCategory = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'a fazer' || s === 'to do') return 'A Fazer';
    if (s === 'entregue' || s === 'complete' || s === 'closed') return 'Entregue';
    return 'Fazendo';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Performance Time</h1>
        
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

      {loading && allTasks.length === 0 ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-slate-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((member) => (
            <div 
              key={member.id} 
              onClick={() => setSelectedMember(member)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                   {/* Donut Chart Background */}
                   <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Completed', value: member.stats.completed },
                            { name: 'Pending', value: member.stats.pending },
                            { name: 'Overdue', value: member.stats.overdue },
                          ]}
                          innerRadius={50}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill={COLORS.completed} />
                          <Cell fill={COLORS.pending} />
                          <Cell fill={COLORS.overdue} />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                   </div>
                   
                   {/* Profile Picture */}
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner"
                        style={{ backgroundColor: member.color || '#cbd5e1' }}
                      >
                        {member.profilePicture ? (
                          <img 
                            src={member.profilePicture} 
                            alt={member.username} 
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{member.initials}</span>
                        )}
                      </div>
                   </div>
                </div>

                <h3 className="font-semibold text-slate-900 text-lg">{member.username}</h3>
                <p className="text-sm text-slate-500 mb-4">{member.email}</p>
                
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-sm font-medium text-slate-700">{member.stats.active} Ativas</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                  style={{ backgroundColor: selectedMember.color || '#cbd5e1' }}
                >
                  {selectedMember.profilePicture ? (
                    <img 
                      src={selectedMember.profilePicture} 
                      alt={selectedMember.username} 
                      className="w-full h-full object-cover rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{selectedMember.initials}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedMember.username}</h2>
                  <p className="text-sm text-slate-500">Detalhamento de Tarefas</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['A Fazer', 'Fazendo', 'Entregue'].map((category) => {
                  const tasks = selectedMember.tasks.filter((t: any) => getTaskCategory(t.status.status) === category);
                  
                  return (
                    <div key={category} className="space-y-4">
                      <div className={clsx(
                        "flex items-center gap-2 pb-2 border-b-2",
                        category === 'A Fazer' ? 'border-slate-300' :
                        category === 'Fazendo' ? 'border-amber-400' :
                        'border-emerald-500'
                      )}>
                        {category === 'A Fazer' ? <Circle className="w-4 h-4 text-slate-400" /> :
                         category === 'Fazendo' ? <Clock className="w-4 h-4 text-amber-500" /> :
                         <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        <h3 className="font-semibold text-slate-900">{category}</h3>
                        <span className="ml-auto bg-slate-100 px-2 py-0.5 rounded-full text-xs font-medium text-slate-600">
                          {tasks.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {tasks.map((task: any) => (
                          <div key={task.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                            <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-2">{task.name}</p>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span 
                                className="px-1.5 py-0.5 rounded text-white font-medium"
                                style={{ backgroundColor: task.status.color }}
                              >
                                {task.status.status.toUpperCase()}
                              </span>
                              {task.due_date && (
                                <span className={clsx(
                                  parseInt(task.due_date) < Date.now() && category !== 'Entregue' ? 'text-red-500 font-medium' : ''
                                )}>
                                  {new Date(parseInt(task.due_date)).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {tasks.length === 0 && (
                          <p className="text-sm text-slate-400 italic text-center py-4">Nenhuma tarefa</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
