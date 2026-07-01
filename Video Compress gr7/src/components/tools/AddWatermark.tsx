import React, { useState, useRef, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, Loader2, RefreshCw, Type, Image as ImageIcon, Settings2 } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { motion } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function AddWatermark({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('My Watermark');
  const [textColor, setTextColor] = useState('#ffffff');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [position, setPosition] = useState('bottom-right');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStats, setVideoStats] = useState({ width: 1280, height: 720 });
  const [watermarkSize, setWatermarkSize] = useState<number>(20);
  const [opacity, setOpacity] = useState<number>(100);
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const processVideo = async () => {
    if (!file) return;
    if (watermarkType === 'image' && !imageFile) {
      alert('Please select an image for the watermark.');
      return;
    }
    if (watermarkType === 'text' && !text.trim()) {
      alert('Please enter some text for the watermark.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setEta(0);
    setElapsed(0);
    setOutputUrl(null);
    
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('progress', ({ progress: p, time }) => {
        const percent = Math.max(0, Math.min(100, Math.round(p * 100)));
        setProgress(percent);
        
        const el = (Date.now() - startTime) / 1000;
        if (p > 0 && p < 1) {
          const estTotal = el / p;
          setEta(Math.max(0, Math.floor(estTotal - el)));
        }
      });

      if (!ffmpeg.loaded) {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      await ffmpeg.writeFile('input.mp4', await fetchFile(file));

      let watermarkBlob: Blob | Uint8Array;
      const targetWidth = Math.max(100, videoStats.width * (watermarkSize / 100));

      if (watermarkType === 'text') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');
        
        let fontSize = targetWidth / (text.length * 0.6); // Approximate sizing
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const metrics = ctx.measureText(text);
        
        canvas.width = metrics.width + fontSize; // padding
        canvas.height = fontSize * 2;
        
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.globalAlpha = opacity / 100;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = Math.max(2, fontSize / 10);
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const dataUrl = canvas.toDataURL('image/png');
        watermarkBlob = await fetchFile(dataUrl);
      } else {
        const img = new Image();
        img.src = URL.createObjectURL(imageFile!);
        await new Promise((resolve) => { img.onload = resolve; });
        
        const canvas = document.createElement('canvas');
        const scale = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.globalAlpha = opacity / 100;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        
        const dataUrl = canvas.toDataURL('image/png');
        watermarkBlob = await fetchFile(dataUrl);
      }

      await ffmpeg.writeFile('watermark.png', watermarkBlob);

      let overlayFilter = '';
      const margin = Math.floor(videoStats.width * 0.05); // 5% margin
      switch (position) {
        case 'top-left': overlayFilter = `overlay=${margin}:${margin}`; break;
        case 'top-right': overlayFilter = `overlay=W-w-${margin}:${margin}`; break;
        case 'bottom-left': overlayFilter = `overlay=${margin}:H-h-${margin}`; break;
        case 'bottom-right': overlayFilter = `overlay=W-w-${margin}:H-h-${margin}`; break;
        case 'center': overlayFilter = `overlay=(W-w)/2:(H-h)/2`; break;
        default: overlayFilter = `overlay=W-w-${margin}:H-h-${margin}`;
      }

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-i', 'watermark.png',
        '-filter_complex', overlayFilter,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-threads', '2',
        '-c:a', 'copy',
        'output.mp4'
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
    } catch (err) {
      console.error(err);
      alert('An error occurred during processing.');
    } finally {
      clearInterval(timer);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadVideo = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `watermarked_${file?.name || 'video.mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ToolWrapper title="Add Watermark" description="Add a text or image watermark to protect your videos." onBack={onBack}>
      {!file ? (
        <FileUploader onFileSelect={setFile} description="Supports MP4, WebM, MOV" />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                <Type className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button onClick={() => { setFile(null); setOutputUrl(null); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Upload another video">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {!outputUrl ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
                    {videoUrl && (
                      <video
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        onLoadedMetadata={(e) => setVideoStats({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight })}
                        controls
                      />
                    )}
                    
                    {/* Watermark Preview Overlay */}
                    {videoUrl && (
                      <div className={`absolute pointer-events-none flex justify-center items-center ${
                        position === 'top-left' ? 'top-4 left-4' :
                        position === 'top-right' ? 'top-4 right-4' :
                        position === 'bottom-left' ? 'bottom-4 left-4' :
                        position === 'bottom-right' ? 'bottom-4 right-4' :
                        'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                      }`} style={{ opacity: opacity / 100, width: `${watermarkSize}%` }}>
                        {watermarkType === 'text' ? (
                          <div style={{ color: textColor, textShadow: '0 2px 4px rgba(0,0,0,0.5)', fontSize: `${watermarkSize}px`, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {text || 'Preview'}
                          </div>
                        ) : (
                          imageFile && <img src={URL.createObjectURL(imageFile)} alt="Watermark preview" className="w-full h-auto drop-shadow-md" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 text-center">Preview of the watermark position and scale</p>
                </div>

                <div className="flex flex-col justify-center space-y-6">
                  <button
                    onClick={processVideo}
                    disabled={isProcessing}
                    className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />}
                    {isProcessing ? `Processing ${progress}%` : "Add Watermark"}
                  </button>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-400">
                        <span>Applying watermark...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="text-slate-500 font-mono text-xs mt-1 text-center">
                        {elapsed}s elapsed {eta > 0 && `• Estimated Time Remaining: ${Math.floor(eta / 60)}m ${eta % 60}s`}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6 h-fit">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Watermark Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWatermarkType('text')}
                      className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${watermarkType === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                      <Type className="w-4 h-4" /> Text
                    </button>
                    <button
                      onClick={() => setWatermarkType('image')}
                      className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${watermarkType === 'image' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                      <ImageIcon className="w-4 h-4" /> Image
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Content</label>
                  {watermarkType === 'text' ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Enter watermark text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer bg-slate-950 border border-slate-800"
                        />
                        <span className="text-sm text-slate-400">Color</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Size Scale</label>
                    <span className="text-sm text-slate-400">{watermarkSize}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Opacity</label>
                    <span className="text-sm text-slate-400">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Position</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl">
                <video src={outputUrl} controls className="w-full h-full object-contain" />
              </div>
              <button
                onClick={downloadVideo}
                className="w-full py-4 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-5 h-5" />
                Download Video
              </button>
            </motion.div>
          )}
        </div>
      )}
    </ToolWrapper>
  );
}
