import React, { useEffect, useRef, forwardRef, useState } from 'react';
import { AgentLog } from '../types';
import { Terminal as TerminalIcon, Activity, ArrowDown, Filter, FileCode, Brain, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface TerminalProps {
  logs: AgentLog[];
  isMobile: boolean; 
  isOpen: boolean;
  onClose: () => void;
}

export const Terminal = forwardRef<HTMLDivElement, TerminalProps>(({ 
  logs, 
  isMobile,
  isOpen,
  onClose,
}, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SYSTEM' | 'THOUGHT' | 'ERROR' | 'ARTIFACT'>('ALL');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Filter Logic
  const filteredLogs = logs.filter(log => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'SYSTEM') return log.type === 'info' || log.type === 'success';
    if (activeFilter === 'THOUGHT') return log.type === 'thought';
    if (activeFilter === 'ERROR') return log.type === 'error';
    if (activeFilter === 'ARTIFACT') return log.type === 'artifact';
    return true;
  });

  // Scroll Handling
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll, activeFilter]); // Auto scroll on new logs if enabled

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setIsAutoScroll(true);
    }
  };

  // Helper for filter badges
  const FilterBadge = ({ type, label, icon: Icon, count, colorClass }: any) => (
     <button
       onClick={() => setActiveFilter(type)}
       className={`
         flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all shrink-0
         ${activeFilter === type 
           ? `bg-gray-800 border-gray-600 text-white shadow-sm ring-1 ring-white/10` 
           : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-900 hover:text-gray-300'}
       `}
     >
       <Icon size={12} className={activeFilter === type ? colorClass : ''} />
       <span>{label}</span>
       <span className="opacity-40 ml-0.5 font-normal">({count})</span>
     </button>
  );

  // Counts for badges
  const counts = {
    ALL: logs.length,
    SYSTEM: logs.filter(l => l.type === 'info' || l.type === 'success').length,
    THOUGHT: logs.filter(l => l.type === 'thought').length,
    ERROR: logs.filter(l => l.type === 'error').length,
    ARTIFACT: logs.filter(l => l.type === 'artifact').length,
  };

  return (
    <div 
      ref={ref}
      className="flex flex-col h-full bg-gray-950 font-mono text-sm overflow-hidden relative"
    >
      {/* Header & Filters */}
      <div className="flex flex-col border-b border-gray-850 bg-gray-950/95 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-2 text-gray-400">
              <TerminalIcon size={14} />
              <span className="text-xs font-bold tracking-widest text-gray-300">KERNEL_IO</span>
            </div>
            <div className="flex items-center space-x-2">
                <div className={`w-1.5 h-1.5 rounded-full ${logs.length > 0 ? 'bg-primary-500 animate-pulse' : 'bg-gray-700'}`}></div>
                <span className="text-[10px] text-gray-600 uppercase">Live</span>
            </div>
        </div>
        
        {/* Filter Bar - Horizontal Scroll on Mobile */}
        <div className="flex items-center gap-1 px-3 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            <FilterBadge type="ALL" label="All" icon={Filter} count={counts.ALL} colorClass="text-gray-200" />
            <FilterBadge type="SYSTEM" label="System" icon={Info} count={counts.SYSTEM} colorClass="text-blue-400" />
            <FilterBadge type="THOUGHT" label="Brain" icon={Brain} count={counts.THOUGHT} colorClass="text-accent-purple" />
            <FilterBadge type="ARTIFACT" label="Files" icon={FileCode} count={counts.ARTIFACT} colorClass="text-yellow-400" />
            <FilterBadge type="ERROR" label="Errors" icon={AlertCircle} count={counts.ERROR} colorClass="text-red-400" />
        </div>
      </div>

      {/* Content */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 text-xs text-gray-400 scroll-smooth"
      >
        {filteredLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-800 space-y-3">
             <div className="p-3 bg-gray-900 rounded-full">
                <Activity size={24} className="opacity-30" />
             </div>
             <span className="text-[10px] uppercase tracking-widest opacity-50 font-semibold">Awaiting Signals</span>
          </div>
        )}

        {filteredLogs.map((log) => (
          <div key={log.id} className="flex gap-3 leading-relaxed group animate-in fade-in slide-in-from-bottom-2 duration-300">
             {/* Timestamp Column */}
             <div className="shrink-0 w-12 pt-0.5 text-right">
                <span className="text-[10px] text-gray-700 font-mono select-none">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </span>
             </div>
             
             {/* Content Column */}
             <div className="flex-1 min-w-0 break-words">
                {/* Badges for types */}
                <div className="inline-flex items-center gap-2 mb-0.5">
                    {log.type === 'error' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-500 text-[9px] font-bold border border-red-500/20">
                            <AlertCircle size={8} /> ERR
                        </span>
                    )}
                    {log.type === 'success' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 text-[9px] font-bold border border-emerald-500/20">
                            <CheckCircle2 size={8} /> OK
                        </span>
                    )}
                    {log.type === 'thought' && <span className="text-accent-purple text-[10px]">::</span>}
                    {log.type === 'info' && <span className="text-blue-500 font-bold text-[9px] opacity-70">SYS</span>}
                    {log.type === 'artifact' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-yellow-500/10 text-yellow-500 text-[9px] font-bold border border-yellow-500/20">
                            <FileCode size={8} /> GEN
                        </span>
                    )}
                    
                    {/* The Message */}
                    <span className={`
                        ${log.type === 'thought' ? 'text-gray-500 italic' : ''}
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-gray-300' : ''}
                        ${log.type === 'artifact' ? 'text-yellow-200/90' : ''}
                        ${log.type === 'info' ? 'text-blue-200/60' : ''}
                    `}>
                        {log.message}
                    </span>
                </div>
             </div>
          </div>
        ))}
        
        {/* Spacer for bottom scrolling */}
        <div className="h-6"></div>
      </div>

      {/* Floating Scroll Button */}
      <div className={`absolute bottom-6 right-6 transition-all duration-300 z-20 ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button 
           onClick={scrollToBottom}
           className="p-3 bg-primary-600/90 backdrop-blur text-white rounded-full shadow-lg shadow-black/50 hover:bg-primary-500 transition-colors border border-primary-400/30"
        >
           <ArrowDown size={18} />
        </button>
      </div>
    </div>
  );
});

Terminal.displayName = 'Terminal';