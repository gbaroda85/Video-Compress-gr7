import React, { useState, useRef, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, Film, Loader2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { motion } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

export function VideoToGif({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const ffmpegRef = useRef(new FFmpeg());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    if (ffmpeg.loaded) {
      setIsLoaded(true);
      return;
    }
    
    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    });

    try {
      await ffmpeg.load({
        coreURL,
        wasmURL,
      });
      setIsLoaded(true);
    } catch (err) {
      console.error("Error loading FFmpeg:", err);
    }
  };

  const convertToGif = async () => {
    if (!file || !isLoaded) return;
    
    setIsProcessing(true);
    setProgress(0);
    setOutputUrl(null);
    
    const ffmpeg = ffmpegRef.current;
    
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      
      // High quality GIF generation using palette
      await ffmpeg.exec([
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-i', 'input.mp4',
        '-vf', 'fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        '-loop', '0',
        'output.gif'
      ]);
      
      const fileData = await ffmpeg.readFile('output.gif');
      const data = new Uint8Array(fileData as ArrayBuffer);
      
      const blob = new Blob([data.buffer], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      
    } catch (err) {
      console.error("Conversion failed", err);
      alert("Failed to convert video to GIF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWrapper 
      title="Video to GIF Converter" 
      description="Create high-quality animated GIFs from your video clips."
      onBack={onBack}
    >
      {!file ? (
        <FileUploader onFileSelect={setFile} description="Supports MP4, WebM, MOV" />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button 
              onClick={() => { setFile(null); setOutputUrl(null); }}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              disabled={isProcessing}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider block mb-2">
                    Start Time (s)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.1"
                    value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value))}
                    disabled={isProcessing || !!outputUrl}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider block mb-2">
                    Duration (s)
                  </label>
                  <input 
                    type="number" 
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    disabled={isProcessing || !!outputUrl}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  />
                </div>
                <p className="col-span-2 text-xs text-slate-500">
                  Tip: Keep duration under 10 seconds for the best GIF file size.
                </p>
              </div>

              {!outputUrl ? (
                <button
                  onClick={convertToGif}
                  disabled={!isLoaded || isProcessing}
                  className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Converting {progress}%
                    </>
                  ) : !isLoaded ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading Engine...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      Generate GIF
                    </>
                  )}
                </button>
              ) : (
                <motion.a
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  href={outputUrl}
                  download={`gif_${file.name.split('.')[0]}.gif`}
                  className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Download className="w-5 h-5" />
                  Download GIF
                </motion.a>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Preview</h3>
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
                {outputUrl ? (
                  <img 
                    src={outputUrl}
                    alt="Generated GIF"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video 
                    src={URL.createObjectURL(file)}
                    className="w-full h-full object-contain opacity-50"
                    controls
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolWrapper>
  );
}
