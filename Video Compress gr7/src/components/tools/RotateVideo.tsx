import React, { useState, useRef, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, Loader2, RefreshCw, RotateCw, Settings2 } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { motion } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function RotateVideo({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<90 | 180 | 270>(90);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [elapsed, setElapsed] = useState<number>(0);
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

      // transpose:
      // 0 = 90CounterCLockwise and Vertical Flip (default)
      // 1 = 90Clockwise
      // 2 = 90CounterClockwise
      // 3 = 90Clockwise and Vertical Flip
      
      let filter = '';
      if (rotation === 90) {
        filter = 'transpose=1'; // 90 degrees clockwise
      } else if (rotation === 180) {
        filter = 'transpose=2,transpose=2'; // 180 degrees
      } else if (rotation === 270) {
        filter = 'transpose=2'; // 270 degrees clockwise (or 90 counter-clockwise)
      }

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', filter,
        '-c:a', 'copy',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-threads', '2',
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
    a.download = `rotated_${file?.name || 'video.mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ToolWrapper title="Rotate Video" description="Rotate your video 90, 180, or 270 degrees." onBack={onBack}>
      {!file ? (
        <FileUploader onFileSelect={setFile} description="Supports MP4, WebM, MOV" />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
                <RotateCw className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button onClick={() => { setFile(null); setOutputUrl(null); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {!outputUrl ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
                  {videoUrl && (
                    <video
                      src={videoUrl}
                      className="w-full h-full object-contain transition-transform duration-300"
                      style={{ transform: `rotate(${rotation}deg)` }}
                      controls
                    />
                  )}
                </div>
                <p className="text-xs text-slate-500 text-center">Preview of the rotated video</p>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6 flex flex-col justify-center">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Rotation Angle</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[90, 180, 270].map((angle) => (
                      <button
                        key={angle}
                        onClick={() => setRotation(angle as 90 | 180 | 270)}
                        className={`py-3 rounded-lg font-medium transition-colors ${
                          rotation === angle 
                            ? 'bg-sky-600 text-white' 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {angle}°
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={processVideo}
                    disabled={isProcessing}
                    className="w-full py-4 rounded-xl font-medium bg-sky-600 hover:bg-sky-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />}
                    {isProcessing ? `Processing ${progress}%` : "Rotate Video"}
                  </button>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Rotating video...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-slate-500 font-mono text-xs mt-1 text-center">
                      {elapsed}s elapsed {eta > 0 && `• Estimated Time Remaining: ${Math.floor(eta / 60)}m ${eta % 60}s`}
                    </div>
                  </div>
                )}
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
