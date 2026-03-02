import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, UserCircle, Layers, Bug, FileCode, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/' },
    { icon: Users, label: 'Painel de Clientes', path: '/clients' },
    { icon: BarChart3, label: 'Performance Time', path: '/performance' },
    { icon: UserCircle, label: 'Account', path: '/account' },
    { icon: Layers, label: 'Operações Macro', path: '/macro' },
  ];

  if (user?.role !== 'admin') {
    menuItems.push(
      { icon: Bug, label: 'Debug', path: '/debug' },
      { icon: FileCode, label: 'Log de Execução', path: '/logs' }
    );
  }

  return (
    <aside className="w-64 bg-black text-slate-300 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex flex-col items-center">
        {/* Logo */}
        <div className="w-32 h-32 flex items-center justify-center mb-2">
            <img 
              src="https://ative360.com/wp-content/uploads/2025/02/Logo-branca.webp" 
              alt="ative 360" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-slate-700 text-white shadow-lg shadow-slate-900/20" 
                  : "hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <Icon className={clsx("w-5 h-5 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs">
            {user?.username.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
