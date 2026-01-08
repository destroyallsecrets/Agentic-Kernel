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
  type: 'info' | 'error' | 'success' | 'thought';
  message: string;
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