
export type Persona = 'CEO' | 'Scientist' | 'Teacher';

export interface SlideData {
  pageNumber: number;
  imageUrl: string;
  base64: string;
  script: string;
  subtitle: string;
  audioBlob?: Blob;
  audioUrl?: string;
  duration?: number;
}

export interface ProcessingState {
  step: 'idle' | 'analyzing' | 'narrating' | 'subtitling' | 'assembling' | 'complete';
  progress: number;
  message: string;
}

export interface AppConfig {
  persona: Persona;
  pdfFile: File | null;
}
