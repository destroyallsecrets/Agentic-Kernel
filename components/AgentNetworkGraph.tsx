
import React, { useEffect, useState } from 'react';
import { WorkerAgent, BroadcastEvent } from '../types';

interface AgentNetworkGraphProps {
  agents: WorkerAgent[];
  broadcastEvent: BroadcastEvent | null;
}

export const AgentNetworkGraph: React.FC<AgentNetworkGraphProps> = ({ agents, broadcastEvent }) => {
  const [positions, setPositions] = useState<{ [key: string]: { x: number, y: number } }>({});

  // Simple circle layout calculation
  useEffect(() => {
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    const count = agents.length;
    const radius = 80; // Distance from center
    const centerX = 150;
    const centerY = 100;

    agents.forEach((agent, index) => {
      const angle = (index / count) * 2 * Math.PI;
      newPositions[agent.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    setPositions(newPositions);
  }, [agents]);

  // Helper to find dependencies
  const getDependencies = (agent: WorkerAgent) => {
     return agent.dependencies.map(depName => agents.find(a => a.name === depName)).filter(Boolean) as WorkerAgent[];
  };

  if (agents.length === 0) return null;

  return (
    <div className="w-full aspect-[3/2] md:h-[200px] md:aspect-auto bg-gray-900/50 rounded-lg border border-gray-850 relative overflow-hidden flex items-center justify-center">
      <div className="absolute top-2 left-3 text-[10px] text-gray-500 font-mono uppercase tracking-widest z-10">
        Neural Mesh
      </div>
      
      <svg 
        viewBox="0 0 300 200" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full pointer-events-none"
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
          </marker>
        </defs>

        {/* Dependency Lines (Static) */}
        {agents.map(agent => {
          const start = positions[agent.id];
          if (!start) return null;
          return getDependencies(agent).map(dep => {
            const end = positions[dep.id];
            if (!end) return null;
            return (
              <line
                key={`${agent.id}-${dep.id}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="4"
                markerEnd="url(#arrowhead)"
              />
            );
          });
        })}

        {/* Broadcast Lines (Dynamic) */}
        {broadcastEvent && positions[broadcastEvent.sourceId] && (
            agents.filter(a => a.id !== broadcastEvent.sourceId).map(target => {
                const start = positions[broadcastEvent.sourceId];
                const end = positions[target.id];
                if (!start || !end) return null;
                return (
                    <line
                        key={`broadcast-${target.id}`}
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        className="animate-ping-slow opacity-50"
                    />
                )
            })
        )}

        {/* Nodes */}
        {agents.map(agent => {
          const pos = positions[agent.id];
          if (!pos) return null;
          const isBroadcaster = broadcastEvent?.sourceId === agent.id;

          return (
            <g key={agent.id}>
              {/* Broadcast Pulse Effect */}
              {isBroadcaster && (
                 <circle cx={pos.x} cy={pos.y} r="20" fill="none" stroke="#0ea5e9" strokeWidth="2" className="animate-ping opacity-75" />
              )}
              
              <circle
                cx={pos.x}
                cy={pos.y}
                r={14}
                className={`
                    transition-all duration-300
                    ${isBroadcaster ? 'fill-primary-500 stroke-primary-400' : 'fill-gray-800 stroke-gray-700'}
                `}
                strokeWidth="2"
              />
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                className="font-bold pointer-events-none select-none font-mono"
              >
                {agent.name.charAt(0)}
              </text>
              <text
                x={pos.x}
                y={pos.y + 26}
                textAnchor="middle"
                fontSize="8"
                fill="#9ca3af"
                className="font-mono"
              >
                {agent.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
