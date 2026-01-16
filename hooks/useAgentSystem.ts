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
    // Check if agent already exists (for recovery/updates)
    const existingAgent = agents.find(a => a.name === name);
    
    if (existingAgent) {
        // Revive/Update existing agent
        setAgents(prev => prev.map(a => a.id === existingAgent.id ? {
            ...a,
            status: AgentStatus.IDLE,
            currentTask: task,
            role: role,
            dependencies: dependencies,
            progress: 0
        } : a));
        
        // Re-create session
        const chatSession = createAgentSession(name, role, task);
        agentSessions.current.set(existingAgent.id, chatSession);
        
        addLog(`[KERNEL] Updated protocols for ${name} (${role})`, 'info');
        return existingAgent.id;
    }

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
      dependencies,
      recoveryAttempts: 0
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

  const updateArtifact = (id: string, content: string) => {
    setArtifacts(prev => prev.map(a => 
      a.id === id ? { ...a, content, lastModified: Date.now() } : a
    ));
  };

  // --------------------------------------------------------------------------
  // SELF-HEALING & RECOVERY LOGIC
  // --------------------------------------------------------------------------
  useEffect(() => {
    const checkRecoverableAgents = async () => {
        // Find agents that are awaiting review and haven't exhausted attempts
        const troubledAgent = agents.find(a => 
            a.status === AgentStatus.AWAITING_MASTER_REVIEW && 
            !isOrchestrating &&
            a.recoveryAttempts < 3
        );

        if (troubledAgent) {
            setIsOrchestrating(true);
            const attempt = troubledAgent.recoveryAttempts + 1;
            addLog(`[KERNEL] Failure detected in unit ${troubledAgent.name}. Initiating Recovery Protocol ${attempt}/3.`, 'error');

            const recoveryPrompt = `
                CRITICAL SYSTEM ALERT: Agent "${troubledAgent.name}" (${troubledAgent.role}) has failed.
                
                ERROR REPORT: ${troubledAgent.lastErrorMessage || "Unknown Runtime Error"}
                CURRENT TASK: ${troubledAgent.currentTask}
                
                MISSION: Formulate a recovery plan. 
                1. If the task was too complex, break it down or assign a "Debugger" agent.
                2. If the agent is stuck, restart it with a simplified task.
                3. Return a JSON task list to fix this specific situation.
            `;

            try {
                // Ask Master Agent for a fix
                const plan = await orchestratePlan(recoveryPrompt);
                
                // Apply fixes
                plan.tasks.forEach(task => {
                    spawnAgent(task.name, task.role, task.task, task.dependencies);
                });

                // Update the original agent's recovery counter
                setAgents(prev => prev.map(a => a.id === troubledAgent.id ? {
                    ...a,
                    recoveryAttempts: attempt,
                    // If the master didn't re-spawn it (name match), we might need to manually reset status?
                    // spawnAgent handles re-spawning/updating existing names, so status resets there.
                    // If the name CHANGED, this old agent stays in error unless we force it.
                    // Let's assume Master keeps the name or spawns a helper.
                    // If Master ignores it, we leave it in Review state to prevent loops.
                } : a));

            } catch (e) {
                addLog(`[KERNEL] Recovery failed for ${troubledAgent.name}. Terminating unit.`, 'error');
                setAgents(prev => prev.map(a => a.id === troubledAgent.id ? { ...a, status: AgentStatus.ERROR } : a));
            } finally {
                setIsOrchestrating(false);
            }
        } else if (agents.find(a => a.status === AgentStatus.AWAITING_MASTER_REVIEW && a.recoveryAttempts >= 3)) {
             // Mark as dead if retries exhausted
             setAgents(prev => prev.map(a => a.status === AgentStatus.AWAITING_MASTER_REVIEW ? { ...a, status: AgentStatus.ERROR, currentTask: 'Recovery Failed. Manual Intervention Required.' } : a));
        }
    };
    
    // Check periodically or when agents change
    const timer = setTimeout(checkRecoverableAgents, 1000);
    return () => clearTimeout(timer);
  }, [agents, isOrchestrating, addLog]);

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

      } catch (err: any) {
        console.error("Agent Cycle Error", err);
        addLog(`Agent ${targetAgent.name} encountered error: ${err.message}`, 'error');
        
        // Transition to AWAITING_MASTER_REVIEW for self-healing instead of direct ERROR
        setAgents(prev => prev.map(a => a.id === targetAgent.id ? { 
            ...a, 
            status: AgentStatus.AWAITING_MASTER_REVIEW,
            lastErrorMessage: err.message
        } : a));

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

  return {
    agents,
    globalLogs,
    artifacts,
    isOrchestrating,
    handleCommand,
    killAllAgents,
    logsEndRef,
    broadcastEvent,
    updateArtifact
  };
};
