import React, { useEffect, useRef, forwardRef } from 'react';
import { AgentLog } from '../types';
import { Terminal as TerminalIcon, Activity } from 'lucide-react';

interface TerminalProps {
  logs: AgentLog[];
  isMobile: boolean; 
  isOpen: boolean;
  onClose: () => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

export const Terminal = forwardRef<HTMLDivElement, TerminalProps>(({ 
  logs, 
  isMobile,
  isOpen,
  onClose,
  onToggleExpand,
  isExpanded
}, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div 
      ref={ref}
      className="flex flex-col h-full bg-gray-950 font-mono text-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-850">
        <div className="flex items-center space-x-2 text-gray-500">
          <TerminalIcon size={14} />
          <span className="text-xs font-medium">OUTPUT</span>
        </div>
        <div className="flex items-center space-x-2">
           <Activity size={10} className="text-accent-emerald" />
        </div>
      </div>

      {/* Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 text-xs text-gray-400"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 opacity-50">_ ready</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="break-words leading-relaxed">
            <span className="text-gray-600 mr-3 select-none">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}</span>
            
            {log.type === 'error' && <span className="text-red-500 font-bold mr-2">ERR</span>}
            {log.type === 'success' && <span className="text-accent-emerald font-bold mr-2">OK</span>}
            {log.type === 'thought' && <span className="text-accent-purple mr-2">::</span>}
            {log.type === 'info' && <span className="text-blue-500 font-bold mr-2">INF</span>}
            
            <span className={
              log.type === 'thought' ? 'text-gray-500' : 
              log.type === 'error' ? 'text-red-400' : 
              log.type === 'success' ? 'text-gray-300' :
              'text-gray-400'
            }>{log.message}</span>
          </div>
        ))}
        {/* Cursor */}
        <div className="mt-2 h-4 w-2 bg-gray-600 animate-pulse"></div>
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';