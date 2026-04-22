import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, UserCircle, Layers, Bug, FileCode, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/' },
    { icon: Users, label: 'Painel de Clientes', path: '/clients' },
    { icon: BarChart3, label: 'Performance Time', path: '/performance' },
    { icon: BarChart3, label: 'Performance Clientes', path: '/performance-clientes' },
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
    <aside className={clsx(
      "bg-black text-slate-300 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800 transition-all duration-300 z-50",
      isOpen ? "w-64" : "w-20"
    )}>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-6 bg-slate-800 text-slate-300 p-1 rounded-full border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors z-50"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className={clsx("p-6 border-b border-slate-800 flex flex-col items-center", !isOpen && "px-2")}>
        {/* Logo */}
        <div className={clsx("flex items-center justify-center mb-2 transition-all duration-300", isOpen ? "w-32 h-32" : "w-12 h-12")}>
            <img 
              src="https://ative360.com/wp-content/uploads/2025/02/Logo-branca.webp" 
              alt="ative 360" 
              className="w-full h-full object-contain"
            />
        </div>
        {isOpen && (
          <div className="text-center">
            <p className="text-xs text-slate-500">Dashboard</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.label : undefined}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group whitespace-nowrap",
                isActive 
                  ? "bg-slate-700 text-white shadow-lg shadow-slate-900/20" 
                  : "hover:bg-slate-800/50 hover:text-white",
                !isOpen && "justify-center px-0"
              )}
            >
              <Icon className={clsx("w-5 h-5 transition-colors shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
              {isOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={clsx("p-4 border-t border-slate-800", !isOpen && "px-2")}>
        <div className={clsx("flex items-center gap-3 mb-2", isOpen ? "px-4 py-3" : "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {user?.username.substring(0, 2).toUpperCase()}
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
          )}
        </div>
        <button 
          onClick={logout}
          title={!isOpen ? "Sair" : undefined}
          className={clsx(
            "w-full flex items-center gap-2 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors",
            isOpen ? "px-4" : "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {isOpen && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
