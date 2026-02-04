export const MIN_MIDI = 21; // A0
export const MAX_MIDI = 108; // C8
export const DEFAULT_ZOOM_X = 100; // 100px per second
export const DEFAULT_ZOOM_Y = 24; // 24px per semitone (note height)
export const HEADER_HEIGHT = 64;
export const SIDEBAR_WIDTH = 80; // Piano keys width

// MIDI Note Names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const getNoteName = (midi: number): string => {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
};

export const isBlackKey = (midi: number): boolean => {
  const n = midi % 12;
  return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
};
