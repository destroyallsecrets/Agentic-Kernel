import React, { useState, useEffect, useRef } from 'react';
import { Command, LayoutGrid, Terminal as TerminalIcon, ShieldAlert, Cpu, Zap, FolderCode, Search } from 'lucide-react';
import { useAgentSystem } from './hooks/useAgentSystem';
import { AgentCard } from './components/AgentCard';
import { Terminal } from './components/Terminal';
import { ArtifactExplorer } from './components/ArtifactExplorer';
import { AgentNetworkGraph } from './components/AgentNetworkGraph';
import { AgentStatus } from './types';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    agents, 
    globalLogs, 
    artifacts, 
    isOrchestrating, 
    handleCommand, 
    killAllAgents, 
    broadcastEvent,
    updateArtifact
  } = useAgentSystem();

  const activeAgents = agents.filter(a => a.status !== AgentStatus.KILLED);
  
  const filteredAgents = activeAgents.filter(agent => {
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.role.toLowerCase().includes(query) ||
      agent.status.toLowerCase().includes(query)
    );
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;
  const displayedLogs = selectedAgent ? selectedAgent.logs : globalLogs;

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
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full bg-gray-950 text-gray-200 overflow-hidden font-sans">
      
      <TabGroup className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
        
        {/* MAIN CONTENT AREA */}
        <main className="order-1 flex-1 flex flex-col min-h-0 min-w-0 bg-gray-950 overflow-hidden relative">
          
          {/* HEADER */}
          <header className="h-14 border-b border-gray-850 bg-gray-950 flex items-center px-4 gap-3 flex-none z-20">
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
                placeholder={isOrchestrating ? "Master processing..." : isDesktop ? "Enter directive... (Ctrl+K)" : "Directive..."}
                disabled={isOrchestrating}
                className="w-full bg-gray-900 border border-gray-850 text-sm rounded-md pl-9 pr-10 py-2 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-gray-600 text-gray-200"
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

            <div className="hidden sm:flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse"></div>
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Live</span>
            </div>
          </header>

          {/* TAB PANELS */}
          <TabPanels className="flex-1 overflow-hidden relative min-h-0">
            
            {/* DASHBOARD PANEL */}
            <TabPanel className="h-full flex flex-col lg:flex-row focus:outline-none overflow-hidden">
               <div className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
                    <div className="md:col-span-2">
                        <AgentNetworkGraph agents={activeAgents} broadcastEvent={broadcastEvent} />
                    </div>
                    <div className="flex flex-col gap-3">
                         <div className="p-4 bg-gray-900 border border-gray-850 rounded-lg flex-none md:flex-1 flex flex-col justify-center">
                           <div className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-2">Cluster Metrics</div>
                           <div className="flex gap-6">
                              <div>
                                 <span className="text-xl lg:text-2xl font-mono text-white block">{activeAgents.length}</span>
                                 <span className="text-[10px] text-gray-500 uppercase">Nodes</span>
                              </div>
                              <div>
                                 <span className="text-xl lg:text-2xl font-mono text-white block">{artifacts.length}</span>
                                 <span className="text-[10px] text-gray-500 uppercase">Artifacts</span>
                              </div>
                           </div>
                         </div>
                         <div className="relative">
                            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                            <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search agents..." 
                              className="w-full bg-gray-900 border border-gray-850 rounded-lg pl-9 pr-3 py-2.5 text-xs focus:ring-1 focus:ring-primary-500 outline-none text-gray-200"
                            />
                         </div>
                    </div>
                 </div>

                 {activeAgents.length === 0 && !isOrchestrating && (
                    <div className="flex flex-col items-center justify-center h-48 lg:h-64 text-gray-600 border border-dashed border-gray-850 rounded-lg">
                      <Cpu size={32} className="mb-4 opacity-30" />
                      <p className="text-xs font-mono uppercase tracking-widest">Awaiting neural commands</p>
                    </div>
                 )}

                 {/* Agent Grid - Substantial bottom padding to clear the navigation bar on mobile */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-24 lg:pb-8">
                    {filteredAgents.map(agent => (
                      <AgentCard 
                        key={agent.id} 
                        agent={agent} 
                        selected={selectedAgentId === agent.id}
                        onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
                        compact={true} 
                      />
                    ))}
                 </div>
               </div>
               
               <div className="hidden lg:flex w-96 border-l border-gray-850 bg-gray-950 flex-col">
                  <Terminal logs={displayedLogs} isMobile={false} isOpen={true} onClose={() => {}} />
               </div>
            </TabPanel>

            {/* LOGS PANEL */}
            <TabPanel className="h-full bg-gray-950 focus:outline-none relative overflow-hidden">
                <Terminal logs={globalLogs} isMobile={true} isOpen={true} onClose={() => {}} />
            </TabPanel>

            {/* CODE PANEL */}
            <TabPanel className="h-full bg-gray-950 focus:outline-none relative overflow-hidden">
               <ArtifactExplorer artifacts={artifacts} onUpdateArtifact={updateArtifact} />
            </TabPanel>
          </TabPanels>
        </main>

        {/* 1PX INVISIBLE SPACER (Separator) */}
        <div className="order-2 h-[1px] w-full bg-gray-850/20 flex-none lg:hidden"></div>

        {/* BOTTOM NAVIGATION */}
        <div className="order-3 lg:order-1 flex-none z-30 bg-gray-900/98 backdrop-blur-xl lg:border-r border-gray-850 shadow-2xl safe-pb">
          <TabList className="flex lg:flex-col h-14 lg:h-full w-full lg:w-16 items-center justify-around lg:justify-start lg:py-8 lg:space-y-8">
            
            <div className="hidden lg:flex mb-2 p-2 bg-primary-600 rounded-md shadow-lg">
              <Cpu size={20} className="text-white" />
            </div>

            <Tab className={({ selected }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 lg:p-3 lg:rounded-md transition-all outline-none flex-1 lg:flex-none ${
                selected ? 'text-primary-400 bg-gray-800 lg:text-white lg:shadow-md' : 'text-gray-500 hover:text-gray-300'
              }`
            }>
              <LayoutGrid size={22} />
              <span className="text-[9px] lg:hidden font-bold uppercase tracking-tighter">Nodes</span>
            </Tab>

            <Tab className={({ selected }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 lg:p-3 lg:rounded-md transition-all outline-none flex-1 lg:flex-none ${
                selected ? 'text-primary-400 bg-gray-800 lg:text-white lg:shadow-md' : 'text-gray-500 hover:text-gray-300'
              }`
            }>
              <TerminalIcon size={22} />
              <span className="text-[9px] lg:hidden font-bold uppercase tracking-tighter">Logs</span>
            </Tab>

            <Tab className={({ selected }) =>
              `flex flex-col items-center justify-center gap-1 px-3 py-2 lg:p-3 lg:rounded-md transition-all outline-none flex-1 lg:flex-none ${
                selected ? 'text-primary-400 bg-gray-800 lg:text-white lg:shadow-md' : 'text-gray-500 hover:text-gray-300'
              }`
            }>
              <FolderCode size={22} />
              <span className="text-[9px] lg:hidden font-bold uppercase tracking-tighter">Files</span>
            </Tab>

            <div className="flex-1 lg:flex-none flex items-center justify-center">
              <button 
                onClick={killAllAgents}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                title="Kill All"
              >
                <ShieldAlert size={22} />
                <span className="text-[9px] lg:hidden font-bold uppercase tracking-tighter">Reset</span>
              </button>
            </div>
          </TabList>
        </div>
      </TabGroup>
    </div>
  );
};

export default App;