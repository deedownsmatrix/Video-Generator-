
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { SlideData } from '../types';

interface PresentationPreviewProps {
  slides: SlideData[];
}

const PresentationPreview: React.FC<PresentationPreviewProps> = ({ slides }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  const playNextSlide = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentSlideIndex(0);
      setProgress(0);
    }
  }, [currentSlideIndex, slides.length]);

  useEffect(() => {
    if (isPlaying && slides[currentSlideIndex]) {
      const audio = new Audio(slides[currentSlideIndex].audioUrl);
      audio.muted = isMuted;
      audioRef.current = audio;
      
      audio.onended = () => {
        playNextSlide();
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          const p = (audio.currentTime / audio.duration) * 100;
          setProgress(p);
        }
      };

      const startPlayback = async () => {
        try {
          await audio.play();
        } catch (e) {
          console.error("Audio playback error:", e);
          // If playback fails, skip to next after a delay based on estimated duration
          setTimeout(playNextSlide, (slides[currentSlideIndex].duration || 5) * 1000);
        }
      };

      startPlayback();

      return () => {
        audio.pause();
        audio.src = ""; // Clear source to free memory
        audio.onended = null;
        audio.ontimeupdate = null;
      };
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSlideIndex, slides, isMuted, playNextSlide]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);
  const reset = () => {
    setIsPlaying(false);
    setCurrentSlideIndex(0);
    setProgress(0);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800/50 group">
      {/* Slide Image with Ken Burns */}
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black">
        <img 
          src={currentSlide.imageUrl} 
          alt={`Slide ${currentSlide.pageNumber}`}
          className={`w-full h-full object-contain transition-transform duration-500 ${isPlaying ? 'ken-burns' : ''}`}
          style={{ 
            animationDuration: `${(currentSlide.duration || 10)}s`,
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        />
      </div>

      {/* Subtitles Overlay */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center px-12 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xl md:text-2xl font-medium text-white tracking-wide shadow-sm">
            {currentSlide.subtitle}
          </p>
        </div>
      </div>

      {/* Slide Counter Overlay */}
      <div className="absolute top-8 right-8 pointer-events-none">
        <div className="bg-slate-900/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
          <span className="text-sm font-bold text-white/80">{currentSlideIndex + 1} / {slides.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_10px_#3b82f6]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls Overlay */}
      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-8">
        <button 
          onClick={reset}
          className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full text-white transition-all transform hover:scale-110"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button 
          onClick={togglePlay}
          className="p-8 bg-blue-600 hover:bg-blue-500 backdrop-blur-lg rounded-full text-white transition-all transform hover:scale-110 shadow-xl shadow-blue-900/40"
        >
          {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
        </button>
        <button 
          onClick={toggleMute}
          className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full text-white transition-all transform hover:scale-110"
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>

      {!isPlaying && progress === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
           <button 
            onClick={togglePlay}
            className="group/play flex flex-col items-center"
           >
              <div className="p-10 bg-white rounded-full text-slate-950 shadow-2xl transition-all group-hover/play:scale-110 mb-4">
                <Play className="w-12 h-12 fill-current" />
              </div>
              <span className="text-white font-bold text-xl tracking-widest uppercase">Start Presentation</span>
           </button>
        </div>
      )}
    </div>
  );
};

export default PresentationPreview;
