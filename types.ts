export interface Note {
  id: string;
  midi: number;
  startTime: number;
  duration: number;
  velocity: number; // 0-1 mapped from intensity
  selected?: boolean;
}

export interface AudioAnalysisResult {
  key: string;
  scale: string;
  bpm: number;
  notes: Note[];
}

export enum ToolMode {
  POINTER = 'POINTER',
  PENCIL = 'PENCIL',
  CUT = 'CUT',
  ZOOM = 'ZOOM'
}

export interface ViewState {
  zoomX: number; // Pixels per second
  zoomY: number; // Pixels per semitone
  scrollX: number;
  scrollY: number;
}
