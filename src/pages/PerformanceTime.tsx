import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, ArrowLeft, X, Loader2, RefreshCw, Filter } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useData } from '../context/DataContext';
import { 
  isTaskActiveInPeriod, 
  isTaskCompletedInPeriod, 
  isTaskOverdueAtEndOfPeriod,
  isTaskCreatedInPeriod
} from '../utils/taskFilters';

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
  const [appliedDateRange, setAppliedDateRange] = useState(dateRange);
  
  // Advanced Filter State
  const [isAdvancedFilter, setIsAdvancedFilter] = useState(false);
  const [advancedDateRange, setAdvancedDateRange] = useState({
    createdStart: '',
    createdEnd: '',
    completedStart: '',
    completedEnd: ''
  });
  const [appliedAdvancedDateRange, setAppliedAdvancedDateRange] = useState(advancedDateRange);

  const [teamData, setTeamData] = useState<any[]>([]);
  
  // Modal State
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [modalDateRange, setModalDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [appliedModalDateRange, setAppliedModalDateRange] = useState(modalDateRange);
  
  // Modal Advanced Filter State
  const [isModalAdvancedFilter, setIsModalAdvancedFilter] = useState(false);
  const [modalAdvancedDateRange, setModalAdvancedDateRange] = useState({
    createdStart: '',
    createdEnd: '',
    completedStart: '',
    completedEnd: ''
  });
  const [appliedModalAdvancedDateRange, setAppliedModalAdvancedDateRange] = useState(modalAdvancedDateRange);

  useEffect(() => {
    if (allTasks.length > 0) {
      processData();
    }
  }, [allTasks, appliedDateRange, appliedAdvancedDateRange, isAdvancedFilter]);

  const processData = async () => {
    try {
      // 1. Fetch Members
      const membersRes = await fetch('/api/members');
      const membersData = await membersRes.json();
      const members = membersData.teams?.[0]?.members?.map((m: any) => m.user) || [];
      
      if (members.length === 0) return;

      const startDate = new Date(appliedDateRange.start).getTime();
      const endDate = new Date(appliedDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      const endDateMs = endDate.getTime();

      // 3. Process Data per Member
      const processedMembers = members.map((member: any) => {
        const memberTasks = allTasks.filter((t: any) => {
          return t.assignees.some((a: any) => a.id === member.id);
        });

        let completed = 0;
        let active = 0;
        let overdue = 0;
        let pending = 0;

        if (isAdvancedFilter) {
          const { createdStart, createdEnd, completedStart, completedEnd } = appliedAdvancedDateRange;
          
          let filteredTasks = memberTasks;

          if (createdStart && createdEnd) {
            const cStart = new Date(createdStart).getTime();
            const cEnd = new Date(createdEnd);
            cEnd.setHours(23, 59, 59, 999);
            filteredTasks = filteredTasks.filter((t: any) => isTaskCreatedInPeriod(t, cStart, cEnd.getTime()));
          }

          if (completedStart && completedEnd) {
            const compStart = new Date(completedStart).getTime();
            const compEnd = new Date(completedEnd);
            compEnd.setHours(23, 59, 59, 999);
            filteredTasks = filteredTasks.filter((t: any) => isTaskCompletedInPeriod(t, compStart, compEnd.getTime()));
          }

          const completedTasksList = filteredTasks.filter((t: any) => ['entregue', 'complete', 'closed'].includes(t.status.status.toLowerCase()));
          const activeTasksList = filteredTasks.filter((t: any) => !['entregue', 'complete', 'closed'].includes(t.status.status.toLowerCase()));
          const overdueTasksList = activeTasksList.filter((t: any) => {
            const due = t.due_date ? parseInt(t.due_date) : null;
            return due && due < Date.now();
          });

          completed = completedTasksList.length;
          overdue = overdueTasksList.length;
          pending = activeTasksList.length - overdue;
          active = completed + pending + overdue;

        } else {
          const activeTasksList = memberTasks.filter((t: any) => isTaskActiveInPeriod(t, startDate, endDateMs));
          const completedTasksList = memberTasks.filter((t: any) => isTaskCompletedInPeriod(t, startDate, endDateMs));
          const overdueTasksList = activeTasksList.filter((t: any) => isTaskOverdueAtEndOfPeriod(t, endDateMs));

          completed = completedTasksList.length;
          active = activeTasksList.length;
          overdue = overdueTasksList.length;
          pending = active - completed - overdue; // Not delivered and not overdue in this period
        }

        return {
          ...member,
          stats: { completed, active, pending, overdue },
          tasks: memberTasks
        };
      });

      setTeamData(processedMembers);
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredMemberTasks = (tasks: any[]) => {
    if (isModalAdvancedFilter) {
      const { createdStart, createdEnd, completedStart, completedEnd } = appliedModalAdvancedDateRange;
      
      let filteredTasks = tasks;

      if (createdStart && createdEnd) {
        const cStart = new Date(createdStart).getTime();
        const cEnd = new Date(createdEnd);
        cEnd.setHours(23, 59, 59, 999);
        filteredTasks = filteredTasks.filter((t: any) => isTaskCreatedInPeriod(t, cStart, cEnd.getTime()));
      }

      if (completedStart && completedEnd) {
        const compStart = new Date(completedStart).getTime();
        const compEnd = new Date(completedEnd);
        compEnd.setHours(23, 59, 59, 999);
        filteredTasks = filteredTasks.filter((t: any) => isTaskCompletedInPeriod(t, compStart, compEnd.getTime()));
      }

      return filteredTasks;
    } else {
      const startDate = new Date(appliedModalDateRange.start).getTime();
      const endDate = new Date(appliedModalDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      const endDateMs = endDate.getTime();

      return tasks.filter((t: any) => {
        // For the modal, we want to show tasks that were active OR completed in the period
        return isTaskActiveInPeriod(t, startDate, endDateMs) || isTaskCompletedInPeriod(t, startDate, endDateMs);
      });
    }
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
    if (isAdvancedFilter) {
      setAppliedAdvancedDateRange(advancedDateRange);
    } else {
      setAppliedDateRange(dateRange);
    }
  };

  const handleApplyModalFilter = () => {
    if (isModalAdvancedFilter) {
      setAppliedModalAdvancedDateRange(modalAdvancedDateRange);
    } else {
      setAppliedModalDateRange(modalDateRange);
    }
  };

  if (loading && allTasks.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-slate-600" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Performance Time</h1>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <button 
              onClick={() => setIsAdvancedFilter(!isAdvancedFilter)}
              className={`p-2 rounded-md transition-colors ${isAdvancedFilter ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
              title="Filtro Avançado"
            >
              <Filter className="w-4 h-4" />
            </button>
            
            {!isAdvancedFilter ? (
              <>
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
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 w-16">Criação:</span>
                  <input 
                    type="date" 
                    value={advancedDateRange.createdStart}
                    onChange={(e) => setAdvancedDateRange(prev => ({ ...prev, createdStart: e.target.value }))}
                    className="text-sm border-none focus:ring-0 p-0 w-32 bg-slate-50 rounded px-1"
                  />
                  <span className="text-slate-400">-</span>
                  <input 
                    type="date" 
                    value={advancedDateRange.createdEnd}
                    onChange={(e) => setAdvancedDateRange(prev => ({ ...prev, createdEnd: e.target.value }))}
                    className="text-sm border-none focus:ring-0 p-0 w-32 bg-slate-50 rounded px-1"
                  />
                </div>
                <div className="hidden sm:block w-px h-6 bg-slate-200"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 w-16">Conclusão:</span>
                  <input 
                    type="date" 
                    value={advancedDateRange.completedStart}
                    onChange={(e) => setAdvancedDateRange(prev => ({ ...prev, completedStart: e.target.value }))}
                    className="text-sm border-none focus:ring-0 p-0 w-32 bg-slate-50 rounded px-1"
                  />
                  <span className="text-slate-400">-</span>
                  <input 
                    type="date" 
                    value={advancedDateRange.completedEnd}
                    onChange={(e) => setAdvancedDateRange(prev => ({ ...prev, completedEnd: e.target.value }))}
                    className="text-sm border-none focus:ring-0 p-0 w-32 bg-slate-50 rounded px-1"
                  />
                </div>
              </div>
            )}
            <button 
              onClick={handleApplyFilter}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-md hover:bg-slate-700 transition-colors ml-2"
            >
              <RefreshCw className="w-4 h-4" />
              Carregar
            </button>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamData.map((member) => (
          <div 
            key={member.id} 
            onClick={() => {
              setSelectedMember(member);
              const newRange = {
                start: appliedDateRange.start,
                end: appliedDateRange.end
              };
              setModalDateRange(newRange);
              setAppliedModalDateRange(newRange);
            }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl font-bold overflow-hidden border-2 border-white shadow-sm">
                {member.profilePicture ? (
                  <img src={member.profilePicture} alt={member.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  member.initials
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg group-hover:text-slate-700 transition-colors">{member.username}</h3>
                <p className="text-sm text-slate-500">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Entregue', value: member.stats.completed },
                        { name: 'Pendente', value: member.stats.pending },
                        { name: 'Atrasado', value: member.stats.overdue }
                      ]}
                      innerRadius={30}
                      outerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill={COLORS.completed} />
                      <Cell fill={COLORS.pending} />
                      <Cell fill={COLORS.overdue} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="font-bold text-slate-700">{member.stats.completed + member.stats.pending + member.stats.overdue}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.completed }} />
                    <span className="text-slate-600">Entregue</span>
                  </div>
                  <span className="font-bold text-slate-900">{member.stats.completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.pending }} />
                    <span className="text-slate-600">Pendente</span>
                  </div>
                  <span className="font-bold text-slate-900">{member.stats.pending}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.overdue }} />
                    <span className="text-slate-600">Atrasado</span>
                  </div>
                  <span className="font-bold text-red-500">{member.stats.overdue}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 rounded-t-xl gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200">
                  {selectedMember.profilePicture ? (
                    <img src={selectedMember.profilePicture} alt={selectedMember.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    selectedMember.initials
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedMember.username}</h3>
                  <p className="text-sm text-slate-500">Detalhamento de Tarefas</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                {/* Date Filter inside Modal */}
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm min-w-max">
                  <button 
                    onClick={() => setIsModalAdvancedFilter(!isModalAdvancedFilter)}
                    className={`p-1.5 rounded transition-colors ${isModalAdvancedFilter ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                    title="Filtro Avançado"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>

                  {!isModalAdvancedFilter ? (
                    <>
                      <Calendar className="w-4 h-4 text-slate-400 ml-1" />
                      <input 
                        type="date" 
                        value={modalDateRange.start}
                        onChange={(e) => setModalDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="text-xs border-none focus:ring-0 p-0 w-24 text-slate-600"
                      />
                      <span className="text-slate-300">-</span>
                      <input 
                        type="date" 
                        value={modalDateRange.end}
                        onChange={(e) => setModalDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="text-xs border-none focus:ring-0 p-0 w-24 text-slate-600"
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-slate-500 uppercase">Criação:</span>
                        <input 
                          type="date" 
                          value={modalAdvancedDateRange.createdStart}
                          onChange={(e) => setModalAdvancedDateRange(prev => ({ ...prev, createdStart: e.target.value }))}
                          className="text-xs border-none focus:ring-0 p-0 w-24 bg-slate-50 rounded px-1"
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                          type="date" 
                          value={modalAdvancedDateRange.createdEnd}
                          onChange={(e) => setModalAdvancedDateRange(prev => ({ ...prev, createdEnd: e.target.value }))}
                          className="text-xs border-none focus:ring-0 p-0 w-24 bg-slate-50 rounded px-1"
                        />
                      </div>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-slate-500 uppercase">Conclusão:</span>
                        <input 
                          type="date" 
                          value={modalAdvancedDateRange.completedStart}
                          onChange={(e) => setModalAdvancedDateRange(prev => ({ ...prev, completedStart: e.target.value }))}
                          className="text-xs border-none focus:ring-0 p-0 w-24 bg-slate-50 rounded px-1"
                        />
                        <span className="text-slate-300">-</span>
                        <input 
                          type="date" 
                          value={modalAdvancedDateRange.completedEnd}
                          onChange={(e) => setModalAdvancedDateRange(prev => ({ ...prev, completedEnd: e.target.value }))}
                          className="text-xs border-none focus:ring-0 p-0 w-24 bg-slate-50 rounded px-1"
                        />
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={handleApplyModalFilter}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 transition-colors ml-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Carregar
                  </button>
                </div>

                <button onClick={() => setSelectedMember(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column: A Fazer */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    A Fazer
                  </h4>
                  <div className="space-y-3">
                    {getFilteredMemberTasks(selectedMember.tasks)
                      .filter((t: any) => {
                        if (isModalAdvancedFilter) {
                          return ['a fazer', 'to do', 'open'].includes(t.status.status.toLowerCase());
                        }
                        const isCompletedInPeriod = isTaskCompletedInPeriod(t, new Date(appliedModalDateRange.start).getTime(), new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999));
                        if (isCompletedInPeriod) return false;
                        return ['a fazer', 'to do', 'open'].includes(t.status.status.toLowerCase());
                      })
                      .map((task: any) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                  </div>
                </div>

                {/* Column: Fazendo */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    Fazendo
                  </h4>
                  <div className="space-y-3">
                    {getFilteredMemberTasks(selectedMember.tasks)
                      .filter((t: any) => {
                        const isCurrentlyCompleted = ['entregue', 'complete', 'closed'].includes(t.status.status.toLowerCase());
                        const isCurrentlyToDo = ['a fazer', 'to do', 'open'].includes(t.status.status.toLowerCase());
                        
                        if (isModalAdvancedFilter) {
                          return !isCurrentlyToDo && !isCurrentlyCompleted;
                        }

                        const isCompletedInPeriod = isTaskCompletedInPeriod(t, new Date(appliedModalDateRange.start).getTime(), new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999));
                        if (isCompletedInPeriod) return false;
                        
                        // If it's not completed in the period, but its current status is completed (meaning it was completed AFTER the period),
                        // we should show it as "Fazendo" (in progress) for this period's perspective.
                        return isCurrentlyCompleted || (!isCurrentlyToDo && !isCurrentlyCompleted);
                      })
                      .map((task: any) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                  </div>
                </div>

                {/* Column: Entregue */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Entregue
                  </h4>
                  <div className="space-y-3">
                    {getFilteredMemberTasks(selectedMember.tasks)
                      .filter((t: any) => {
                        if (isModalAdvancedFilter) {
                           return ['entregue', 'complete', 'closed'].includes(t.status.status.toLowerCase());
                        }
                        return isTaskCompletedInPeriod(t, new Date(appliedModalDateRange.start).getTime(), new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999));
                      })
                      .map((task: any) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TaskCard = ({ task }: { task: any; key?: string | number }) => (
  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start gap-2 mb-2">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{task.list.name}</span>
      {task.due_date && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
          parseInt(task.due_date) < Date.now() && !['entregue', 'complete', 'closed'].includes(task.status.status)
            ? 'bg-red-100 text-red-600'
            : 'bg-slate-100 text-slate-500'
        }`}>
          {format(new Date(parseInt(task.due_date)), 'dd/MMM')}
        </span>
      )}
    </div>
    <h5 className="text-sm font-medium text-slate-900 line-clamp-2 mb-2" title={task.name}>{task.name}</h5>
    <div className="flex items-center justify-between mb-3">
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
        task.status.status === 'entregue' || task.status.status === 'complete' 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
          : 'bg-slate-50 text-slate-600 border border-slate-100'
      }`}>
        {task.status.status}
      </span>
    </div>
    <div className="flex flex-col gap-1 pt-2 border-t border-slate-100">
      <div className="flex justify-between items-center text-[10px] text-slate-500">
        <span>Criada em:</span>
        <span className="font-medium text-slate-700">
          {task.date_created ? format(new Date(parseInt(task.date_created)), 'dd/MM/yyyy') : '-'}
        </span>
      </div>
      <div className="flex justify-between items-center text-[10px] text-slate-500">
        <span>Data de conclusão:</span>
        <span className="font-medium text-slate-700">
          {task.date_closed ? format(new Date(parseInt(task.date_closed)), 'dd/MM/yyyy') : '-'}
        </span>
      </div>
    </div>
  </div>
);
