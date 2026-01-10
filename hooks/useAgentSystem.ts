import { useState, useRef, useEffect, useCallback } from 'react';
import { WorkerAgent, AgentStatus, AgentLog, AgentArtifact, BroadcastEvent } from '../types';
import { orchestratePlan, createAgentSession, stepAgent } from '../services/geminiService';
import { Chat } from '@google/genai';

const STORAGE_KEY = 'agentic_kernel_state';

export const useAgentSystem = () => {
  const [agents, setAgents] = useState<WorkerAgent[]>([]);
  const [globalLogs, setGlobalLogs] = useState<AgentLog[]>([]);
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [broadcastEvent, setBroadcastEvent] = useState<BroadcastEvent | null>(null);
  const [latestArtifact, setLatestArtifact] = useState<AgentArtifact | null>(null);
  
  // Store the real Gemini Chat sessions. Refs are perfect for non-serializable objects that don't trigger re-renders.
  const agentSessions = useRef<Map<string, Chat>>(new Map());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  
  // Track which agent is currently executing to prevent race conditions
  const processingRef = useRef<boolean>(false);

  // --------------------------------------------------------------------------
  // PERSISTENCE & INITIALIZATION
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.agents) setAgents(parsed.agents);
        if (parsed.globalLogs) setGlobalLogs(parsed.globalLogs);
        if (parsed.artifacts) setArtifacts(parsed.artifacts);
        
        // Note: Chat sessions are re-created lazily in the scheduler loop
        // or we could eagerly create them here if we wanted.
        // For robustness, the scheduler handles missing sessions.
        addLog('[SYSTEM] State restored from local storage.', 'info');
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const state = {
      agents,
      globalLogs,
      artifacts
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [agents, globalLogs, artifacts]);

  // --------------------------------------------------------------------------
  // LOGGING
  // --------------------------------------------------------------------------
  const addLog = useCallback((message: string, type: AgentLog['type'] = 'info', agentId: string = 'MASTER') => {
    const newLog: AgentLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type,
      message,
    };
    
    setGlobalLogs(prev => {
      // Keep global log size manageable
      const next = [...prev, newLog];
      return next.slice(-100); 
    });
    
    if (agentId !== 'MASTER') {
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return { ...a, logs: [...a.logs, newLog] };
        }
        return a;
      }));
    }
  }, []);

  const spawnAgent = (name: string, role: string, task: string, dependencies: string[] = []) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    // Initialize the real AI session
    const chatSession = createAgentSession(name, role, task);
    agentSessions.current.set(id, chatSession);

    const newAgent: WorkerAgent = {
      id,
      name,
      role,
      status: AgentStatus.IDLE,
      progress: 0,
      currentTask: task,
      logs: [],
      memoryUsage: 20, // Baseline MB
      dependencies
    };

    setAgents(prev => [...prev, newAgent]);
    addLog(`[KERNEL] Initialized neural container for ${name} (${role})`, 'success');
    return id;
  };

  const killAllAgents = () => {
    setAgents(prev => prev.map(a => ({
      ...a,
      status: AgentStatus.KILLED,
      currentTask: 'Terminated by Master Kill-Switch',
      progress: 0
    })));
    agentSessions.current.clear();
    localStorage.removeItem(STORAGE_KEY);
    addLog('GLOBAL KILL-SWITCH ACTIVATED. All processes terminated.', 'error');
  };

  // Helper to parse artifacts from response
  const parseArtifacts = (text: string, agentName: string): AgentArtifact[] => {
    const regex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    const found: AgentArtifact[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const path = match[1];
      const content = match[2].trim();
      const ext = path.split('.').pop() || 'txt';
      
      found.push({
        id: Math.random().toString(36).substr(2, 9),
        path,
        content,
        language: ext,
        createdBy: agentName,
        lastModified: Date.now()
      });
    }
    return found;
  };

  // --------------------------------------------------------------------------
  // THE REAL AGENT LOOP (Round Robin Scheduler)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const runScheduler = async () => {
      if (processingRef.current) return;

      // Find an agent that needs to work
      const activeAgents = agents.filter(a => a.status === AgentStatus.WORKING || a.status === AgentStatus.IDLE);
      
      const targetAgent = activeAgents.find(a => a.status === AgentStatus.WORKING) || activeAgents.find(a => a.status === AgentStatus.IDLE);

      if (!targetAgent) return;

      processingRef.current = true;

      try {
        // Transition IDLE to THINKING/WORKING
        if (targetAgent.status === AgentStatus.IDLE) {
           setAgents(prev => prev.map(a => a.id === targetAgent.id ? { ...a, status: AgentStatus.WORKING } : a));
        }

        // Lazy session hydration
        let session = agentSessions.current.get(targetAgent.id);
        if (!session) {
           // Re-initialize session if missing (e.g. after page reload)
           session = createAgentSession(targetAgent.name, targetAgent.role, targetAgent.currentTask || 'Resume work');
           agentSessions.current.set(targetAgent.id, session);
           console.log(`[SYSTEM] Re-hydrated session for ${targetAgent.name}`);
        }

        // Get context from GLOBAL logs (the last 5 messages from OTHER agents)
        const sharedContext = globalLogs
          .filter(l => {
             const isBroadcast = l.message.includes('BROADCAST:');
             const isSuccess = l.type === 'success';
             const isArtifact = l.type === 'artifact';
             return isBroadcast || isSuccess || isArtifact || l.type === 'thought';
          })
          .slice(-5)
          .map(l => l.message)
          .join(" | ");

        const existingFilePaths = artifacts.map(a => a.path);

        setAgents(prev => prev.map(a => a.id === targetAgent.id ? { ...a, status: AgentStatus.THINKING } : a));

        const responseText = await stepAgent(session, sharedContext, targetAgent.currentTask, existingFilePaths);

        // Analyze Response
        const newArtifacts = parseArtifacts(responseText, targetAgent.name);
        
        if (newArtifacts.length > 0) {
          setArtifacts(prev => {
            const updated = [...prev];
            newArtifacts.forEach(newArt => {
              const idx = updated.findIndex(a => a.path === newArt.path);
              if (idx >= 0) updated[idx] = newArt; 
              else updated.push(newArt);
            });
            return updated;
          });
          // Trigger prompt for the last generated artifact
          setLatestArtifact(newArtifacts[newArtifacts.length - 1]);
        }

        let cleanResponse = responseText.replace(/<file path="[^"]+">[\s\S]*?<\/file>/g, "[GENERATED FILE]").trim();
        const isComplete = cleanResponse.includes("TASK_COMPLETE");
        cleanResponse = cleanResponse.replace("TASK_COMPLETE", "").trim();
        const isBroadcast = cleanResponse.startsWith("BROADCAST:");

        // Update Broadcast Event for visualization
        if (isBroadcast) {
          setBroadcastEvent({
            sourceId: targetAgent.id,
            message: cleanResponse,
            timestamp: Date.now()
          });
          // Auto-clear event after animation duration roughly
          setTimeout(() => setBroadcastEvent(null), 3000);
        }

        if (newArtifacts.length > 0) {
           addLog(`Generated ${newArtifacts.length} artifact(s): ${newArtifacts.map(a => a.path).join(', ')}`, 'artifact', targetAgent.id);
        }
        
        if (cleanResponse) {
          addLog(cleanResponse, isBroadcast ? 'info' : 'thought', targetAgent.id);
        }
        
        setAgents(prev => prev.map(a => {
          if (a.id === targetAgent.id) {
            const newProgress = Math.min(99, a.progress + 15);
            return {
              ...a,
              status: isComplete ? AgentStatus.COMPLETED : AgentStatus.WORKING,
              progress: isComplete ? 100 : newProgress,
              memoryUsage: a.memoryUsage + Math.floor(Math.random() * 5),
            };
          }
          return a;
        }));

        if (isComplete) {
            addLog(`[${targetAgent.name}] Reporting completion.`, 'success');
        }

      } catch (err) {
        console.error("Agent Cycle Error", err);
        addLog(`Agent ${targetAgent.name} crashed.`, 'error');
        setAgents(prev => prev.map(a => a.id === targetAgent.id ? { ...a, status: AgentStatus.ERROR } : a));
      } finally {
        setTimeout(() => {
            processingRef.current = false;
        }, 800);
      }
    };

    const intervalId = setInterval(runScheduler, 100);
    return () => clearInterval(intervalId);
  }, [agents, globalLogs, artifacts, addLog]); 

  // --------------------------------------------------------------------------
  // MASTER COMMAND HANDLER
  // --------------------------------------------------------------------------
  const handleCommand = async (input: string) => {
    if (!input.trim()) return;
    
    // Reset state for new command
    if (agents.length > 0) {
       // We keep logs but might want to clear agents? 
       // For this app, let's treat a new command as adding to the swarm or replacing?
       // Let's replace for cleanliness based on prompt context implying "Orchestration".
       setAgents([]);
       setArtifacts([]);
       agentSessions.current.clear();
       localStorage.removeItem(STORAGE_KEY);
    }

    setIsOrchestrating(true);
    addLog(`[MASTER] Directive received: "${input}"`, 'info');
    
    const plan = await orchestratePlan(input);
    
    addLog(`[MASTER] Strategy formulated. Deploying ${plan.tasks.length} units.`, 'info');
    
    plan.tasks.forEach(task => {
      spawnAgent(task.name, task.role, task.task, task.dependencies);
    });

    setIsOrchestrating(false);
  };

  const clearLatestArtifact = () => setLatestArtifact(null);

  return {
    agents,
    globalLogs,
    artifacts,
    isOrchestrating,
    handleCommand,
    killAllAgents,
    logsEndRef,
    broadcastEvent,
    latestArtifact,
    clearLatestArtifact
  };
};
