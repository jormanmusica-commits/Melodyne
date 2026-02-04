import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Mic, Loader2, Music4 } from 'lucide-react';
import Toolbar from './components/Toolbar';
import PianoRoll from './components/PianoRoll';
import { analyzeAudioWithGemini } from './services/geminiService';
import { fileToBase64, decodeAudio } from './services/audioUtils';
import { Note, AudioAnalysisResult, ToolMode, ViewState } from './types';
import { DEFAULT_ZOOM_X, DEFAULT_ZOOM_Y } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [analysis, setAnalysis] = useState<AudioAnalysisResult | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const [toolMode, setToolMode] = useState<ToolMode>(ToolMode.POINTER);
  const [viewState, setViewState] = useState<ViewState>({
    zoomX: DEFAULT_ZOOM_X,
    zoomY: DEFAULT_ZOOM_Y,
    scrollX: 0,
    scrollY: 0
  });

  // Initialize Audio Context (lazily to handle browser policies)
  const getAudioContext = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  }, [audioContext]);

  // --- Audio File Handling ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 50MB limit to prevent browser crash during base64 conversion/request
    // This allows ~30 mins of high quality MP3 (320kbps) or ~60 mins of 128kbps
    if (file.size > 50 * 1024 * 1024) {
        alert("El archivo es demasiado grande (>50MB). Para grabaciones largas (hasta 30 min), por favor usa un formato comprimido como MP3.");
        return;
    }

    setFileName(file.name);
    setIsAnalyzing(true);
    setLoadingMessage("Decodificando datos de audio...");

    try {
      const ctx = getAudioContext();
      
      // 1. Decode for playback
      const buffer = await decodeAudio(file, ctx);
      setAudioBuffer(buffer);

      // 2. Encode for Gemini (limit size for demo stability)
      setLoadingMessage("Preparando audio para IA Gemini...");
      const base64 = await fileToBase64(file);

      // 3. Send to Gemini
      const result = await analyzeAudioWithGemini(base64, file.type, (msg) => setLoadingMessage(msg));
      setAnalysis(result);

    } catch (error) {
      console.error("Failed to load/analyze:", error);
      alert("Error procesando audio. Revisa la consola y la clave API.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Transport Logic ---
  const play = () => {
    if (!audioBuffer || !audioContext) return;

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    // Start playback from current time
    // offset, duration
    const offset = currentTime;
    source.start(0, offset);
    
    startTimeRef.current = audioContext.currentTime - offset;
    sourceNodeRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
       // Only handle natural end, not manual stop
       // This logic is simplified; in a real DAW, onended fires on stop too
    };
  };

  const stop = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) { /* ignore */ }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    cancelAnimationFrame(animationFrameRef.current);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  };

  const handleStop = () => {
    stop();
    setCurrentTime(0);
  };

  // --- Animation Loop ---
  useEffect(() => {
    const loop = () => {
      if (isPlaying && audioContext) {
        const now = audioContext.currentTime;
        const trackTime = now - startTimeRef.current;
        
        // Loop or stop at end? Let's stop at end
        if (audioBuffer && trackTime >= audioBuffer.duration) {
            handleStop();
        } else {
            setCurrentTime(trackTime);
            animationFrameRef.current = requestAnimationFrame(loop);
        }
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, audioContext, audioBuffer]);


  // --- Note Editing Logic ---
  const updateNote = (updatedNote: Note) => {
    if (!analysis) return;
    setAnalysis({
        ...analysis,
        notes: analysis.notes.map(n => n.id === updatedNote.id ? updatedNote : n)
    });
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    if (!analysis) return;
    setAnalysis({
        ...analysis,
        notes: analysis.notes.map(n => ({
            ...n,
            selected: selectedIds.includes(n.id)
        }))
    });
  };

  // --- Render ---

  if (!analysis && !isAnalyzing) {
    return (
      <div className="flex h-screen w-screen bg-daw-bg items-center justify-center text-daw-text">
        <div className="max-w-2xl w-full p-8 border border-daw-surface rounded-xl bg-daw-panel shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
             <div className="bg-daw-surface/50 p-4 rounded-full">
                <Music4 size={64} className="text-daw-accent" />
             </div>
             <div>
               <h1 className="text-4xl font-bold mb-2 text-white">MelodyFlow</h1>
               <p className="text-daw-muted text-lg">Entorno de Análisis y Edición de Audio con IA</p>
             </div>
             
             <div className="w-full h-[1px] bg-daw-surface my-4"></div>

             <div className="flex flex-col space-y-4 w-full max-w-md">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-daw-grid border-dashed rounded-lg cursor-pointer bg-daw-bg hover:bg-daw-surface/50 hover:border-daw-accent transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-daw-muted group-hover:text-daw-accent" />
                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-white">Haz clic para subir audio</span> o arrastra y suelta</p>
                        <p className="text-xs text-gray-500">WAV, MP3, FLAC (Máx 30 min, &lt;50MB)</p>
                    </div>
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                </label>
                
                <div className="flex items-center justify-between text-xs text-daw-muted px-2">
                   <span>Impulsado por Gemini 2.5 Flash</span>
                   <span>Detección Polifónica</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex h-screen w-screen bg-daw-bg items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
           <Loader2 className="w-12 h-12 text-daw-accent animate-spin" />
           <p className="text-xl text-white font-medium">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-daw-bg overflow-hidden">
      <Toolbar 
        isPlaying={isPlaying} 
        onPlayPause={togglePlayPause} 
        onStop={handleStop}
        toolMode={toolMode}
        setToolMode={setToolMode}
        analysis={analysis}
        fileName={fileName}
        currentTime={currentTime}
      />
      
      <main className="flex-1 overflow-hidden relative">
        {analysis && audioBuffer && (
          <PianoRoll 
            notes={analysis.notes}
            duration={audioBuffer.duration}
            currentTime={currentTime}
            viewState={viewState}
            setViewState={setViewState}
            toolMode={toolMode}
            onNoteUpdate={updateNote}
            onSelectionChange={handleSelectionChange}
          />
        )}
      </main>

      {/* Inspector / Footer (Optional) */}
      <div className="h-8 bg-daw-panel border-t border-daw-surface flex items-center px-4 text-xs text-daw-muted justify-between select-none">
        <div className="flex space-x-4">
           <span>Zoom X: {viewState.zoomX}px/s</span>
           <span>Zoom Y: {viewState.zoomY}px/semi</span>
        </div>
        <div>
           {analysis?.notes.filter(n => n.selected).length || 0} notas seleccionadas
        </div>
      </div>
    </div>
  );
};

export default App;