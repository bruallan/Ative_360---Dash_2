import { useState, useEffect } from 'react';
import { CLICKUP_IDS, SECTORS } from '../constants';
import { Loader2, User } from 'lucide-react';
import { useData } from '../context/DataContext';

interface ClientRow {
  name: string;
  gt: any[]; // Tasks in GT
  gc: any[]; // Tasks in GC
  design: any[]; // Tasks in Design
}

const AssigneeCard = ({ tasks }: { tasks: any[] }) => {
  if (!tasks || tasks.length === 0) return <div className="h-full min-h-[40px] bg-slate-50/50 rounded-lg border border-dashed border-slate-200"></div>;

  // Get unique assignees
  const assigneesMap = new Map<string, any>();
  tasks.forEach(t => {
    t.assignees.forEach((a: any) => {
      assigneesMap.set(a.id, a);
    });
  });
  const assignees = Array.from(assigneesMap.values());

  return (
    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col justify-center min-h-[80px]">
      <div className="flex flex-wrap gap-2 mb-2">
        {assignees.map(assignee => (
          <div key={assignee.id} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: assignee.color || '#cbd5e1' }}
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
            <span className="text-xs font-medium text-slate-700 truncate max-w-[80px]">{assignee.username}</span>
          </div>
        ))}
        {assignees.length === 0 && (
          <span className="text-xs text-slate-400 italic">Sem responsável</span>
        )}
      </div>
      <div className="mt-auto pt-2 border-t border-slate-50 text-[10px] text-slate-400 text-right">
        {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
      </div>
    </div>
  );
};

export default function MacroOperations() {
  const { tasks: allTasks, loading } = useData();
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);

  useEffect(() => {
    if (allTasks.length > 0) {
      processData();
    }
  }, [allTasks]);

  const processData = () => {
    // Filter tasks from Gestão de Tráfego and Gestão de Conteúdo
    // We can identify them by sector name or folder ID if available.
    // In DataContext we added 'sector' property which is the folder name.
    // 'Gestão de Tráfego' and 'Gestão de Conteúdo'
    
    const relevantTasks = allTasks.filter((t: any) => 
      t.sector === 'Gestão de Tráfego' || t.sector === 'Gestão de Conteúdo'
    );

    // Group by Client
    const clientsMap = new Map<string, ClientRow>();

    relevantTasks.forEach((task: any) => {
      // Find Client Name
      let clientName = 'Sem Cliente';
      const clientField = task.custom_fields?.find((f: any) => f.name === 'Cliente');
      
      if (clientField && clientField.value) {
        if (clientField.type === 'drop_down') {
           const option = clientField.type_config.options.find((o: any) => o.orderindex === clientField.value);
           if (option) clientName = option.name;
        } else if (typeof clientField.value === 'string') {
           clientName = clientField.value;
        }
      } else {
        // Fallback to brackets in task name
        const match = task.name.match(/\[(.*?)\]/);
        if (match) {
          clientName = match[1];
        }
      }

      if (!clientsMap.has(clientName)) {
        clientsMap.set(clientName, { name: clientName, gt: [], gc: [], design: [] });
      }

      const row = clientsMap.get(clientName)!;
      const listName = task.list.name;

      // Categorize
      // Note: We need to be careful. Is 'GT' prefix standard?
      // The user requirement said:
      // Gestão de Tráfego (GT): Tarefas na pasta de Tráfego que começam com "GT".
      // Gestão de Conteúdo (GC): Tarefas na pasta de Conteúdo que começam com "GC".
      // Design/Criativo: Todo o restante.

      if (task.sector === 'Gestão de Tráfego' && listName.startsWith('GT')) {
        row.gt.push(task);
      } else if (task.sector === 'Gestão de Conteúdo' && listName.startsWith('GC')) {
        row.gc.push(task);
      } else {
        // Design/Criativo (Everything else in these folders)
        row.design.push(task);
      }
    });

    const sortedRows = Array.from(clientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    setClientRows(sortedRows);
  };

  if (loading && allTasks.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-slate-600" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Operações Macro</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-1/4">Cliente</th>
                <th className="px-6 py-4 w-1/4">Gestão de Tráfego</th>
                <th className="px-6 py-4 w-1/4">Gestão de Conteúdo</th>
                <th className="px-6 py-4 w-1/4">Design/Criativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientRows.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 align-top">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <AssigneeCard tasks={row.gt} />
                  </td>
                  <td className="px-6 py-4 align-top">
                    <AssigneeCard tasks={row.gc} />
                  </td>
                  <td className="px-6 py-4 align-top">
                    <AssigneeCard tasks={row.design} />
                  </td>
                </tr>
              ))}
              {clientRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Nenhum dado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
