import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, Zap, Loader2, Play, Rocket, CheckCircle2, AlertCircle, Download, Activity 
} from 'lucide-react';
import { analyzeVideosBatch } from './services/vertexService';
import { VideoItem } from './types';

export default function App() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = useMemo(() => {
    if (videos.length === 0) return 0;
    const processed = videos.filter(v => v.status === 'completed' || v.status === 'error').length;
    return Math.round((processed / videos.length) * 100);
  }, [videos]);

  useEffect(() => {
    let url: string | null = null;
    if (selectedIndex !== null && videos[selectedIndex]) {
      url = URL.createObjectURL(videos[selectedIndex].file);
      setActivePreviewUrl(url);
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [selectedIndex, videos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newVideos: VideoItem[] = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      status: 'idle',
      analysis: null
    }));
    setVideos(prev => [...prev, ...newVideos]);
  };

  const processQueue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const pending = videos.filter(v => v.status === 'idle' || v.status === 'error');
    
    for (let i = 0; i < pending.length; i += 10) {
      const chunk = pending.slice(i, i + 10);
      const chunkIds = chunk.map(c => c.id);
      
      setVideos(prev => prev.map(v => chunkIds.includes(v.id) ? { ...v, status: 'analyzing', error: undefined } : v));
      
      const batchData = await Promise.all(chunk.map(async v => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(v.file);
        });
        return { base64, mimeType: v.file.type, fileName: v.file.name };
      }));

      const results = await analyzeVideosBatch(batchData);
      setVideos(prev => prev.map(v => {
        const res = results.find(r => r?.fileName === v.file.name);
        return chunkIds.includes(v.id) ? { 
          ...v, 
          status: res ? 'completed' : 'error', 
          analysis: res || null,
          error: !res ? "Lỗi phân tích AI" : undefined
        } : v;
      }));
    }
    setIsProcessing(false);
  };

  const downloadReport = () => {
    const report = videos
      .filter(v => v.analysis)
      .map(v => v.analysis?.description)
      .join('\n\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis_report.txt';
    a.click();
  };

  const selectedVideo = selectedIndex !== null ? videos[selectedIndex] : null;

  return (
    <div className="h-screen bg-[#020202] text-slate-200 p-6 font-sans flex flex-col overflow-hidden">
      <header className="flex justify-between items-center mb-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl"><Zap className="text-white w-6 h-6" /></div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">VertexLens Flash Pro</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={downloadReport} className="px-4 py-2.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-black flex items-center gap-2">
            <Download size={14} /> TẢI BÁO CÁO
          </button>
          <button onClick={processQueue} disabled={isProcessing} className="px-6 py-2.5 bg-indigo-600 rounded-xl text-[11px] font-black flex items-center gap-2">
            {isProcessing ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Zap size={14} />} BẮT ĐẦU (BATCH 10)
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] font-black">TẢI VIDEO</button>
        </div>
      </header>

      {videos.length > 0 && (
        <div className="mb-6 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
            <span className="flex items-center gap-2"><Activity size={12} /> Tiến độ xử lý</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <main className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
        <div className="col-span-3 bg-white/[0.01] border border-white/5 rounded-[32px] p-4 overflow-y-auto">
          {videos.map((v, i) => (
            <div key={v.id} onClick={() => setSelectedIndex(i)} className={`p-3 rounded-xl cursor-pointer border flex items-center justify-between ${selectedIndex === i ? 'bg-indigo-600/10 border-indigo-500/40' : 'border-white/5'}`}>
              <p className="text-[11px] font-bold truncate">{v.file.name}</p>
              {v.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-500" />}
              {v.status === 'analyzing' && <Loader2 size={14} className="animate-spin text-indigo-400" />}
              {v.status === 'error' && (
                <div className="group relative">
                  <AlertCircle size={14} className="text-red-500" />
                  <div className="absolute right-0 w-48 p-2 bg-red-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {v.error || "Lỗi không xác định"}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="col-span-9 bg-white/[0.01] border border-white/5 rounded-[32px] p-6 overflow-y-auto">
          {selectedVideo ? (
            <div className="space-y-6">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                {activePreviewUrl && <video src={activePreviewUrl} controls className="w-full h-full" />}
              </div>
              {selectedVideo.analysis && (
                <div className="bg-white/[0.03] p-8 rounded-2xl border border-white/5">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-4">Kết quả rà soát</h4>
                  <p className="text-slate-200">{selectedVideo.analysis.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center opacity-20"><Rocket size={48} /></div>
          )}
        </div>
      </main>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" multiple className="hidden" />
    </div>
  );
}