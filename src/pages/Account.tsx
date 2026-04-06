import { useState, useEffect } from 'react';
import React from 'react';
import { CLICKUP_IDS } from '../constants';
import { Loader2, Calendar, CheckSquare, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '../context/DataContext';

const TaskCard: React.FC<{ task: any }> = ({ task }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <h4 className="font-medium text-slate-900 mb-1 group-hover:text-slate-600 transition-colors">{task.name}</h4>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span 
            className="px-2 py-0.5 rounded text-white font-medium"
            style={{ backgroundColor: task.status?.color || '#cbd5e1' }}
          >
            {task.status?.status?.toUpperCase() || 'SEM STATUS'}
          </span>
          {task.due_date && (
            <span className={clsx(
              "flex items-center gap-1",
              parseInt(task.due_date) < Date.now() ? "text-red-500 font-medium" : ""
            )}>
              <Clock className="w-3 h-3" />
              {new Date(parseInt(task.due_date)).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex -space-x-2">
        {task.assignees?.map((assignee: any) => (
          <div 
            key={assignee.id}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white"
            style={{ backgroundColor: assignee.color || '#cbd5e1' }}
            title={assignee.username}
          >
            {assignee.profilePicture ? (
              <img 
                src={assignee.profilePicture} 
                alt={assignee.username} 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{assignee.initials}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function Account() {
  const { tasks: allTasks, loading } = useData();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);

  useEffect(() => {
    if (allTasks.length > 0) {
      // Filter by List ID
      const meetingsTasks = allTasks.filter((t: any) => String(t.list?.id) === String(CLICKUP_IDS.LISTS.ACC_REUNIOES));
      const demandsTasks = allTasks.filter((t: any) => String(t.list?.id) === String(CLICKUP_IDS.LISTS.ACC_DEMANDAS));
      
      setMeetings(meetingsTasks);
      setDemands(demandsTasks);
    }
  }, [allTasks]);

  if (loading && allTasks.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Account Manager</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Reuniões Pendentes */}
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-slate-900">Reuniões Pendentes</h2>
            </div>
            <span className="text-2xl font-bold text-slate-700">{meetings.length}</span>
          </div>
          
          <div className="space-y-3">
            {meetings.length > 0 ? (
              meetings.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma reunião pendente
              </div>
            )}
          </div>
        </div>

        {/* Filtro de Demandas */}
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-slate-900">Filtro de Demandas</h2>
            </div>
            <span className="text-2xl font-bold text-slate-700">{demands.length}</span>
          </div>

          <div className="space-y-3">
            {demands.length > 0 ? (
              demands.map(task => <TaskCard key={task.id} task={task} />)
            ) : (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhuma demanda pendente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
