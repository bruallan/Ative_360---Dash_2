/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { Users, Mail, Loader2, AlertCircle, Building2, Terminal as TerminalIcon, CheckCircle2, XCircle, LayoutList, CheckSquare } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture: string | null;
  initials: string;
}

interface Member {
  user: User;
  invited_by?: User;
}

interface Team {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
  members: Member[];
}

interface Task {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
    type: string;
  };
  creator: {
    username: string;
    color: string;
    profilePicture: string | null;
  };
  assignees: Array<{
    username: string;
    color: string;
    profilePicture: string | null;
  }>;
  url: string;
}

interface LogEntry {
  type: 'log' | 'error' | 'result';
  message?: string;
  timestamp?: string;
  data?: any;
}

interface ClickUpResponse {
  teams: Team[];
}

interface ClickUpTasksResponse {
  tasks: Task[];
}

export default function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'terminal' | 'results' | 'tasks'>('terminal');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    fetchMembersStream();
  }, []);

  const addLog = (message: string, type: 'log' | 'error' | 'result' = 'log') => {
    setLogs(prev => [...prev, {
      type,
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const fetchMembersStream = async () => {
    setLoading(true);
    setLogs([]);
    setTeams([]);
    setActiveTab('terminal'); // Switch to terminal on start

    try {
      addLog("Initializing connection...");
      addLog("Checking environment configuration...");
      
      // Artificial delay to show the logs (UX)
      await new Promise(r => setTimeout(r, 500));
      
      addLog("Sending request to server API (Members)...");
      
      const response = await fetch(`/api/members?t=${Date.now()}`);
      
      addLog(`Server responded with status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails = 'Unknown error';
        try {
            const errorJson = JSON.parse(errorText);
            errorDetails = errorJson.details || errorJson.error || errorText;
        } catch (e) {
            errorDetails = errorText.slice(0, 100); // Truncate if HTML
        }
        throw new Error(`HTTP ${response.status}: ${errorDetails}`);
      }

      addLog("Parsing response data...");
      const data: ClickUpResponse = await response.json();
      
      const teamCount = data.teams ? data.teams.length : 0;
      addLog(`Success! Found ${teamCount} teams.`, 'result');
      
      setTeams(data.teams || []);
      setLoading(false);
      
      // Auto-switch to results on success after a brief delay
      setTimeout(() => setActiveTab('results'), 1000);

    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (teams.length === 0) {
      addLog("Cannot fetch tasks: No teams loaded.", 'error');
      return;
    }

    const teamId = teams[0].id; // Use the first team
    setTasksLoading(true);
    addLog(`Fetching tasks for Team ID: ${teamId}...`);

    try {
      const response = await fetch(`/api/tasks?team_id=${teamId}&t=${Date.now()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: ClickUpTasksResponse = await response.json();
      const taskCount = data.tasks ? data.tasks.length : 0;
      addLog(`Success! Found ${taskCount} tasks.`, 'result');
      setTasks(data.tasks || []);

    } catch (err: any) {
      addLog(`Error fetching tasks: ${err.message}`, 'error');
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch tasks when switching to tasks tab if not already loaded
  useEffect(() => {
    if (activeTab === 'tasks' && tasks.length === 0 && !tasksLoading && teams.length > 0) {
      fetchTasks();
    }
  }, [activeTab, teams]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">ClickUp Team Directory</h1>
          <p className="text-slate-500">View all workspaces and members associated with your account</p>
        </header>

        {/* Tabs Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'terminal' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              Terminal Logs
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'results' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Team Results
              {teams.length > 0 && (
                <span className="ml-1 bg-white/20 text-white px-1.5 rounded-full text-[10px]">
                  {teams.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tasks' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Tasks
              {tasks.length > 0 && (
                <span className="ml-1 bg-white/20 text-white px-1.5 rounded-full text-[10px]">
                  {tasks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'terminal' && (
            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono text-slate-400">System Terminal</span>
                </div>
                <button 
                  onClick={fetchMembersStream}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Rerun
                </button>
              </div>
              <div className="p-4 h-[500px] overflow-y-auto font-mono text-sm space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="text-slate-500 shrink-0">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--:--'}
                    </span>
                    {log.type === 'error' ? (
                      <span className="text-red-400 flex items-start gap-2 break-all">
                        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        {log.message}
                      </span>
                    ) : log.type === 'result' ? (
                      <span className="text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {log.message}
                      </span>
                    ) : (
                      <span className="text-slate-300 border-l-2 border-slate-700 pl-3 break-all">
                        {log.message}
                      </span>
                    )}
                  </div>
                ))}
                {(loading || tasksLoading) && (
                  <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                    <span className="w-2 h-4 bg-slate-500 block"></span>
                    Processing...
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {loading ? (
                <div className="text-center py-20">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500">Fetching data from terminal...</p>
                  <button 
                    onClick={() => setActiveTab('terminal')}
                    className="mt-4 text-sm text-indigo-600 hover:underline"
                  >
                    View Logs
                  </button>
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No Teams Found</h3>
                  <p className="text-slate-500 mb-4">Check the terminal for error details.</p>
                  <button 
                    onClick={() => setActiveTab('terminal')}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    View Terminal Logs
                  </button>
                </div>
              ) : (
                <div className="grid gap-8">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
                          style={{ backgroundColor: team.color || '#6366f1' }}
                        >
                          {team.avatar ? (
                            <img 
                              src={team.avatar} 
                              alt={team.name} 
                              className="w-full h-full object-cover rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">{team.name}</h2>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            {team.members.length} {team.members.length === 1 ? 'Member' : 'Members'}
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {team.members.map((member) => (
                          <div key={member.user.id} className="p-4 sm:px-6 hover:bg-slate-50 transition-colors flex items-center gap-4 group">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white"
                              style={{ backgroundColor: member.user.color || '#cbd5e1' }}
                            >
                              {member.user.profilePicture ? (
                                <img 
                                  src={member.user.profilePicture} 
                                  alt={member.user.username} 
                                  className="w-full h-full object-cover rounded-full"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span>{member.user.initials}</span>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {member.user.username}
                              </p>
                              <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                                <Mail className="w-3.5 h-3.5" />
                                <p className="text-sm truncate">{member.user.email}</p>
                              </div>
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                Member
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {tasksLoading && tasks.length === 0 ? (
                <div className="text-center py-20">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-500">Fetching tasks from ClickUp...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No Tasks Found</h3>
                  <p className="text-slate-500 mb-4">We couldn't find any tasks for the first workspace.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-slate-900 mb-1">{task.name}</h3>
                          <div className="flex items-center gap-3 text-xs">
                            <span 
                              className="px-2 py-0.5 rounded text-white font-medium"
                              style={{ backgroundColor: task.status.color }}
                            >
                              {task.status.status.toUpperCase()}
                            </span>
                            <span className="text-slate-400">ID: {task.id}</span>
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {task.assignees.map((assignee, i) => (
                            <div 
                              key={i}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white"
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
                                <span>{assignee.username.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

