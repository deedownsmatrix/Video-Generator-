
import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { SlideData } from '../types';

interface PresentationPreviewProps {
  slides: SlideData[];
}

export interface PresentationPreviewHandle {
  exportVideo: () => Promise<Blob>;
}

const PresentationPreview = forwardRef<PresentationPreviewHandle, PresentationPreviewProps>(({ slides }, ref) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);

  const playNextSlide = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentSlideIndex(0);
      setProgress(0);
    }
  }, [currentSlideIndex, slides.length]);

  // Handle Canvas Rendering for Ken Burns & Recording
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = slides[currentSlideIndex].imageUrl;

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = (time - startTimeRef.current) / 1000;
      const duration = slides[currentSlideIndex].duration || 5;
      
      // Ken Burns calculation
      const scale = isPlaying ? 1 + (elapsed / duration) * 0.15 : 1;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      
      // Draw image maintain aspect ratio
      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      let drawW, drawH, drawX, drawY;

      if (imgAspect > canvasAspect) {
        drawW = canvas.width;
        drawH = canvas.width / imgAspect;
        drawX = 0;
        drawY = (canvas.height - drawH) / 2;
      } else {
        drawH = canvas.height;
        drawW = canvas.height * imgAspect;
        drawX = (canvas.width - drawW) / 2;
        drawY = 0;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      requestRef.current = requestAnimationFrame(animate);
    };

    img.onload = () => {
      startTimeRef.current = 0;
      requestRef.current = requestAnimationFrame(animate);
    };

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [currentSlideIndex, slides, isPlaying]);

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
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.play().catch(() => {
        setTimeout(playNextSlide, (slides[currentSlideIndex].duration || 5) * 1000);
      });

      return () => {
        audio.pause();
        audio.src = "";
      };
    }
  }, [isPlaying, currentSlideIndex, slides, isMuted, playNextSlide]);

  // Recording API
  useImperativeHandle(ref, () => ({
    exportVideo: async () => {
      return new Promise(async (resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas) return reject("Canvas not found");

        const stream = canvas.captureStream(30);
        const audioContext = new AudioContext();
        const dest = audioContext.createMediaStreamDestination();
        
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(new MediaStream([
          ...stream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]), { mimeType: 'video/webm;codecs=vp9' });

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));

        // Play sequence
        setIsPlaying(false);
        setCurrentSlideIndex(0);
        
        recorder.start();
        
        for (let i = 0; i < slides.length; i++) {
          setCurrentSlideIndex(i);
          const audio = new Audio(slides[i].audioUrl);
          const source = audioContext.createMediaElementSource(audio);
          source.connect(dest);
          source.connect(audioContext.destination);
          
          await new Promise((res) => {
            audio.onended = res;
            audio.play();
          });
          source.disconnect();
        }

        recorder.stop();
        setIsPlaying(false);
      });
    }
  }));

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800/50 group">
      <canvas 
        ref={canvasRef} 
        width={1920} 
        height={1080} 
        className="w-full h-full object-contain"
      />

      <div className="absolute bottom-16 left-0 right-0 flex justify-center px-12 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
          <p className="text-xl md:text-2xl font-medium text-white tracking-wide">
            {slides[currentSlideIndex].subtitle}
          </p>
        </div>
      </div>

      <div className="absolute top-8 right-8 pointer-events-none">
        <div className="bg-slate-900/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
          <span className="text-sm font-bold text-white/80">{currentSlideIndex + 1} / {slides.length}</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_10px_#3b82f6]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-8">
        <button 
          onClick={() => { setIsPlaying(false); setCurrentSlideIndex(0); setProgress(0); }}
          className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full text-white"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button 
          onClick={togglePlay}
          className="p-8 bg-blue-600 hover:bg-blue-500 backdrop-blur-lg rounded-full text-white shadow-xl"
        >
          {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
        </button>
        <button onClick={toggleMute} className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full text-white">
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>

      {!isPlaying && progress === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
           <button onClick={togglePlay} className="flex flex-col items-center">
              <div className="p-10 bg-white rounded-full text-slate-950 shadow-2xl mb-4">
                <Play className="w-12 h-12 fill-current" />
              </div>
              <span className="text-white font-bold text-xl tracking-widest uppercase">Start Presentation</span>
           </button>
        </div>
      )}
    </div>
  );
});

export default PresentationPreview;
