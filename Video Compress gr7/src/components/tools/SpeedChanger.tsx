import React, { useState, useRef, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, Gauge, Loader2, RefreshCw, Play } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { motion } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

const SPEEDS = [0.25, 0.5, 0.75, 1.25, 1.5, 2.0];

export function SpeedChanger({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [speed, setSpeed] = useState<number>(1.5);
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
    
    ffmpeg.on('progress', ({ progress, time }) => {
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
      // Fallback if unpkg fails, though it's generally reliable.
    }
  };

  const processVideo = async () => {
    if (!file || !isLoaded) return;
    
    setIsProcessing(true);
    setProgress(0);
    setOutputUrl(null);
    
    const ffmpeg = ffmpegRef.current;
    
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      
      const pts = (1 / speed).toFixed(2);
      let atempo = speed.toFixed(2);
      
      // FFmpeg atempo filter only supports 0.5 to 100.
      // If speed < 0.5, we'd need to chain atempo filters, but for simplicity, 
      // we'll just mute or cap at 0.5 for audio, or chain.
      // Let's implement safe simple chaining or just accept standard speeds.
      let command = [];
      if (speed < 0.5) {
        // Just slow down video, drop audio to prevent complex chaining errors for now
        command = ['-i', 'input.mp4', '-filter:v', `setpts=${pts}*PTS`, '-an', 'output.mp4'];
      } else {
        command = [
          '-i', 'input.mp4', 
          '-filter_complex', `[0:v]setpts=${pts}*PTS[v];[0:a]atempo=${atempo}[a]`, 
          '-map', '[v]', '-map', '[a]', 
          'output.mp4'
        ];
      }

      await ffmpeg.exec(command);
      const fileData = await ffmpeg.readFile('output.mp4');
      const data = new Uint8Array(fileData as ArrayBuffer);
      
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      
    } catch (err) {
      console.error("Processing failed", err);
      alert("Failed to process video. Please try a different file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setOutputUrl(null);
    setProgress(0);
  };

  return (
    <ToolWrapper 
      title="Video Speed Changer" 
      description="Speed up or slow down your video. Speeds below 0.5x will mute the audio."
      onBack={onBack}
    >
      {!file ? (
        <FileUploader onFileSelect={setFile} description="Supports MP4, WebM, MOV" />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button 
              onClick={reset}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              disabled={isProcessing}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider block mb-4">
                  Select Speed
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      disabled={isProcessing || !!outputUrl}
                      className={`py-3 rounded-xl border font-medium transition-all ${
                        speed === s 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {!outputUrl ? (
                <button
                  onClick={processVideo}
                  disabled={!isLoaded || isProcessing}
                  className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing {progress}%
                    </>
                  ) : !isLoaded ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading Engine...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Apply Speed Change
                    </>
                  )}
                </button>
              ) : (
                <motion.a
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  href={outputUrl}
                  download={`speed_${speed}x_${file.name}`}
                  className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Download className="w-5 h-5" />
                  Download Processed Video
                </motion.a>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Preview</h3>
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
                {outputUrl ? (
                  <video 
                    src={outputUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
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
