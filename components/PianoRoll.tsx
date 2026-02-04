import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Note, ViewState, ToolMode } from '../types';
import { MIN_MIDI, MAX_MIDI, NOTE_NAMES, isBlackKey, getNoteName, DEFAULT_ZOOM_Y } from '../constants';
import * as d3 from 'd3';

interface PianoRollProps {
  notes: Note[];
  duration: number; // Total duration of audio in seconds
  currentTime: number; // Current playback head position
  viewState: ViewState;
  setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
  toolMode: ToolMode;
  onNoteUpdate: (updatedNote: Note) => void;
  onSelectionChange: (selectedIds: string[]) => void;
}

const PianoRoll: React.FC<PianoRollProps> = ({
  notes,
  duration,
  currentTime,
  viewState,
  setViewState,
  toolMode,
  onNoteUpdate,
  onSelectionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, originalTime: number, originalMidi: number } | null>(null);

  // Constants based on viewState
  const NOTE_HEIGHT = viewState.zoomY;
  const PIXELS_PER_SECOND = viewState.zoomX;
  const TOTAL_HEIGHT = (MAX_MIDI - MIN_MIDI + 1) * NOTE_HEIGHT;
  const TOTAL_WIDTH = Math.max(duration * PIXELS_PER_SECOND, containerRef.current?.clientWidth || 0);

  // Handlers for dragging notes
  const handleNoteMouseDown = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (toolMode === ToolMode.POINTER) {
       onSelectionChange([note.id]);
       setDragState({
         id: note.id,
         startX: e.clientX,
         startY: e.clientY,
         originalTime: note.startTime,
         originalMidi: note.midi
       });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragState && toolMode === ToolMode.POINTER) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      const timeDelta = dx / PIXELS_PER_SECOND;
      const midiDelta = -Math.round(dy / NOTE_HEIGHT); // Negative because Y goes down as pitch goes down in DOM, but up musically

      const newTime = Math.max(0, dragState.originalTime + timeDelta);
      const newMidi = Math.min(MAX_MIDI, Math.max(MIN_MIDI, dragState.originalMidi + midiDelta));

      const updatedNote = notes.find(n => n.id === dragState.id);
      if (updatedNote) {
        onNoteUpdate({
          ...updatedNote,
          startTime: newTime,
          midi: newMidi
        });
      }
    }
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  // Scroll Sync
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setViewState(prev => ({
      ...prev,
      scrollX: target.scrollLeft,
      scrollY: target.scrollTop
    }));
  };

  // Ensure scroll position is applied initially
  useEffect(() => {
    if (containerRef.current) {
        // Center vertically around C4 (MIDI 60)
        const c4Offset = (MAX_MIDI - 60) * NOTE_HEIGHT;
        containerRef.current.scrollTop = c4Offset - (containerRef.current.clientHeight / 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      className="flex flex-row h-full w-full bg-daw-panel overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Piano Keys Sidebar */}
      <div 
        className="flex-shrink-0 w-20 border-r border-daw-grid bg-daw-bg relative overflow-hidden"
        style={{ height: '100%' }}
      >
        <div 
          className="absolute w-full"
          style={{ 
            height: TOTAL_HEIGHT, 
            top: -viewState.scrollY 
          }}
        >
          {Array.from({ length: MAX_MIDI - MIN_MIDI + 1 }).map((_, i) => {
            const midi = MAX_MIDI - i;
            const isBlack = isBlackKey(midi);
            return (
              <div
                key={midi}
                className={`flex items-center justify-end pr-2 text-[10px] border-b border-daw-grid/30 ${
                  isBlack ? 'bg-black text-white' : 'bg-white text-black'
                }`}
                style={{ height: NOTE_HEIGHT }}
              >
                {getNoteName(midi)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative cursor-crosshair"
        onScroll={handleScroll}
      >
        <div 
          ref={canvasRef}
          className="relative bg-daw-bg"
          style={{ 
            width: TOTAL_WIDTH, 
            height: TOTAL_HEIGHT,
            backgroundImage: `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
            backgroundSize: `${PIXELS_PER_SECOND}px ${NOTE_HEIGHT}px` // Grid lines every second and semitone
          }}
        >
          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none transition-transform duration-75"
            style={{ 
              left: 0,
              transform: `translateX(${currentTime * PIXELS_PER_SECOND}px)`
            }}
          />

          {/* Notes */}
          {notes.map((note) => {
            // Calculate Position
            // Y is inverted: Higher MIDI is Lower Y value (top of div)
            const top = (MAX_MIDI - note.midi) * NOTE_HEIGHT;
            const left = note.startTime * PIXELS_PER_SECOND;
            const width = note.duration * PIXELS_PER_SECOND;

            const isSelected = note.selected;

            return (
              <div
                key={note.id}
                onMouseDown={(e) => handleNoteMouseDown(e, note)}
                className={`absolute rounded-md border box-border flex items-center justify-center overflow-hidden group hover:brightness-110 transition-colors ${
                  isSelected 
                    ? 'bg-orange-500 border-white shadow-[0_0_10px_rgba(249,115,22,0.6)] z-20' 
                    : 'bg-orange-600/90 border-orange-800 z-10'
                }`}
                style={{
                  top,
                  left,
                  width: Math.max(width, 4), // Min width visual
                  height: NOTE_HEIGHT - 2, // gap
                  margin: '1px'
                }}
              >
                {/* Note Content (e.g. waveform approximation or text) */}
                {NOTE_HEIGHT > 16 && width > 30 && (
                   <span className="text-[9px] text-white font-mono pointer-events-none select-none opacity-80">
                     {getNoteName(note.midi)}
                   </span>
                )}
                
                {/* Visual "Blob" Center Line */}
                <div className="absolute w-full h-[1px] bg-white/30 top-1/2 left-0 pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PianoRoll;
