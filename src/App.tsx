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

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import ClientPanel from './pages/ClientPanel';
import PerformanceTime from './pages/PerformanceTime';
import PerformanceClientes from './pages/PerformanceClientes';
import Account from './pages/Account';
import MacroOperations from './pages/MacroOperations';
import Login from './pages/Login';
import Debug from './pages/Debug';
import ExecutionLog from './pages/ExecutionLog';
import SyncManager from './components/SyncManager';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className={`flex-1 p-8 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {children}
      </main>
      <SyncManager />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientPanel /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><PerformanceTime /></ProtectedRoute>} />
            <Route path="/performance-clientes" element={<ProtectedRoute><PerformanceClientes /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/macro" element={<ProtectedRoute><MacroOperations /></ProtectedRoute>} />
            
            <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><ExecutionLog /></ProtectedRoute>} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

