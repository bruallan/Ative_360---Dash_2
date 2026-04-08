import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';
import { db } from '../firebase.ts';
import { doc, onSnapshot } from 'firebase/firestore';

export default function SyncManager() {
  const [syncStatus, setSyncStatus] = useState<{
    status: string;
    progress: number;
    message: string;
    updatedAt: number;
  } | null>(null);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'cache', 'sync_status'), (doc) => {
      if (doc.exists()) {
        setSyncStatus(doc.data() as any);
      }
    }, (error) => {
      console.warn("[SyncManager] Firestore snapshot error (likely quota):", error);
      // Silently fail or show a subtle indicator if needed
    });
    return () => unsub();
  }, []);

  const handleSync = async () => {
    setShowConfirm(false);
    setIsTriggering(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
    } catch (e) {
      console.error("Failed to trigger sync", e);
    } finally {
      setIsTriggering(false);
    }
  };

  const isRunning = syncStatus?.status === 'running' && (Date.now() - (syncStatus.updatedAt || 0)) < 15 * 60 * 1000;

  // Se passou de 15 minutos e ainda está "running", assumimos que deu erro de cota ou timeout
  const isTimedOut = syncStatus?.status === 'running' && !isRunning;

  return (
    <>
      {/* Progress Bar (Global) */}
      {isRunning && (
        <div className="fixed top-0 left-0 w-full z-[100] pointer-events-none">
          {/* Progress Line */}
          <div className="h-0.5 w-full bg-blue-100/30">
            <div 
              className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.6)]"
              style={{ width: `${syncStatus.progress}%` }}
            />
          </div>
          
          {/* Subtle Status Badge */}
          <div className="absolute top-2 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1 flex items-center space-x-2 shadow-sm animate-in fade-in slide-in-from-top-2 pointer-events-auto">
             <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
             <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
               {syncStatus.message} • {syncStatus.progress}%
             </span>
          </div>
        </div>
      )}

      {isTimedOut && (
        <div className="fixed top-2 right-4 bg-red-50 border border-red-200 rounded-full px-3 py-1 flex items-center space-x-2 shadow-sm animate-in fade-in slide-in-from-top-2 z-[100]">
           <AlertTriangle className="w-3 h-3 text-red-600" />
           <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">
             Sincronização interrompida (Timeout/Cota)
           </span>
        </div>
      )}

      {/* Manual Sync Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isRunning || isTriggering}
        className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all flex items-center justify-center
          ${isRunning ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:-translate-y-1'}`}
        title="Forçar Sincronização"
      >
        <RefreshCw className={`w-5 h-5 ${isRunning ? 'animate-spin' : ''}`} />
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-amber-600">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="text-lg font-semibold text-slate-900">Atualizar Dados Manualmente?</h3>
                </div>
                <button onClick={() => setShowConfirm(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 text-slate-600 text-sm">
                <p>
                  A sincronização automática ocorre a cada 4 horas. Ao forçar a sincronização agora:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>O processo pode levar <strong>de 3 a 8 minutos</strong> dependendo do volume de dados.</li>
                  <li>Durante esse tempo, você verá uma barra de progresso no topo da tela.</li>
                  <li>Alguns dados podem ficar temporariamente indisponíveis enquanto o cache é reconstruído.</li>
                </ul>
                <p className="font-medium text-slate-700">
                  Tem certeza que deseja iniciar a sincronização agora?
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 border-t border-slate-100">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSync}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Iniciar Sincronização</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
