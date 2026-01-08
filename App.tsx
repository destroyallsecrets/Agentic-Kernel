import React, { useState, useEffect, useRef } from 'react';
import { Command, LayoutGrid, Terminal as TerminalIcon, ShieldAlert, Cpu, Zap, Activity } from 'lucide-react';
import { useAgentSystem } from './hooks/useAgentSystem';
import { AgentCard } from './components/AgentCard';
import { Terminal } from './components/Terminal';
import { AgentStatus, WorkerAgent } from './types';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Transition } from '@headlessui/react';

// Utility for screen size detection
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
};

const App: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [commandValue, setCommandValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { agents, globalLogs, isOrchestrating, handleCommand, killAllAgents } = useAgentSystem();

  const activeAgents = agents.filter(a => a.status !== AgentStatus.KILLED);
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;
  const displayedLogs = selectedAgent ? selectedAgent.logs : globalLogs;

  // Global Command Bar Shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommand(commandValue);
    setCommandValue('');
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-200 overflow-hidden font-sans">
      
      <TabGroup className="flex flex-col lg:flex-row w-full h-full">
        
        {/* DESKTOP SIDEBAR / MOBILE BOTTOM NAV (TabList) */}
        <div className="order-2 lg:order-1 flex-shrink-0 z-20">
          <TabList className="flex lg:flex-col h-[60px] lg:h-full w-full lg:w-16 bg-gray-900 border-t lg:border-t-0 lg:border-r border-gray-850 items-center justify-around lg:justify-start lg:py-6 lg:space-y-6">
            
            <div className="hidden lg:flex mb-2 p-2 bg-primary-600 rounded-md shadow-sm">
              <Cpu size={20} className="text-white" />
            </div>

            <Tab className={({ selected }) =>
              `p-3 rounded-md transition-colors outline-none ${
                selected ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
              }`
            }>
              <LayoutGrid size={20} />
            </Tab>

            <Tab className={({ selected }) =>
              `p-3 rounded-md transition-colors outline-none ${
                selected ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
              }`
            }>
              <TerminalIcon size={20} />
            </Tab>

            <div className="hidden lg:flex mt-auto pb-4">
              <button 
                onClick={killAllAgents}
                className="p-3 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                title="Kill All"
              >
                <ShieldAlert size={20} />
              </button>
            </div>
             
             {/* Mobile Kill Switch separate from Tabs */}
             <div className="lg:hidden p-3 text-red-500" onClick={killAllAgents}>
                <ShieldAlert size={20} />
             </div>
          </TabList>
        </div>

        {/* MAIN CONTENT AREA */}
        <main className="order-1 lg:order-2 flex-1 flex flex-col min-w-0 bg-gray-950">
          
          {/* HEADER */}
          <header className="h-14 border-b border-gray-850 bg-gray-950 flex items-center px-4 gap-4 sticky top-0 z-10">
            <div className="flex items-center gap-2 lg:hidden">
              <Cpu size={18} className="text-primary-500" />
            </div>

            <form onSubmit={handleSubmit} className="flex-1 max-w-4xl mx-auto relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Command size={14} className={`text-gray-500 ${isOrchestrating ? 'animate-pulse text-accent-purple' : ''}`} />
              </div>
              <input 
                ref={inputRef}
                type="text" 
                value={commandValue}
                onChange={(e) => setCommandValue(e.target.value)}
                placeholder={isOrchestrating ? "Master Agent is thinking..." : "Enter system directive... (Ctrl+K)"}
                disabled={isOrchestrating}
                className="w-full bg-gray-900 border border-gray-850 text-sm rounded-md pl-9 pr-10 py-1.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-gray-600 text-gray-200"
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                {isOrchestrating ? (
                  <Zap size={14} className="text-accent-purple animate-bounce" />
                ) : (
                  <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-gray-500 bg-gray-800 border border-gray-700 rounded">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                )}
              </div>
            </form>

            <div className="hidden lg:flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse"></div>
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">System Online</span>
            </div>
          </header>

          {/* TAB PANELS */}
          <TabPanels className="flex-1 overflow-hidden relative">
            
            {/* AGENT DASHBOARD PANEL */}
            <TabPanel className="h-full flex flex-col lg:flex-row focus:outline-none">
               <div className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth">
                 {/* Stats Row */}
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gray-900 border border-gray-850 rounded-md">
                      <div className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">Active Workers</div>
                      <div className="text-xl font-mono text-white">{activeAgents.length}</div>
                    </div>
                    <div className="p-4 bg-gray-900 border border-gray-850 rounded-md">
                      <div className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">Status</div>
                      <div className="text-xl font-mono text-white">{isOrchestrating ? 'BUSY' : 'IDLE'}</div>
                    </div>
                    <div className="p-4 bg-gray-900 border border-gray-850 rounded-md">
                      <div className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">Memory</div>
                      <div className="text-xl font-mono text-white">{activeAgents.reduce((acc, curr) => acc + curr.memoryUsage, 0)} MB</div>
                    </div>
                    <div className="p-4 bg-gray-900 border border-gray-850 rounded-md">
                      <div className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">Completed</div>
                      <div className="text-xl font-mono text-white">{agents.filter(a => a.status === AgentStatus.COMPLETED).length}</div>
                    </div>
                 </div>

                 {activeAgents.length === 0 && !isOrchestrating && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-600 border border-dashed border-gray-850 rounded-lg">
                      <Cpu size={40} className="mb-4 opacity-50" />
                      <p className="text-sm">System Idle. Awaiting directives.</p>
                    </div>
                 )}

                 {/* Denser grid on large screens */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {agents.map(agent => (
                      <AgentCard 
                        key={agent.id} 
                        agent={agent} 
                        selected={selectedAgentId === agent.id}
                        onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
                        compact={true} // Default to compact in grid for better density
                      />
                    ))}
                 </div>
               </div>

               {/* Split view terminal on large screens */}
               <div className="hidden lg:flex w-96 border-l border-gray-850 bg-gray-950 flex-col">
                  <Terminal 
                    logs={displayedLogs} 
                    isMobile={false} 
                    isOpen={true} 
                    onClose={() => {}} 
                  />
               </div>
            </TabPanel>

            {/* FULL TERMINAL PANEL (Mobile/Focus) */}
            <TabPanel className="h-full bg-gray-950 focus:outline-none relative">
               <Transition
                 appear={true}
                 show={true}
                 enter="transition ease-out duration-300 transform"
                 enterFrom="translate-y-full opacity-50"
                 enterTo="translate-y-0 opacity-100"
                 leave="transition ease-in duration-200 transform"
                 leaveFrom="translate-y-0 opacity-100"
                 leaveTo="translate-y-full opacity-0"
                 className="h-full w-full absolute inset-0 bg-gray-950"
               >
                 <Terminal 
                   logs={globalLogs} // Full logs in terminal view
                   isMobile={!isDesktop} 
                   isOpen={true} 
                   onClose={() => {}} 
                 />
               </Transition>
            </TabPanel>

          </TabPanels>
        </main>
      </TabGroup>
    </div>
  );
};

export default App;