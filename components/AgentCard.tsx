import React from 'react';
import { WorkerAgent, AgentStatus } from '../types';
import { 
  Cpu, 
  Circle, 
  CheckCircle, 
  AlertOctagon, 
  BrainCircuit,
  LayoutTemplate,
  Server,
  Database,
  Shield,
  PenTool,
  Bug,
  Bot,
  Code,
  Hourglass
} from 'lucide-react';

interface AgentCardProps {
  agent: WorkerAgent;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, selected, onClick, compact }) => {
  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.WORKING: return 'text-accent-cyan';
      case AgentStatus.THINKING: return 'text-accent-purple';
      case AgentStatus.COMPLETED: return 'text-accent-emerald';
      case AgentStatus.ERROR:
      case AgentStatus.KILLED: return 'text-red-500';
      case AgentStatus.AWAITING_MASTER_REVIEW: return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case AgentStatus.WORKING: return <Cpu size={compact ? 12 : 14} className="animate-spin-slow" />;
      case AgentStatus.THINKING: return <BrainCircuit size={compact ? 12 : 14} className="animate-pulse" />;
      case AgentStatus.COMPLETED: return <CheckCircle size={compact ? 12 : 14} />;
      case AgentStatus.ERROR:
      case AgentStatus.KILLED: return <AlertOctagon size={compact ? 12 : 14} />;
      case AgentStatus.AWAITING_MASTER_REVIEW: return <Hourglass size={compact ? 12 : 14} className="animate-pulse" />;
      default: return <Circle size={compact ? 12 : 14} />;
    }
  };

  const getRoleIcon = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('frontend') || r.includes('ui') || r.includes('ux')) return LayoutTemplate;
    if (r.includes('backend') || r.includes('api') || r.includes('server')) return Server;
    if (r.includes('data') || r.includes('analytics') || r.includes('ml') || r.includes('ai')) return Database;
    if (r.includes('security') || r.includes('audit') || r.includes('auth')) return Shield;
    if (r.includes('architect') || r.includes('design') || r.includes('plan')) return PenTool;
    if (r.includes('test') || r.includes('qa') || r.includes('quality')) return Bug;
    if (r.includes('dev') || r.includes('engineer')) return Code;
    return Bot;
  };

  const statusColor = getStatusColor(agent.status);
  const RoleIcon = getRoleIcon(agent.role);

  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer rounded-lg transition-all duration-200 group
        bg-gray-900 border flex flex-col justify-between relative overflow-hidden
        ${selected ? 'border-primary-500 ring-1 ring-primary-500 shadow-[0_0_20px_rgba(37,99,235,0.15)]' : 'border-gray-850 hover:border-gray-700 hover:shadow-lg'}
        ${compact ? 'p-3 gap-2.5 min-h-[96px]' : 'p-5 gap-4 min-h-[140px]'}
      `}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`
            flex items-center justify-center rounded-md bg-gray-950 border border-gray-850 text-gray-400 shrink-0
            ${compact ? 'w-8 h-8' : 'w-10 h-10'}
          `}>
             <RoleIcon size={compact ? 16 : 20} className="group-hover:text-primary-500 transition-colors" />
          </div>
          <div className="min-w-0 flex-1 pr-2">
            <h3 className={`font-mono font-medium text-gray-200 truncate leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>
              {agent.name}
            </h3>
            <p className={`text-gray-500 uppercase tracking-wider font-semibold truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
              {agent.role}
            </p>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className={`
          flex items-center justify-center rounded-full bg-gray-950 border border-gray-850 shrink-0
          ${statusColor}
          ${compact ? 'w-6 h-6' : 'px-2.5 py-1 gap-1.5'}
        `}>
          {getStatusIcon(agent.status)}
          {!compact && <span className="text-[10px] font-mono font-bold">{agent.status === AgentStatus.AWAITING_MASTER_REVIEW ? 'RECOVERY' : agent.status}</span>}
        </div>
      </div>

      {/* Content Wrapper */}
      <div className="flex flex-col gap-2 w-full">
        {/* Progress Line */}
        <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${agent.status === AgentStatus.KILLED || agent.status === AgentStatus.ERROR ? 'bg-red-900' : (agent.status === AgentStatus.AWAITING_MASTER_REVIEW ? 'bg-yellow-600' : 'bg-gray-700 group-hover:bg-primary-600')}`}
            style={{ width: `${agent.progress}%` }}
          />
        </div>

        {/* Footer Metrics */}
        <div className={`flex items-center justify-between font-mono text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
           <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.currentTask && agent.status === AgentStatus.WORKING ? 'bg-primary-500 animate-pulse' : 'bg-gray-700'}`} />
              <span className="truncate">{agent.currentTask || 'Idle'}</span>
           </div>
           <span className="tabular-nums opacity-60 hover:opacity-100">{agent.memoryUsage}MB</span>
        </div>
      </div>
    </div>
  );
};
