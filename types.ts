
export enum AgentStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  WORKING = 'WORKING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  KILLED = 'KILLED'
}

export interface AgentLog {
  id: string;
  timestamp: number;
  type: 'info' | 'error' | 'success' | 'thought' | 'artifact';
  message: string;
}

export interface AgentArtifact {
  id: string;
  path: string;
  content: string;
  language: string;
  createdBy: string;
  lastModified: number;
}

export interface WorkerAgent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  progress: number;
  currentTask?: string;
  logs: AgentLog[];
  memoryUsage: number; // in MB
  dependencies: string[]; // List of agent names this agent depends on
}

export interface OrchestratorState {
  isProcessing: boolean;
  masterThought: string;
  activeAgents: WorkerAgent[];
  globalLogs: AgentLog[];
}

export interface MasterCommand {
  type: 'SPAWN_AGENTS' | 'KILL_ALL' | 'UPDATE_AGENT';
  payload?: any;
}

export interface BroadcastEvent {
  sourceId: string;
  message: string;
  timestamp: number;
}
