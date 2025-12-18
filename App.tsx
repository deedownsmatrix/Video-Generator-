
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Play, CheckCircle, Loader2, ChevronRight, Video, FileText, UserCircle, Mic, Download, Info, FileDown } from 'lucide-react';
import { PdfService } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { Persona, SlideData, ProcessingState } from './types';
import ProcessingOverlay from './components/ProcessingOverlay';
import PresentationPreview, { PresentationPreviewHandle } from './components/PresentationPreview';

const VOICES = [
  { id: 'Kore', name: 'Kore', gender: 'Female', desc: 'Professional & Clear' },
  { id: 'Puck', name: 'Puck', gender: 'Male', desc: 'Energetic & Narrative' },
  { id: 'Charon', name: 'Charon', gender: 'Male', desc: 'Deep & Authoritative' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', desc: 'Warm & Engaging' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Male', desc: 'Neutral & Strategic' },
];

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [persona, setPersona] = useState<Persona>('CEO');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({
    step: 'idle',
    progress: 0,
    message: ''
  });
  
  const previewRef = useRef<PresentationPreviewHandle>(null);

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

      setProcessing({ step: 'narrating', progress: 50, message: `Generating Studio-Quality Audio...` });
      const enrichedSlides: SlideData[] = [];
      for (let i = 0; i < initialSlides.length; i++) {
        setProcessing(prev => ({ 
          ...prev, 
          progress: 50 + Math.floor((i / initialSlides.length) * 40),
          message: `Narration for slide ${i + 1}...` 
        }));
        const { audioBlob, duration } = await GeminiService.generateAudio(initialSlides[i].script, selectedVoice);
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

  const handleDownloadTranscript = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Transcript_${file?.name.replace('.pdf', '') || 'Export'}_${timestamp}.txt`;
    let content = `TRANSCRIPT EXPORT\nPersona: ${persona}\nVoice: ${selectedVoice}\n\n`;
    slides.forEach(s => {
      content += `[SLIDE ${s.pageNumber}]\nCaption: ${s.subtitle}\nScript: ${s.script}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadVideo = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const videoBlob = await previewRef.current.exportVideo();
      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Presentation_${file?.name.replace('.pdf', '') || 'Video'}.mp4`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Video export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg"><Video className="w-6 h-6 text-white" /></div>
            <h1 className="text-xl font-bold tracking-tight text-white">Gemini Studio</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {processing.step === 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 leading-tight">Notebooks into Masterpieces.</h2>
                <p className="text-xl text-slate-400 max-w-md">Convert PDF decks into narrated video with Gemini 3 Pro.</p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-300">1. Select Persona</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['CEO', 'Scientist', 'Teacher'] as Persona[]).map((p) => (
                      <button key={p} onClick={() => setPersona(p)} className={`py-3 px-4 rounded-xl border text-sm font-medium ${persona === p ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-3 text-slate-300">2. Choose Voice</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {VOICES.map((v) => (
                      <button key={v.id} onClick={() => setSelectedVoice(v.id)} className={`p-3 rounded-xl border text-left ${selectedVoice === v.id ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                        <div className="font-bold text-xs opacity-60 uppercase">{v.gender}</div>
                        <div className="font-bold text-sm">{v.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative group p-8 bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center space-y-4">
                  <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-8 h-8 text-blue-400" />
                  <p className="text-lg font-semibold">{file ? file.name : '3. Drop PDF here'}</p>
                </div>
                <button disabled={!file} onClick={startGeneration} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2"><Play className="w-5 h-5 fill-current" /><span>Generate Video</span></button>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
               {/* Previews cards */}
               <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800"><h3 className="font-bold text-lg">MP4 Export</h3><p className="text-sm text-slate-400 mt-2">Generate real-time video recordings directly in your browser.</p></div>
            </div>
          </div>
        )}

        {processing.step !== 'idle' && processing.step !== 'complete' && <ProcessingOverlay state={processing} />}

        {processing.step === 'complete' && slides.length > 0 && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-3xl font-bold flex items-center"><Video className="mr-3 text-blue-500" /> Production Studio</h2>
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center space-x-3">
                  <button onClick={handleDownloadVideo} disabled={isExporting} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl flex items-center disabled:opacity-50">
                    {isExporting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />} Download MP4
                  </button>
                  <button onClick={handleDownloadTranscript} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl flex items-center">
                    <FileDown className="w-5 h-5 mr-2" /> Transcript
                  </button>
                </div>
                <div className="flex items-center text-[10px] text-slate-500 font-medium italic"><Info className="w-3 h-3 mr-1" /> MP4 recording requires 1 playback pass.</div>
              </div>
            </div>
            
            <PresentationPreview ref={previewRef} slides={slides} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
                <h3 className="text-xl font-bold mb-6 flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-400" /> Script Review</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4">{slides.map((s, i) => (<div key={i} className="border-l-2 border-slate-700 pl-4 py-1"><span className="text-xs font-bold text-slate-500">Slide {i+1}</span><p className="text-slate-300 text-sm mt-1">{s.script}</p></div>))}</div>
              </div>
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col justify-center items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center"><CheckCircle className="w-8 h-8 text-blue-500" /></div>
                <h3 className="text-2xl font-bold">Ready to Export</h3>
                <p className="text-slate-400 text-sm">Download the high-quality MP4 with integrated {selectedVoice} narration.</p>
                <button onClick={() => { setProcessing({ step: 'idle', progress: 0, message: '' }); setSlides([]); }} className="text-blue-400 font-bold hover:underline">Start New Project</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
