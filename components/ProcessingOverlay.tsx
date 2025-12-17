
import React from 'react';
import { Loader2, Brain, Mic, Subtitles, Film } from 'lucide-react';
import { ProcessingState } from '../types';

interface ProcessingOverlayProps {
  state: ProcessingState;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ state }) => {
  const getIcon = () => {
    switch (state.step) {
      case 'analyzing': return <Brain className="w-12 h-12 text-blue-400 animate-pulse" />;
      case 'narrating': return <Mic className="w-12 h-12 text-purple-400 animate-bounce" />;
      case 'subtitling': return <Subtitles className="w-12 h-12 text-pink-400 animate-pulse" />;
      case 'assembling': return <Film className="w-12 h-12 text-green-400 animate-spin" />;
      default: return <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
        <div className="relative">{getIcon()}</div>
      </div>
      
      <h2 className="text-3xl font-bold mb-2 tracking-tight">{state.step.charAt(0).toUpperCase() + state.step.slice(1)}...</h2>
      <p className="text-slate-400 text-lg mb-12 text-center max-w-md">{state.message}</p>
      
      <div className="w-full max-w-xl bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner mb-4">
        <div 
          className="h-full progress-gradient transition-all duration-700 ease-out"
          style={{ width: `${state.progress}%` }}
        />
      </div>
      
      <div className="flex space-x-8 text-xs font-bold uppercase tracking-widest mt-4">
        <span className={`${state.step === 'analyzing' ? 'text-blue-400' : 'text-slate-600'}`}>Analysis</span>
        <span className="text-slate-700">/</span>
        <span className={`${state.step === 'narrating' ? 'text-purple-400' : 'text-slate-600'}`}>Audio Sync</span>
        <span className="text-slate-700">/</span>
        <span className={`${state.step === 'assembling' ? 'text-green-400' : 'text-slate-600'}`}>Rendering</span>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
