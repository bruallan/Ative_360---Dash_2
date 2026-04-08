import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, ArrowLeft, X, Loader2, RefreshCw, Filter } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { 
  isTaskActiveInPeriod, 
  isTaskCompletedInPeriod, 
  isTaskOverdueAtEndOfPeriod,
  isTaskCreatedInPeriod
} from '../utils/taskFilters';

const COLORS = {
  todo: '#9ca3af',      // Cinza
  active: '#3b82f6',    // Azul
  completed: '#22c55e', // Verde
  overdue: '#ef4444',   // Vermelho
};

export default function PerformanceTime() {
  const { tasks: allTasks, loading } = useData();
  const { user } = useAuth();
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
  const [modalSearchQuery, setModalSearchQuery] = useState('');

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
          return t.assignees?.some((a: any) => String(a.id) === String(member.id));
        });

        let todo = 0;
        let active = 0;
        let completed = 0;
        let overdue = 0;

        let filteredTasks = memberTasks;

        if (isAdvancedFilter) {
          const { createdStart, createdEnd, completedStart, completedEnd } = appliedAdvancedDateRange;
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
        } else {
          filteredTasks = memberTasks.filter((t: any) => isTaskActiveInPeriod(t, startDate, endDateMs) || isTaskCompletedInPeriod(t, startDate, endDateMs));
        }

        filteredTasks.forEach((t: any) => {
          const status = t.status?.status?.toLowerCase() || '';
          const isCompletedStatus = ['entregue', 'complete', 'closed'].includes(status);
          const isTodoStatus = ['a fazer', 'to do', 'open'].includes(status);
          
          let isCompleted = isCompletedStatus;
          if (!isAdvancedFilter && isCompletedStatus) {
            isCompleted = isTaskCompletedInPeriod(t, startDate, endDateMs);
          }

          if (isCompleted) {
            completed++;
            return;
          }

          const due = t.due_date ? parseInt(t.due_date) : null;
          const referenceDate = isAdvancedFilter ? Date.now() : endDateMs;
          const isOverdue = due ? due < referenceDate : false;

          if (isOverdue) {
            overdue++;
          } else if (isTodoStatus) {
            todo++;
          } else {
            active++;
          }
        });

        return {
          ...member,
          stats: { todo, active, completed, overdue },
          tasks: memberTasks
        };
      });

      setTeamData(processedMembers);
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredMemberTasks = (tasks: any[]) => {
    let filtered = tasks;

    if (modalSearchQuery.trim()) {
      const query = modalSearchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name?.toLowerCase().includes(query));
    }

    if (isModalAdvancedFilter) {
      const { createdStart, createdEnd, completedStart, completedEnd } = appliedModalAdvancedDateRange;
      
      if (createdStart && createdEnd) {
        const cStart = new Date(createdStart).getTime();
        const cEnd = new Date(createdEnd);
        cEnd.setHours(23, 59, 59, 999);
        filtered = filtered.filter((t: any) => isTaskCreatedInPeriod(t, cStart, cEnd.getTime()));
      }

      if (completedStart && completedEnd) {
        const compStart = new Date(completedStart).getTime();
        const compEnd = new Date(completedEnd);
        compEnd.setHours(23, 59, 59, 999);
        filtered = filtered.filter((t: any) => isTaskCompletedInPeriod(t, compStart, compEnd.getTime()));
      }

      return filtered;
    } else {
      const startDate = new Date(appliedModalDateRange.start).getTime();
      const endDate = new Date(appliedModalDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      const endDateMs = endDate.getTime();

      return filtered.filter((t: any) => {
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
                        { name: 'A Fazer', value: member.stats.todo },
                        { name: 'Ativas', value: member.stats.active },
                        { name: 'Concluídas', value: member.stats.completed },
                        { name: 'Atrasadas', value: member.stats.overdue }
                      ]}
                      innerRadius={30}
                      outerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill={COLORS.todo} />
                      <Cell fill={COLORS.active} />
                      <Cell fill={COLORS.completed} />
                      <Cell fill={COLORS.overdue} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="font-bold text-slate-700">{member.stats.todo + member.stats.active + member.stats.completed + member.stats.overdue}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.todo }} />
                    <span className="text-slate-600">A Fazer</span>
                  </div>
                  <span className="font-bold text-slate-900">{member.stats.todo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.active }} />
                    <span className="text-slate-600">Ativas</span>
                  </div>
                  <span className="font-bold text-slate-900">{member.stats.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.completed }} />
                    <span className="text-slate-600">Concluídas</span>
                  </div>
                  <span className="font-bold text-slate-900">{member.stats.completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.overdue }} />
                    <span className="text-slate-600">Atrasadas</span>
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
                {/* Search Bar */}
                {(user?.username === 'bruno' || user?.username === 'admin') && (
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Buscar tarefa..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="text-sm border-none focus:ring-0 p-1 w-full text-slate-600 bg-transparent"
                    />
                  </div>
                )}

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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Column: A Fazer */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.todo }} />
                    A Fazer
                  </h4>
                  <div className="space-y-3">
                    {getFilteredMemberTasks(selectedMember.tasks)
                      .filter((t: any) => {
                        const status = t.status?.status?.toLowerCase() || '';
                        const isCompletedStatus = ['entregue', 'complete', 'closed'].includes(status);
                        const isTodoStatus = ['a fazer', 'to do', 'open'].includes(status);
                        
                        let isCompleted = isCompletedStatus;
                        if (!isModalAdvancedFilter && isCompletedStatus) {
                          const endDateMs = new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999);
                          const startDateMs = new Date(appliedModalDateRange.start).getTime();
                          isCompleted = isTaskCompletedInPeriod(t, startDateMs, endDateMs);
                        }

                        if (isCompleted) return false;

                        const due = t.due_date ? parseInt(t.due_date) : null;
                        const referenceDate = isModalAdvancedFilter ? Date.now() : new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999);
                        const isOverdue = due ? due < referenceDate : false;

                        return !isOverdue && isTodoStatus;
                      })
                      .map((task: any, index: number) => (
                        <TaskCard key={task.id || `task-todo-${index}`} task={task} />
                      ))}
                  </div>
                </div>

                {/* Column: Ativas */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.active }} />
                    Ativas
                  </h4>
                  <div className="space-y-3">
                    {getFilteredMemberTasks(selectedMember.tasks)
                      .filter((t: any) => {
                        const status = t.status?.status?.toLowerCase() || '';
                        const isCompletedStatus = ['entregue', 'complete', 'closed'].includes(status);
                        const isTodoStatus = ['a fazer', 'to do', 'open'].includes(status);
                        
                        let isCompleted = isCompletedStatus;
                        if (!isModalAdvancedFilter && isCompletedStatus) {
                          const endDateMs = new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999);
                          const startDateMs = new Date(appliedModalDateRange.start).getTime();
                          isCompleted = isTaskCompletedInPeriod(t, startDateMs, endDateMs);
                        }

                        if (isCompleted) return false;

                        const due = t.due_date ? parseInt(t.due_date) : null;
                        const referenceDate = isModalAdvancedFilter ? Date.now() : new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999);
                        const isOverdue = due ? due < referenceDate : false;

                        return !isOverdue && !isTodoStatus;
                      })
                      .map((task: any, index: number) => (
                        <TaskCard key={task.id || `task-ativa-${index}`} task={task} />
                      ))}
                  </div>
                </div>

                {/* Column: Concluídas */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.completed }} />
                    Concluídas
                  </h4>
                  <div className="space-y-3">
                    {getFilteredMemberTasks(selectedMember.tasks)
                      .filter((t: any) => {
                        const status = t.status?.status?.toLowerCase() || '';
                        const isCompletedStatus = ['entregue', 'complete', 'closed'].includes(status);
                        
                        let isCompleted = isCompletedStatus;
                        if (!isModalAdvancedFilter && isCompletedStatus) {
                          const endDateMs = new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999);
                          const startDateMs = new Date(appliedModalDateRange.start).getTime();
                          isCompleted = isTaskCompletedInPeriod(t, startDateMs, endDateMs);
                        }

                        return isCompleted;
                      })
                      .map((task: any, index: number) => (
                        <TaskCard key={task.id || `task-concluida-${index}`} task={task} />
                      ))}
                  </div>
                </div>

                {/* Column: Atrasadas */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.overdue }} />
                    Atrasadas
                  </h4>
                  <div className="space-y-3">
                    {getFilteredMemberTasks(selectedMember.tasks)
                      .filter((t: any) => {
                        const status = t.status?.status?.toLowerCase() || '';
                        const isCompletedStatus = ['entregue', 'complete', 'closed'].includes(status);
                        
                        let isCompleted = isCompletedStatus;
                        if (!isModalAdvancedFilter && isCompletedStatus) {
                          const endDateMs = new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999);
                          const startDateMs = new Date(appliedModalDateRange.start).getTime();
                          isCompleted = isTaskCompletedInPeriod(t, startDateMs, endDateMs);
                        }

                        if (isCompleted) return false;

                        const due = t.due_date ? parseInt(t.due_date) : null;
                        const referenceDate = isModalAdvancedFilter ? Date.now() : new Date(appliedModalDateRange.end).setHours(23, 59, 59, 999);
                        const isOverdue = due ? due < referenceDate : false;

                        return isOverdue;
                      })
                      .map((task: any, index: number) => (
                        <TaskCard key={task.id || `task-atrasada-${index}`} task={task} />
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
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{task.list?.name || 'Sem Lista'}</span>
      {task.due_date && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
          parseInt(task.due_date) < Date.now() && !['entregue', 'complete', 'closed'].includes(task.status?.status || '')
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
        task.status?.status === 'entregue' || task.status?.status === 'complete' 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
          : 'bg-slate-50 text-slate-600 border border-slate-100'
      }`}>
        {task.status?.status || 'Sem Status'}
      </span>
      
      {/* Assignees */}
      {task.assignees && task.assignees.length > 0 && (
        <div className="flex -space-x-2 overflow-hidden">
          {task.assignees.map((assignee: any) => (
            <div 
              key={assignee.id} 
              className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden"
              title={assignee.username}
            >
              {assignee.profilePicture ? (
                <img src={assignee.profilePicture} alt={assignee.username} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                assignee.initials
              )}
            </div>
          ))}
        </div>
      )}
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
