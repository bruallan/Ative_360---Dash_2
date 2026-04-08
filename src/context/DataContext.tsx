import React, { createContext, useContext, useState, useEffect } from 'react';
import { SECTORS, CLICKUP_IDS } from '../constants';

interface LogEntry {
  timestamp: string;
  url: string;
  status: number;
  data: any;
}

interface DataContextType {
  tasks: any[];
  clients: string[];
  logs: LogEntry[];
  loading: boolean;
  fetchData: () => Promise<void>;
  addLog: (url: string, status: number, data: any) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (url: string, status: number, data: any) => {
    setLogs(prev => [{
      timestamp: new Date().toISOString(),
      url,
      status,
      data
    }, ...prev]);
  };

  const fetchAllPages = async (baseUrl: string) => {
    let allItems: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${baseUrl}&page=${page}`;
      try {
        const res = await fetch(url);
        const contentType = res.headers.get("content-type");
        
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
           const text = await res.text();
           console.error(`[DataContext] API Error: ${res.status} ${res.statusText}. Content-Type: ${contentType}. Body:`, text.substring(0, 200));
           addLog(url, res.status, { error: text.substring(0, 200), contentType });
           throw new Error(`API returned non-JSON response: ${res.status}`);
        }
        
        const data = await res.json();
        
        addLog(url, res.status, data);

        if (data.tasks && data.tasks.length > 0) {
          allItems = [...allItems, ...data.tasks];
          // If we got 0 tasks, stop.
          // If we are fetching from a folder (aggregated), the length might be anything.
          // However, if we get an empty array, we definitely stop.
          // To be safe with aggregated endpoints, we should probably just rely on empty array check
          // But if we get exactly 100 (or N * 100), we continue.
          // Let's assume if it returns anything, we try next page, until empty.
          // But to prevent infinite loops if API is weird, let's add a safety break.
          if (page > 50) { // Safety limit 50 pages
             hasMore = false;
          } else {
             page++;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error("Error fetching page", page, error);
        addLog(url, 500, { error: String(error) });
        hasMore = false;
      }
    }
    return allItems;
  };

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    setLogs([]); // Clear logs on refresh? Or keep history? Let's keep history but maybe limit it? No, user said "mesmo que fique gigantesco"
    
    try {
      let allTasks: any[] = [];

      // Fetch from SECTORS (Folders)
      for (const sector of SECTORS) {
        const sectorTasks = await fetchAllPages(`/api/tasks?folder_id=${sector.id}&subtasks=true&include_closed=true`);
        // Add sector info
        const tasksWithSector = sectorTasks.map((t: any) => ({ ...t, sector: sector.name }));
        allTasks = [...allTasks, ...tasksWithSector];
      }

      // Fetch from specific lists (Account) if not covered by folders above
      // Check if ACC lists are inside the folders? 
      // ACC_REUNIOES and ACC_DEMANDAS might be separate lists.
      // Let's fetch them explicitly just in case, or check if they are duplicates.
      // Assuming they might be separate for now.
      const accReunioes = await fetchAllPages(`/api/tasks?list_id=${CLICKUP_IDS.LISTS.ACC_REUNIOES}&subtasks=true&include_closed=true`);
      const accDemandas = await fetchAllPages(`/api/tasks?list_id=${CLICKUP_IDS.LISTS.ACC_DEMANDAS}&subtasks=true&include_closed=true`);
      
      // Merge without duplicates
      const taskMap = new Map();
      [...allTasks, ...accReunioes, ...accDemandas].forEach(t => taskMap.set(t.id, t));
      const uniqueTasks = Array.from(taskMap.values());

      setTasks(uniqueTasks);

      // Extract Clients
      const uniqueClients = new Set<string>();
      uniqueTasks.forEach((task: any) => {
        const clientField = task.custom_fields?.find((f: any) => f.name === 'Cliente');
        if (clientField && clientField.value !== undefined && clientField.value !== null) {
          if (clientField.type === 'drop_down') {
             const option = clientField.type_config?.options?.find((o: any) => 
               String(o.orderindex) === String(clientField.value) || 
               String(o.id) === String(clientField.value)
             );
             if (option) uniqueClients.add(String(option.name));
          } else if (clientField.value) {
             uniqueClients.add(String(clientField.value));
          }
        }
      });

    const sortedClients = Array.from(uniqueClients).sort((a, b) => String(a).localeCompare(String(b)));
    console.log(`[DataContext] Extracted ${sortedClients.length} unique clients:`, sortedClients);
    setClients(sortedClients);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DataContext.Provider value={{ tasks, clients, logs, loading, fetchData, addLog }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
