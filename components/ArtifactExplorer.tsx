
import React, { useState } from 'react';
import { AgentArtifact } from '../types';
import { FileCode, FileText, FileJson, Copy, Check, Download } from 'lucide-react';

interface ArtifactExplorerProps {
  artifacts: AgentArtifact[];
  onUpdateArtifact: (id: string, content: string) => void;
}

export const ArtifactExplorer: React.FC<ArtifactExplorerProps> = ({ artifacts, onUpdateArtifact }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedArtifact = artifacts.find(a => a.id === selectedId) || artifacts[0];

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

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 border-l border-gray-850">
        <div className="p-4 bg-gray-900 rounded-full mb-3">
          <FileCode size={24} className="opacity-50" />
        </div>
        <p className="text-sm font-mono">No artifacts generated yet.</p>
        <p className="text-xs text-gray-700 mt-2 max-w-[200px] text-center">Agents will output files here as they work.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full border-l border-gray-850 bg-gray-950 font-mono text-sm">
      {/* Sidebar List */}
      <div className="w-64 flex flex-col border-r border-gray-850 bg-gray-900/30">
        <div className="p-3 border-b border-gray-850 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Filesystem ({artifacts.length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {artifacts.map(art => (
            <div
              key={art.id}
              onClick={() => setSelectedId(art.id)}
              className={`
                flex items-center gap-2 px-4 py-3 cursor-pointer border-l-2 transition-colors
                ${selectedArtifact?.id === art.id 
                  ? 'bg-gray-800 border-primary-500 text-gray-200' 
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}
              `}
            >
              {getIcon(art.path)}
              <span className="truncate">{art.path}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
        {selectedArtifact && (
          <>
            <div className="h-10 border-b border-gray-850 flex items-center justify-between px-4 bg-gray-900">
              <span className="text-xs text-gray-400">{selectedArtifact.path}</span>
              
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-600 mr-2">
                    {new Date(selectedArtifact.lastModified).toLocaleTimeString()}
                 </span>
                 <button 
                  onClick={downloadFile}
                  className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-primary-400"
                  title="Download"
                 >
                   <Download size={14} />
                 </button>
                 <button 
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-white"
                  title="Copy content"
                >
                  {copied ? <Check size={14} className="text-accent-emerald" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <textarea
                value={selectedArtifact.content}
                onChange={(e) => onUpdateArtifact(selectedArtifact.id, e.target.value)}
                className="w-full h-full p-4 bg-transparent text-gray-300 font-mono text-xs leading-relaxed outline-none resize-none focus:bg-gray-900/20 transition-colors"
                spellCheck={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
