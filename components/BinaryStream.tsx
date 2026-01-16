
import React, { useEffect, useRef } from 'react';
import { WorkerAgent, AgentStatus } from '../types';
import { Activity } from 'lucide-react';

interface BinaryStreamProps {
  agents: WorkerAgent[];
}

export const BinaryStream: React.FC<BinaryStreamProps> = ({ agents }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist drops configuration to prevent clock resets on re-renders
  const dropsRef = useRef<number[]>([]);

  // System State derived from props
  const isWorking = agents.some(a => a.status === AgentStatus.WORKING || a.status === AgentStatus.THINKING);
  const hasErrors = agents.some(a => a.status === AgentStatus.ERROR || a.status === AgentStatus.KILLED);

  // Use a ref for state to access it inside the animation loop without restarting the effect
  const stateRef = useRef({ isWorking, hasErrors });

  useEffect(() => {
    stateRef.current = { isWorking, hasErrors };
  }, [isWorking, hasErrors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration
    const fontSize = 14;
    let columns = 0;
    
    // Resize Handler
    const handleResize = () => {
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            columns = Math.floor(canvas.width / fontSize);
            
            // Re-initialize drops if dimensions changed significantly or empty
            if (dropsRef.current.length !== columns) {
                dropsRef.current = new Array(columns).fill(1).map(() => Math.random() * -100); 
            }
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    let animationFrameId: number;

    const render = () => {
      const { isWorking, hasErrors } = stateRef.current;
      const drops = dropsRef.current;

      // Fade effect (Trail)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;
      
      const now = new Date();
      // Binary strings for Clock (padded)
      const hBin = now.getHours().toString(2).padStart(6, '0');
      const mBin = now.getMinutes().toString(2).padStart(6, '0');
      const sBin = now.getSeconds().toString(2).padStart(6, '0');

      // Determine theme colors
      const primaryColor = hasErrors ? '#ef4444' : (isWorking ? '#06b6d4' : '#22c55e'); 
      
      const centerCol = Math.floor(columns / 2);
      // Spacing for the clock columns
      const offset = Math.max(2, Math.floor(columns / 10)); 

      for (let i = 0; i < drops.length; i++) {
        // Identify Columns
        const isHourCol = i === centerCol - offset;
        const isMinCol = i === centerCol;
        const isSecCol = i === centerCol + offset;
        const isClockColumn = isHourCol || isMinCol || isSecCol;
        
        // HIDE LOGIC: If idle and not a clock column, hide and reset to top
        if (!isClockColumn && !isWorking && !hasErrors) {
            // If drop is currently visible (positive Y), reset it to random height above canvas
            // so it's ready to rain down when activity starts.
            if (drops[i] > 0) {
                drops[i] = Math.random() * -100;
            }
            continue;
        }

        let text = Math.random() > 0.5 ? '1' : '0';

        if (isHourCol) {
            const charIndex = Math.floor(Math.abs(drops[i])) % hBin.length;
            text = hBin[charIndex];
        } else if (isMinCol) {
            const charIndex = Math.floor(Math.abs(drops[i])) % mBin.length;
            text = mBin[charIndex];
        } else if (isSecCol) {
            const charIndex = Math.floor(Math.abs(drops[i])) % sBin.length;
            text = sBin[charIndex];
        }

        // Color Logic
        if (isClockColumn) {
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowBlur = 8;
            ctx.shadowColor = primaryColor;
        } else {
            ctx.fillStyle = primaryColor;
            ctx.shadowBlur = 0;
            if (Math.random() > 0.99) {
                 ctx.fillStyle = '#ffffff'; 
            }
        }

        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        ctx.fillText(text, x, y);

        // Reset drop to top
        if (y > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        
        // Physics
        drops[i]++;
      }
      
      // Draw Static Headers for the Clock Columns
      ctx.shadowBlur = 0;
      ctx.fillStyle = primaryColor;
      ctx.font = `bold ${fontSize}px monospace`;
      
      const headerY = fontSize;
      ctx.fillText('H', (centerCol - offset) * fontSize, headerY);
      ctx.fillText('M', (centerCol) * fontSize, headerY);
      ctx.fillText('S', (centerCol + offset) * fontSize, headerY);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Empty dependency array: logic depends on refs

  return (
    <div className="flex flex-col h-full bg-black border-t border-green-500/20 font-mono text-xs overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
        {/* TERMINAL HEADER */}
        <div className="flex justify-between items-center px-3 py-2 bg-black border-b border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)] z-10">
            <div className="flex items-center gap-3 overflow-hidden select-none">
                <div className="relative flex items-center justify-center">
                    <Activity size={14} className={isWorking ? "text-cyan-400" : (hasErrors ? "text-red-500" : "text-green-500")} />
                </div>
                <div className="flex items-center">
                <span className={`font-bold font-mono text-[10px] tracking-widest ${hasErrors ? "text-red-500" : "text-green-500"}`}>
                    /dev/neural_link/stream
                </span>
                <span className="text-green-500 animate-[pulse_1s_steps(2)_infinite] ml-1">_</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
                <div className="hidden sm:flex gap-2 text-[10px]">
                    {hasErrors ? (
                        <span className="flex items-center gap-1 text-red-500 font-bold drop-shadow-[0_0_2px_rgba(239,68,68,0.8)]">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div> CRITICAL
                        </span>
                    ) : (
                        <span className={`flex items-center gap-1 drop-shadow-[0_0_2px_rgba(34,197,94,0.5)] ${isWorking ? "text-cyan-400" : "text-green-500"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.8)] ${isWorking ? 'animate-pulse bg-cyan-400' : 'bg-green-500'}`}></div> 
                        {isWorking ? 'PROCESSING' : 'IDLE'}
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* CANVAS BODY */}
        <div ref={containerRef} className="flex-1 relative bg-black">
             <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
    </div>
  );
};
