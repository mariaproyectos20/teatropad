export interface AudioPadData {
  id: number;
  file: File | null;
  fileName: string | null;
  audioUrl: string | null;
  color: string;
}

export interface PlayingAudio {
  padId: number;
  audio: HTMLAudioElement;
}
