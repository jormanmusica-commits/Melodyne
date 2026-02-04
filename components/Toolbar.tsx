import React from 'react';
import { Play, Pause, Square, MousePointer, Pencil, Scissors, ZoomIn, Music2, Wand2, Volume2 } from 'lucide-react';
import { ToolMode, AudioAnalysisResult } from '../types';

interface ToolbarProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  analysis: AudioAnalysisResult | null;
  fileName: string | null;
  currentTime: number;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  isPlaying, 
  onPlayPause, 
  onStop, 
  toolMode, 
  setToolMode,
  analysis,
  fileName,
  currentTime
}) => {
  
  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-16 bg-daw-panel border-b border-daw-surface flex items-center px-4 justify-between shadow-lg z-50">
      
      {/* Left: Branding & Transport */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-tr from-orange-600 to-amber-500 p-2 rounded-lg">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white hidden md:block">MelodyFlow</span>
        </div>

        <div className="h-8 w-[1px] bg-daw-surface mx-2" />

        <div className="flex items-center space-x-2 bg-daw-surface/50 p-1 rounded-lg">
          <button 
            onClick={onPlayPause}
            className={`p-2 rounded hover:bg-daw-surface transition-colors ${isPlaying ? 'text-green-400' : 'text-daw-text'}`}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button 
            onClick={onStop}
            className="p-2 rounded hover:bg-daw-surface text-daw-text hover:text-red-400 transition-colors"
          >
            <Square size={20} />
          </button>
          
          <div className="bg-black/40 px-3 py-1 rounded font-mono text-green-400 text-lg min-w-[100px] text-center">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Center: Tools */}
      <div className="flex items-center space-x-1 bg-daw-surface/30 p-1 rounded-lg">
        <ToolButton 
          active={toolMode === ToolMode.POINTER} 
          onClick={() => setToolMode(ToolMode.POINTER)} 
          icon={<MousePointer size={18} />} 
          label="Principal"
        />
        <ToolButton 
          active={toolMode === ToolMode.PENCIL} 
          onClick={() => setToolMode(ToolMode.PENCIL)} 
          icon={<Pencil size={18} />} 
          label="Dibujar"
        />
         <ToolButton 
          active={toolMode === ToolMode.CUT} 
          onClick={() => setToolMode(ToolMode.CUT)} 
          icon={<Scissors size={18} />} 
          label="Cortar"
        />
         <ToolButton 
          active={toolMode === ToolMode.ZOOM} 
          onClick={() => setToolMode(ToolMode.ZOOM)} 
          icon={<ZoomIn size={18} />} 
          label="Zoom"
        />
      </div>

      {/* Right: Info & Status */}
      <div className="flex items-center space-x-4">
        {analysis && (
          <div className="flex items-center space-x-4 text-xs font-mono text-daw-muted">
            <div className="flex flex-col items-end">
              <span className="text-daw-accent font-bold">{analysis.key}</span>
              <span>TONO</span>
            </div>
            <div className="h-6 w-[1px] bg-daw-surface" />
            <div className="flex flex-col items-end">
              <span className="text-daw-accent font-bold">{Math.round(analysis.bpm)}</span>
              <span>BPM</span>
            </div>
          </div>
        )}
        
        {fileName && (
           <div className="px-3 py-1 bg-daw-surface rounded-full text-xs text-daw-text max-w-[150px] truncate">
             {fileName}
           </div>
        )}

        <button className="flex items-center space-x-2 bg-daw-accent hover:bg-daw-accentHover text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
          <Wand2 size={16} />
          <span>Corregir Tono</span>
        </button>
      </div>
    </div>
  );
};

const ToolButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    title={label}
    className={`p-2 rounded-md transition-all ${
      active 
        ? 'bg-daw-surface text-daw-accent shadow-sm' 
        : 'text-daw-muted hover:text-daw-text hover:bg-daw-surface/50'
    }`}
  >
    {icon}
  </button>
);

export default Toolbar;