import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, Send, Sparkles } from 'lucide-react';

export interface FileTask {
  name: string;
  state: 'queued' | 'processing' | 'done' | 'error';
  errorMsg?: string;
}

interface ProcessingStatusProps {
  status: 'idle' | 'extracting' | 'submitting' | 'success' | 'error';
  tasks?: FileTask[];
  message?: string;
  progress?: number;
  onRetry?: () => void;
}

export default function ProcessingStatus({ status, tasks = [], message, progress, onRetry }: ProcessingStatusProps) {
  if (status === 'idle') return null;

  if (status === 'submitting') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
        <div className="flex flex-col items-center p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl scale-100 animate-in zoom-in-95 duration-500">
          <Send className="w-16 h-16 text-indigo-500 animate-pulse mb-6 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
          <h3 className="text-3xl font-bold text-white mb-3">Submitting Data</h3>
          <p className="text-slate-400 text-lg">Pushing records securely to webhook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-md shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
      
      {status === 'extracting' && tasks.length > 0 && (
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800">
             <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
             <div className="flex-1">
               <h3 className="text-sm font-semibold text-white">Extracting Data</h3>
               <div className="flex items-center justify-between mt-1 mb-2">
                 <p className="text-[11px] text-slate-400">Processing {tasks.length} image{tasks.length !== 1 ? 's' : ''}</p>
                 {progress !== undefined && <p className="text-[11px] text-indigo-400 font-medium">{Math.round(progress)}%</p>}
               </div>
               {progress !== undefined && (
                 <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                   <div className="bg-indigo-500 h-1.5 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }}></div>
                 </div>
               )}
             </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
                <span className="text-[11px] font-medium text-slate-300 truncate max-w-[150px]" title={task.name}>{task.name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.state === 'queued' && <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded-sm"><Clock className="w-2.5 h-2.5" /> Queued</span>}
                  {task.state === 'processing' && <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-sm"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing</span>}
                  {task.state === 'done' && <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm"><CheckCircle className="w-2.5 h-2.5" /> Done</span>}
                  {task.state === 'error' && <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-sm"><AlertCircle className="w-2.5 h-2.5" /> Error</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 ring-1 ring-emerald-500/20">
             <Sparkles className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Success!</h3>
          <p className="text-slate-400 text-xs">{message || "All records have been successfully submitted."}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4 ring-1 ring-red-500/20">
             <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Operation Failed</h3>
          <p className="text-slate-400 text-xs max-w-[280px] mx-auto mb-4">{message || "An error occurred during submission."}</p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium border border-slate-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Retry Submission
            </button>
          )}
        </div>
      )}
    </div>
  );
}
