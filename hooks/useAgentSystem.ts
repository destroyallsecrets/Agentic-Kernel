import { useState, useRef, useEffect } from 'react';
import { WorkerAgent, AgentStatus, AgentLog } from '../types';
import { orchestratePlan, createAgentSession, stepAgent } from '../services/geminiService';
import { Chat } from '@google/genai';

export const useAgentSystem = () => {
  const [agents, setAgents] = useState<WorkerAgent[]>([]);
  const [globalLogs, setGlobalLogs] = useState<AgentLog[]>([]);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  
  // Store the real Gemini Chat sessions. Refs are perfect for non-serializable objects that don't trigger re-renders.
  const agentSessions = useRef<Map<string, Chat>>(new Map());
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Track which agent is currently executing to prevent race conditions
  const processingRef = useRef<boolean>(false);

  const addLog = (message: string, type: AgentLog['type'] = 'info', agentId: string = 'MASTER') => {
    const newLog: AgentLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type,
      message,
    };
    
    setGlobalLogs(prev => {
      // Keep global log size manageable
      const next = [...prev, newLog];
      return next.slice(-50); 
    });
    
    if (agentId !== 'MASTER') {
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return { ...a, logs: [...a.logs, newLog] };
        }
        return a;
      }));
    }
  };

  const spawnAgent = (name: string, role: string, task: string) => {
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
    addLog('GLOBAL KILL-SWITCH ACTIVATED. All processes terminated.', 'error');
  };

  // --------------------------------------------------------------------------
  // THE REAL AGENT LOOP (Round Robin Scheduler)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const runScheduler = async () => {
      if (processingRef.current) return;

      // Find an agent that needs to work
      const activeAgents = agents.filter(a => a.status === AgentStatus.WORKING || a.status === AgentStatus.IDLE);
      
      // If we have active agents, pick one to advance
      // In a real system, this would be a queue. Here we just pick the first 'WORKING' or kickstart 'IDLE'
      const targetAgent = activeAgents.find(a => a.status === AgentStatus.WORKING) || activeAgents.find(a => a.status === AgentStatus.IDLE);

      if (!targetAgent) return;

      processingRef.current = true;

      try {
        // Transition IDLE to THINKING/WORKING
        if (targetAgent.status === AgentStatus.IDLE) {
           setAgents(prev => prev.map(a => a.id === targetAgent.id ? { ...a, status: AgentStatus.WORKING } : a));
        }

        const session = agentSessions.current.get(targetAgent.id);
        if (!session) {
           // Should not happen, but recovery
           setAgents(prev => prev.map(a => a.id === targetAgent.id ? { ...a, status: AgentStatus.ERROR } : a));
           processingRef.current = false;
           return;
        }

        // Get context from GLOBAL logs (the last 5 messages from OTHER agents)
        // This implements the "Cross Communication Bus" / Handshake mechanism
        // We prioritize explicit BROADCAST messages and Success states.
        const sharedContext = globalLogs
          .filter(l => {
             const isBroadcast = l.message.includes('BROADCAST:');
             const isSuccess = l.type === 'success';
             // We include broadcasts, successes, and general thoughts for ambient context
             return isBroadcast || isSuccess || l.type === 'thought';
          })
          .slice(-5)
          .map(l => l.message)
          .join(" | ");

        // Set UI to THINKING
        setAgents(prev => prev.map(a => a.id === targetAgent.id ? { ...a, status: AgentStatus.THINKING } : a));

        // Call Gemini API
        const responseText = await stepAgent(session, sharedContext, targetAgent.currentTask);

        // Analyze Response
        const isComplete = responseText.includes("TASK_COMPLETE");
        const cleanResponse = responseText.replace("TASK_COMPLETE", "").trim();
        const isBroadcast = cleanResponse.startsWith("BROADCAST:");

        // Update UI with Result
        // Broadcasts are logged as 'info' to distinguish them in the terminal
        addLog(cleanResponse, isBroadcast ? 'info' : 'thought', targetAgent.id);
        
        setAgents(prev => prev.map(a => {
          if (a.id === targetAgent.id) {
            const newProgress = Math.min(99, a.progress + 15); // Increment progress per turn
            return {
              ...a,
              status: isComplete ? AgentStatus.COMPLETED : AgentStatus.WORKING,
              progress: isComplete ? 100 : newProgress,
              memoryUsage: a.memoryUsage + Math.floor(Math.random() * 5), // Simulate memory leak/growth
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
        // Add a small delay so we don't hit rate limits instantly and the UI can breathe
        setTimeout(() => {
            processingRef.current = false;
        }, 800);
      }
    };

    const intervalId = setInterval(runScheduler, 100); // Check schedule often, but execution is gated by processingRef
    return () => clearInterval(intervalId);
  }, [agents, globalLogs]); // Re-run if agent list changes or logs update (for context)


  // --------------------------------------------------------------------------
  // MASTER COMMAND HANDLER
  // --------------------------------------------------------------------------
  const handleCommand = async (input: string) => {
    if (!input.trim()) return;
    
    // Clear previous state if needed or just append? Let's clear for new mission.
    if (agents.length > 0) {
        // Optional: clear old agents
        // setAgents([]);
        // agentSessions.current.clear();
    }

    setIsOrchestrating(true);
    addLog(`[MASTER] Directive received: "${input}"`, 'info');
    
    // Call Gemini Orchestrator
    const plan = await orchestratePlan(input);
    
    addLog(`[MASTER] Strategy formulated. Deploying ${plan.tasks.length} units.`, 'info');
    
    plan.tasks.forEach(task => {
      spawnAgent(task.name, task.role, task.task);
    });

    setIsOrchestrating(false);
  };

  return {
    agents,
    globalLogs,
    isOrchestrating,
    handleCommand,
    killAllAgents,
    logsEndRef
  };
};