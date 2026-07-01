import React, { useState, useRef, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, Minimize, Loader2, RefreshCw, CheckCircle2, Settings2 } from 'lucide-react';
import { formatBytes, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

let globalFFmpeg: FFmpeg | null = null;
let isInitializing = false;
let initPromise: Promise<FFmpeg> | null = null;

const getFFmpeg = async (): Promise<FFmpeg> => {
  if (globalFFmpeg && globalFFmpeg.loaded) {
    return globalFFmpeg;
  }
  if (initPromise) return initPromise;
  
  isInitializing = true;
  initPromise = (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({ coreURL, wasmURL });
    globalFFmpeg = ffmpeg;
    isInitializing = false;
    return ffmpeg;
  })();
  
  return initPromise;
};

type VideoStats = {
  width: number;
  height: number;
  duration: number;
  bitrate: number;
};

type QualityMode = 'high' | 'medium' | 'low' | 'custom';

export function VideoCompressor({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoStats, setVideoStats] = useState<VideoStats | null>(null);
  
  const [quality, setQuality] = useState<QualityMode>('medium');
  const [customSettings, setCustomSettings] = useState({
    resolution: 'original',
    crf: 28,
    bitrate: '',
    fps: 'original',
    audioBitrate: '128k',
    codec: 'libx264',
    preset: 'superfast'
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState(0);
  const [speed, setSpeed] = useState(0);
  
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);

  useEffect(() => {
    getFFmpeg().then(() => setIsLoaded(true)).catch(console.error);
  }, []);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setOutputUrl(null);
    setOutputSize(null);
    setProgress(0);
    
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const duration = video.duration || 1;
      const bitrate = (f.size * 8) / duration;
      setVideoStats({ 
        width: video.videoWidth, 
        height: video.videoHeight, 
        duration, 
        bitrate 
      });
    };
    video.src = URL.createObjectURL(f);
  };

  const getEstimatedSize = () => {
    if (!videoStats || !file) return 0;
    if (quality === 'custom') {
      if (customSettings.bitrate) {
        const vKbps = parseInt(customSettings.bitrate) || 0;
        const aKbps = customSettings.audioBitrate === 'none' ? 0 : parseInt(customSettings.audioBitrate.replace('k','')) || 0;
        return ((vKbps + aKbps) * 1000 * videoStats.duration) / 8;
      }
      const crfFactor = Math.pow(2, (28 - customSettings.crf) / 6);
      return Math.min(file.size * 1.2, file.size * 0.5 * crfFactor);
    }
    
    if (quality === 'high') return file.size * 0.75;
    if (quality === 'medium') return file.size * 0.45;
    if (quality === 'low') return file.size * 0.25;
    return 0;
  };

  const compressVideo = async () => {
    if (!file || !videoStats) return;
    
    setIsProcessing(true);
    setProgress(0);
    setElapsed(0);
    setEta(0);
    setSpeed(0);
    setOutputUrl(null);
    setOutputSize(null);
    
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    try {
      const ffmpeg = await getFFmpeg();
      
      const handleProgress = ({ progress: p, time }: any) => {
        const percent = Math.max(0, Math.min(100, p * 100));
        setProgress(percent);
        
        const el = (Date.now() - startTime) / 1000;
        if (p > 0 && p < 1) {
          const estTotal = el / p;
          setEta(Math.max(0, Math.floor(estTotal - el)));
        }
        if (time && videoStats.duration) {
          const timeSec = time / 1000000;
          if (el > 0) setSpeed(timeSec / el);
        }
      };

      ffmpeg.on('progress', handleProgress);

      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      
      let command: string[] = ['-i', 'input.mp4'];
      
      if (quality === 'custom') {
        command.push('-c:v', customSettings.codec);
        if (customSettings.preset) command.push('-preset', customSettings.preset);
        
        if (customSettings.bitrate) {
          command.push('-b:v', `${customSettings.bitrate}k`);
        } else {
          command.push('-crf', customSettings.crf.toString());
        }
        
        if (customSettings.resolution !== 'original') {
          const h = parseInt(customSettings.resolution);
          if (!isNaN(h)) {
            command.push('-vf', `scale=-2:${h}`);
          }
        }
        
        if (customSettings.fps !== 'original') {
          command.push('-r', customSettings.fps);
        }
        
        if (customSettings.audioBitrate === 'none') {
          command.push('-an');
        } else {
          command.push('-c:a', 'aac', '-b:a', customSettings.audioBitrate);
        }
      } else {
        let targetVBitrate = videoStats.bitrate;
        let scaleFilter = '';
        let crf = '28';
        let preset = 'superfast';
        let aBitrate = '128k';
        
        if (quality === 'low') {
          targetVBitrate *= 0.25;
          crf = '32';
          aBitrate = '64k';
          preset = 'ultrafast';
          if (videoStats.height > 480) {
            scaleFilter = 'scale=-2:480';
          }
        } else if (quality === 'medium') {
          targetVBitrate *= 0.45;
          crf = '28';
          aBitrate = '96k';
          preset = 'ultrafast';
          if (videoStats.height > 720) {
            scaleFilter = 'scale=-2:720';
          }
        } else if (quality === 'high') {
          targetVBitrate *= 0.75;
          crf = '25';
          aBitrate = '128k';
          preset = 'superfast';
          if (videoStats.height > 1080) {
            scaleFilter = 'scale=-2:1080';
          }
        }
        
        if (targetVBitrate > videoStats.bitrate) {
           targetVBitrate = videoStats.bitrate * 0.9;
        }
        
        const vBitrateKbps = Math.floor(targetVBitrate / 1000);
        
        command.push('-c:v', 'libx264');
        command.push('-preset', preset);
        command.push('-maxrate', `${vBitrateKbps}k`);
        command.push('-bufsize', `${vBitrateKbps * 2}k`);
        command.push('-crf', crf);
        command.push('-threads', '2'); // Try using a couple of threads if supported
        
        if (scaleFilter) {
          command.push('-vf', scaleFilter);
        }
        
        command.push('-c:a', 'aac', '-b:a', aBitrate);
      }
      
      command.push('-pix_fmt', 'yuv420p');
      command.push('output.mp4');
      
      await ffmpeg.exec(command);
      ffmpeg.off('progress', handleProgress);
      
      const fileData = await ffmpeg.readFile('output.mp4');
      const data = new Uint8Array(fileData as ArrayBuffer);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
      
    } catch (err: any) {
      console.error("Compression failed", err);
      if (err?.message !== "terminated") {
        alert("Failed to compress video. Please try again.");
      }
    } finally {
      clearInterval(timer);
      setIsProcessing(false);
    }
  };

  const cancelCompression = () => {
    if (globalFFmpeg) {
      globalFFmpeg.terminate();
      globalFFmpeg = null;
      initPromise = null;
      setIsProcessing(false);
      setProgress(0);
      getFFmpeg().then(() => setIsLoaded(true)).catch(console.error); // Re-initialize
    }
  };

  const reset = () => {
    setFile(null);
    setVideoStats(null);
    setOutputUrl(null);
    setProgress(0);
    setOutputSize(null);
  };

  return (
    <ToolWrapper 
      title="Professional Video Compressor" 
      description="High-performance, browser-based video compression optimized for speed and size."
      onBack={onBack}
    >
      {!file ? (
        <FileUploader onFileSelect={handleFileSelect} description="Supports MP4, WebM, MOV" />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                <Minimize className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(file.size)} {videoStats && `• ${videoStats.width}x${videoStats.height}`}
                </p>
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
              <div className={cn("transition-opacity", isProcessing && "opacity-50 pointer-events-none")}>
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider block mb-4">
                  Compression Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'high', label: 'High Quality', desc: 'Preserves nearly original quality' },
                    { id: 'medium', label: 'Balanced', desc: 'Recommended 40-70% reduction' },
                    { id: 'low', label: 'Maximum', desc: 'Smallest file possible' },
                    { id: 'custom', label: 'Custom', desc: 'Advanced manual settings' }
                  ].map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setQuality(q.id as QualityMode)}
                      disabled={isProcessing || !!outputUrl}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        quality === q.id 
                          ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700 disabled:opacity-50'
                      }`}
                    >
                      <div className={`font-medium mb-1 ${quality === q.id ? 'text-white' : 'text-slate-200'}`}>
                        {q.label}
                      </div>
                      <div className={`text-xs ${quality === q.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {q.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {quality === 'custom' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium text-slate-300">
                      <Settings2 className="w-4 h-4" />
                      Custom Engine Settings
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Resolution</label>
                        <select 
                          value={customSettings.resolution}
                          onChange={e => setCustomSettings(s => ({...s, resolution: e.target.value}))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                        >
                          <option value="original">Original</option>
                          <option value="1080">1080p</option>
                          <option value="720">720p</option>
                          <option value="480">480p</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Speed Preset</label>
                        <select 
                          value={customSettings.preset}
                          onChange={e => setCustomSettings(s => ({...s, preset: e.target.value}))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                        >
                          <option value="ultrafast">Ultrafast (Lowest Quality)</option>
                          <option value="superfast">Superfast</option>
                          <option value="veryfast">Veryfast</option>
                          <option value="fast">Fast</option>
                          <option value="medium">Medium (Slowest)</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Video Bitrate (kbps)</label>
                        <input 
                          type="number"
                          placeholder="Auto (or e.g. 2500)"
                          value={customSettings.bitrate}
                          onChange={e => setCustomSettings(s => ({...s, bitrate: e.target.value}))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">CRF ({customSettings.crf})</label>
                        <input 
                          type="range"
                          min="18" max="35"
                          value={customSettings.crf}
                          disabled={!!customSettings.bitrate}
                          onChange={e => setCustomSettings(s => ({...s, crf: parseInt(e.target.value)}))}
                          className="w-full accent-indigo-500 disabled:opacity-50"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">FPS</label>
                        <select 
                          value={customSettings.fps}
                          onChange={e => setCustomSettings(s => ({...s, fps: e.target.value}))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                        >
                          <option value="original">Original</option>
                          <option value="60">60 fps</option>
                          <option value="30">30 fps</option>
                          <option value="24">24 fps</option>
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Audio Bitrate</label>
                        <select 
                          value={customSettings.audioBitrate}
                          onChange={e => setCustomSettings(s => ({...s, audioBitrate: e.target.value}))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                        >
                          <option value="128k">128 kbps (Good)</option>
                          <option value="96k">96 kbps (Medium)</option>
                          <option value="64k">64 kbps (Low)</option>
                          <option value="none">Mute (No Audio)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {videoStats && !isProcessing && !outputUrl && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 mt-4"
                >
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Estimated Output Size:</span>
                    <span className="font-bold text-indigo-400">
                      ~{formatBytes(getEstimatedSize())}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-slate-400">Estimated Reduction:</span>
                    <span className="text-emerald-400">
                      -{Math.max(0, Math.round((1 - getEstimatedSize() / file.size) * 100))}%
                    </span>
                  </div>
                </motion.div>
              )}

              {isProcessing && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      Compressing... {progress.toFixed(0)}%
                    </span>
                    <span className="text-slate-500 font-mono text-xs">
                      {elapsed}s elapsed {eta > 0 && `• Estimated Time Remaining: ${Math.floor(eta / 60)}m ${eta % 60}s`}
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <motion.div 
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${progress}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{speed > 0 ? `${speed.toFixed(1)}x real-time` : 'Calculating speed...'}</span>
                    <button 
                      onClick={cancelCompression}
                      className="text-red-400 hover:text-red-300 transition-colors px-3 py-1 rounded hover:bg-red-500/10 font-sans"
                    >
                      Cancel Compression
                    </button>
                  </div>
                </div>
              )}

              {!outputUrl && !isProcessing && (
                <button
                  onClick={compressVideo}
                  disabled={!isLoaded || isProcessing}
                  className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  {!isLoaded ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading FFmpeg Engine...
                    </>
                  ) : (
                    <>
                      <Minimize className="w-5 h-5" />
                      Start Compression
                    </>
                  )}
                </button>
              )}

              {outputUrl && (
                <motion.a
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  href={outputUrl}
                  download={`compressed_${file.name}`}
                  className="w-full py-4 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-5 h-5" />
                  Download Compressed Video
                </motion.a>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Compression Results</h3>
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-6 shadow-2xl flex flex-col items-center justify-center h-full min-h-[300px]">
                {outputUrl ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center w-full space-y-6"
                  >
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-4">Compression Complete</h4>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg text-sm">
                          <span className="text-slate-400">Original Size</span>
                          <span className="font-mono text-slate-300">{formatBytes(file.size)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-sm">
                          <span className="text-indigo-400 font-medium">New Size</span>
                          <span className="font-mono text-indigo-400 font-bold">{formatBytes(outputSize || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
                          <span className="text-emerald-400 font-medium">Space Saved</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {Math.round((1 - (outputSize || 0) / file.size) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center text-slate-500 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center">
                      <Minimize className="w-8 h-8 opacity-50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400 mb-1">Awaiting Processing</p>
                      <p className="text-xs text-slate-600 max-w-[200px]">
                        Processed video statistics and download link will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolWrapper>
  );
}
