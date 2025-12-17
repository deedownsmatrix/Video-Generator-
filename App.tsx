
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Play, CheckCircle, Loader2, ChevronRight, Video, FileText, UserCircle } from 'lucide-react';
import { PdfService } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { Persona, SlideData, ProcessingState } from './types';
import ProcessingOverlay from './components/ProcessingOverlay';
import PresentationPreview from './components/PresentationPreview';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [persona, setPersona] = useState<Persona>('CEO');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [processing, setProcessing] = useState<ProcessingState>({
    step: 'idle',
    progress: 0,
    message: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startGeneration = async () => {
    if (!file) return;

    try {
      setProcessing({ step: 'analyzing', progress: 10, message: 'Extracting PDF slides...' });
      const images = await PdfService.convertPdfToImages(file);
      
      setProcessing({ step: 'analyzing', progress: 30, message: 'Thinking: Analyzing slides with Gemini 3 Pro...' });
      const scripts = await GeminiService.generatePresentationScripts(images, persona);

      const initialSlides: SlideData[] = images.map((img, i) => ({
        pageNumber: i + 1,
        imageUrl: img.imageUrl,
        base64: img.base64,
        script: scripts[i] || `Slide ${i + 1} narration content.`,
        subtitle: ''
      }));

      setProcessing({ step: 'narrating', progress: 50, message: 'Generating Studio-Quality Audio...' });
      const enrichedSlides: SlideData[] = [];
      for (let i = 0; i < initialSlides.length; i++) {
        setProcessing(prev => ({ 
          ...prev, 
          progress: 50 + Math.floor((i / initialSlides.length) * 20),
          message: `Narration for slide ${i + 1}...` 
        }));
        const { audioBlob, duration } = await GeminiService.generateAudio(initialSlides[i].script);
        const subtitle = await GeminiService.generateCaptions(initialSlides[i].script);
        
        enrichedSlides.push({
          ...initialSlides[i],
          audioBlob,
          audioUrl: URL.createObjectURL(audioBlob),
          duration,
          subtitle
        });
      }

      setSlides(enrichedSlides);
      setProcessing({ step: 'complete', progress: 100, message: 'Presentation ready!' });
    } catch (error) {
      console.error(error);
      setProcessing({ step: 'idle', progress: 0, message: 'Error: Something went wrong.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Gemini Studio</h1>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-blue-400 transition-colors">Workspace</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Library</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Settings</a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        {processing.step === 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Input Selection */}
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="space-y-4">
                <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 leading-tight">
                  Notebooks into <br /> Masterpieces.
                </h2>
                <p className="text-xl text-slate-400 max-w-md">
                  Convert your PDF lecture notes or business decks into a cinematic narrated video in seconds.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-300 flex items-center">
                    <UserCircle className="w-4 h-4 mr-2" /> Select Presenter Persona
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['CEO', 'Scientist', 'Teacher'] as Persona[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPersona(p)}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                          persona === p
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4 hover:border-slate-500 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="p-4 bg-slate-800 rounded-full">
                      <Upload className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-200">
                        {file ? file.name : 'Drop your PDF here'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Max file size: 20MB
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  disabled={!file}
                  onClick={startGeneration}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Generate Video Presentation</span>
                </button>
              </div>
            </div>

            {/* Right: Feature Preview Cards */}
            <div className="hidden lg:grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                <FileText className="w-8 h-8 text-purple-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">Multimodal Analysis</h3>
                <p className="text-sm text-slate-400">Gemini 3 Pro reads your slides to understand complex graphs and diagrams.</p>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all translate-y-8">
                <Loader2 className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">High Reasoning</h3>
                <p className="text-sm text-slate-400">Thinking level set to "High" for natural sounding, logical speaker scripts.</p>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                <CheckCircle className="w-8 h-8 text-green-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">Studio TTS</h3>
                <p className="text-sm text-slate-400">High-fidelity 24kHz audio using latest neural voice models.</p>
              </div>
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all translate-y-8">
                <Video className="w-8 h-8 text-pink-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">Cinematic FX</h3>
                <p className="text-sm text-slate-400">Dynamic Ken Burns zoom effects and AI-summarized punchy subtitles.</p>
              </div>
            </div>
          </div>
        )}

        {processing.step !== 'idle' && processing.step !== 'complete' && (
          <ProcessingOverlay state={processing} />
        )}

        {processing.step === 'complete' && slides.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center">
                <Video className="mr-3 text-blue-500" /> Final Masterpiece
              </h2>
              <button 
                onClick={() => {
                  setProcessing({ step: 'idle', progress: 0, message: '' });
                  setSlides([]);
                }}
                className="text-slate-400 hover:text-white flex items-center transition-colors"
              >
                Create New <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            
            <PresentationPreview slides={slides} />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                   <FileText className="w-5 h-5 mr-2 text-blue-400" /> Presentation Script
                </h3>
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {slides.map((s, i) => (
                    <div key={i} className="group border-l-2 border-slate-700 pl-4 py-1 hover:border-blue-500 transition-colors">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slide {i+1}</span>
                      <p className="text-slate-300 leading-relaxed mt-1">{s.script}</p>
                      <div className="mt-2 text-xs italic text-blue-400/60 font-medium">Caption: {s.subtitle}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col justify-center items-center text-center space-y-6">
                <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center">
                   <CheckCircle className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold">Production Successful</h3>
                <p className="text-slate-400 leading-relaxed">
                  Your PDF was analyzed using Gemini 3 Pro reasoning. Scripts were vetted for transitions and logic before being sent to the Studio TTS engine.
                </p>
                <div className="w-full pt-6 border-t border-slate-800 flex flex-col space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Model Used</span>
                    <span className="text-slate-200 font-mono">gemini-3-pro-preview</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">TTS Engine</span>
                    <span className="text-slate-200 font-mono">2.5-flash-tts-kore</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Thinking Tokens</span>
                    <span className="text-slate-200 font-mono">12,000+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-slate-800 bg-slate-900/30 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-slate-500 text-sm">
          <p>© 2024 Gemini Presentation Studio. Powered by Google AI Studio.</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-300">Privacy</a>
            <a href="#" className="hover:text-slate-300">Terms</a>
            <a href="#" className="hover:text-slate-300">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
