import React, { useState } from 'react';
import { AgentArtifact } from '../types';
import { FileCode, FileText, FileJson, Copy, Check, Download, ChevronLeft } from 'lucide-react';

interface ArtifactExplorerProps {
  artifacts: AgentArtifact[];
  onUpdateArtifact: (id: string, content: string) => void;
}

export const ArtifactExplorer: React.FC<ArtifactExplorerProps> = ({ artifacts, onUpdateArtifact }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [copied, setCopied] = useState(false);

  const selectedArtifact = artifacts.find(a => a.id === selectedId) || (artifacts.length > 0 ? artifacts[0] : null);

  const getIcon = (path: string) => {
    if (path.endsWith('.json')) return <FileJson size={14} className="text-yellow-500" />;
    if (path.endsWith('.md') || path.endsWith('.txt')) return <FileText size={14} className="text-gray-400" />;
    return <FileCode size={14} className="text-accent-cyan" />;
  };

  const copyToClipboard = () => {
    if (selectedArtifact) {
      navigator.clipboard.writeText(selectedArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadFile = () => {
    if (!selectedArtifact) return;
    const blob = new Blob([selectedArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedArtifact.path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowListOnMobile(false);
  };

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 bg-gray-950">
        <div className="p-4 bg-gray-900 rounded-full mb-3 border border-gray-850">
          <FileCode size={24} className="opacity-30" />
        </div>
        <p className="text-xs font-mono uppercase tracking-widest opacity-60">Null artifacts detected</p>
        <p className="text-[10px] text-gray-700 mt-2 max-w-[200px] text-center uppercase leading-relaxed">Awaiting broadcast from worker cluster.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-950 font-mono text-sm overflow-hidden relative">
      
      {/* Sidebar List - Takes full width on mobile when visible */}
      <div className={`
        ${showListOnMobile ? 'flex' : 'hidden md:flex'}
        w-full md:w-64 flex-col border-r border-gray-850 bg-gray-900/40 z-10
      `}>
        <div className="p-4 border-b border-gray-850 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-900/50 flex justify-between items-center">
          <span>fs_vol_01</span>
          <span className="opacity-40">{artifacts.length} items</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {artifacts.map(art => (
            <div
              key={art.id}
              onClick={() => handleSelect(art.id)}
              className={`
                flex items-center gap-3 px-4 py-3.5 cursor-pointer border-l-2 transition-all
                ${selectedArtifact?.id === art.id 
                  ? 'bg-gray-800/80 border-primary-500 text-gray-100' 
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'}
              `}
            >
              <div className="shrink-0">{getIcon(art.path)}</div>
              <span className="truncate text-[11px] font-medium tracking-tight">{art.path}</span>
            </div>
          ))}
          {/* Substantial mobile bottom padding to clear the navigation bar */}
          <div className="h-28 lg:h-4"></div>
        </div>
      </div>

      {/* Content Editor */}
      <div className={`
        ${!showListOnMobile ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col min-w-0 bg-gray-950 h-full
      `}>
        {selectedArtifact && (
          <>
            <div className="h-12 border-b border-gray-850 flex items-center justify-between px-3 bg-gray-900/60 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => setShowListOnMobile(true)}
                  className="md:hidden p-2 -ml-1 text-gray-400 hover:text-white bg-gray-800 rounded-md mr-1"
                >
                   <ChevronLeft size={18} />
                </button>
                <span className="text-[10px] text-gray-400 truncate tracking-tight opacity-80">/{selectedArtifact.path}</span>
              </div>
              
              <div className="flex items-center gap-1">
                 <button 
                  onClick={downloadFile}
                  className="p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-500 hover:text-primary-400"
                  title="Download"
                 >
                   <Download size={14} />
                 </button>
                 <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-500 hover:text-white"
                  title="Copy"
                >
                  {copied ? <Check size={14} className="text-accent-emerald" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <textarea
                value={selectedArtifact.content}
                onChange={(e) => onUpdateArtifact(selectedArtifact.id, e.target.value)}
                className="w-full h-full p-4 lg:p-6 bg-transparent text-gray-300 font-mono text-[11px] md:text-xs leading-relaxed outline-none resize-none focus:bg-gray-900/10 transition-colors"
                spellCheck={false}
                autoFocus={!showListOnMobile}
                placeholder="No data..."
              />
              {/* Substantial mobile bottom padding for the text area to clear navigation bar */}
              <div className="h-28 md:hidden pointer-events-none"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};