import React, { useState, useRef, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, Scissors, Loader2, RefreshCw, Play, Pause, Settings2, Trash2, Undo2, Info } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

// Utility for UUID
const generateId = () => Math.random().toString(36).substring(2, 9);

type Segment = { id: string; start: number; end: number; deleted: boolean };

export function VideoSplitter({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{width: number, height: number, duration: number} | null>(null);
  
  const [segments, setSegments] = useState<Segment[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);
  const [eta, setEta] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Either 'playhead' or a boundary index (the boundary is between segment i and i+1)
  const [activeHandle, setActiveHandle] = useState<'playhead' | number | null>(null);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setOutputUrl(null);
      setThumbnails([]);
      setSegments([]);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    if (ffmpeg.loaded) {
      setIsLoaded(true);
      return;
    }
    
    try {
      await ffmpeg.load({ coreURL, wasmURL });
      setIsLoaded(true);
    } catch (err) {
      console.error("Error loading FFmpeg:", err);
    }
  };

  const generateThumbnails = async (video: HTMLVideoElement, totalDuration: number) => {
    setIsGeneratingThumbs(true);
    const numThumbs = 10;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const thumbs: string[] = [];
    
    canvas.width = 160;
    canvas.height = 90;
    
    for (let i = 0; i < numThumbs; i++) {
      const time = (totalDuration / numThumbs) * i;
      await new Promise<void>((resolve) => {
        video.currentTime = time;
        const onSeeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
          }
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });
    }
    
    setThumbnails(thumbs);
    setIsGeneratingThumbs(false);
    video.currentTime = 0;
  };

  const handleVideoLoaded = async () => {
    if (videoRef.current) {
      const vidDuration = videoRef.current.duration;
      setDuration(vidDuration);
      setSegments([{ id: generateId(), start: 0, end: vidDuration, deleted: false }]);
      setVideoInfo({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
        duration: vidDuration
      });
      await generateThumbnails(videoRef.current, vidDuration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && activeHandle === null) {
      let time = videoRef.current.currentTime;
      
      const currentSegIndex = segments.findIndex(s => time >= s.start && time <= s.end);
      
      if (currentSegIndex !== -1 && segments[currentSegIndex].deleted) {
        // Skip deleted segment
        const nextSeg = segments.slice(currentSegIndex + 1).find(s => !s.deleted);
        if (nextSeg) {
          videoRef.current.currentTime = nextSeg.start;
          setCurrentTime(nextSeg.start);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
          const firstSeg = segments.find(s => !s.deleted);
          if (firstSeg) {
            videoRef.current.currentTime = firstSeg.start;
            setCurrentTime(firstSeg.start);
          }
        }
      } else {
        setCurrentTime(time);
        
        // Stop if reached end of last non-deleted segment
        const validSegments = segments.filter(s => !s.deleted);
        if (validSegments.length > 0) {
          const lastSeg = validSegments[validSegments.length - 1];
          if (time >= lastSeg.end - 0.05) {
            videoRef.current.pause();
            setIsPlaying(false);
            videoRef.current.currentTime = validSegments[0].start;
            setCurrentTime(validSegments[0].start);
          }
        }
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && file) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, file]);

  const handlePointerDown = (handle: 'playhead' | number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(handle);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (activeHandle === null || !timelineRef.current || duration === 0) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      const newTime = percent * duration;
      
      if (activeHandle === 'playhead') {
        setCurrentTime(newTime);
        if (videoRef.current) videoRef.current.currentTime = newTime;
      } else if (typeof activeHandle === 'number') {
        const i = activeHandle;
        const minTime = segments[i].start + 0.1;
        const maxTime = segments[i+1].end - 0.1;
        const validTime = Math.max(minTime, Math.min(maxTime, newTime));
        
        const newSegments = [...segments];
        newSegments[i].end = validTime;
        newSegments[i+1].start = validTime;
        setSegments(newSegments);
        
        setCurrentTime(validTime);
        if (videoRef.current) videoRef.current.currentTime = validTime;
      }
    };

    const handlePointerUp = () => {
      setActiveHandle(null);
    };

    if (activeHandle !== null) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeHandle, duration, segments]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (activeHandle !== null || !timelineRef.current || duration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(1, percent)) * duration;
    
    setCurrentTime(newTime);
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const splitAtPlayhead = () => {
    const t = currentTime;
    const segIndex = segments.findIndex(s => t > s.start + 0.1 && t < s.end - 0.1);
    if (segIndex !== -1) {
      const seg = segments[segIndex];
      const newSeg1 = { ...seg, id: generateId(), end: t };
      const newSeg2 = { ...seg, id: generateId(), start: t };
      const newSegments = [...segments];
      newSegments.splice(segIndex, 1, newSeg1, newSeg2);
      setSegments(newSegments);
    }
  };

  const currentSegIndex = segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
  const currentSegIsDeleted = currentSegIndex !== -1 ? segments[currentSegIndex].deleted : false;
  const canSplit = currentSegIndex !== -1 && currentTime > segments[currentSegIndex].start + 0.1 && currentTime < segments[currentSegIndex].end - 0.1;

  const toggleCurrentSegment = () => {
    if (currentSegIndex !== -1) {
      const newSegments = [...segments];
      newSegments[currentSegIndex].deleted = !newSegments[currentSegIndex].deleted;
      setSegments(newSegments);
    }
  };

  const validSegments = segments.filter(s => !s.deleted);
  const totalValidDuration = validSegments.reduce((acc, s) => acc + (s.end - s.start), 0);
  const estSize = file && duration > 0 ? (file.size / duration) * totalValidDuration : 0;

  const splitVideo = async () => {
    if (!file || !isLoaded || validSegments.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setEta(0);
    setElapsed(0);
    setOutputUrl(null);
    
    const startTimeMs = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeMs) / 1000));
    }, 1000);

    const ffmpeg = ffmpegRef.current;
    let completedDuration = 0;
    
    const handleProgress = ({ time }: { time: number }) => {
      const timeInSec = time / 1000000;
      const overallProgress = (completedDuration + timeInSec) / totalValidDuration;
      const percent = Math.max(0, Math.min(100, Math.round(overallProgress * 100)));
      setProgress(percent);
      
      const el = (Date.now() - startTimeMs) / 1000;
      if (overallProgress > 0 && overallProgress < 1) {
        setEta(Math.max(0, Math.floor((el / overallProgress) - el)));
      }
    };
    
    ffmpeg.on('progress', handleProgress);
    
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      
      if (validSegments.length === 1) {
        const seg = validSegments[0];
        await ffmpeg.exec([
          '-ss', seg.start.toString(),
          '-t', (seg.end - seg.start).toString(),
          '-i', 'input.mp4',
          '-c', 'copy',
          '-avoid_negative_ts', '1',
          'output.mp4'
        ]);
      } else {
        let concatList = '';
        for (let i = 0; i < validSegments.length; i++) {
          const seg = validSegments[i];
          const filename = `seg${i}.mp4`;
          
          await ffmpeg.exec([
            '-ss', seg.start.toString(),
            '-t', (seg.end - seg.start).toString(),
            '-i', 'input.mp4',
            '-c', 'copy',
            '-avoid_negative_ts', '1',
            filename
          ]);
          
          concatList += `file '${filename}'\n`;
          completedDuration += (seg.end - seg.start);
        }
        
        await ffmpeg.writeFile('concat.txt', concatList);
        
        ffmpeg.off('progress', handleProgress);
        setProgress(95);
        
        await ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat.txt',
          '-c', 'copy',
          'output.mp4'
        ]);
        
        setProgress(100);
      }

      const fileData = await ffmpeg.readFile('output.mp4');
      const data = new Uint8Array(fileData as ArrayBuffer);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      
    } catch (err) {
      console.error("Splitting failed", err);
      alert("Failed to split video. Make sure the file is supported.");
    } finally {
      clearInterval(timer);
      setIsProcessing(false);
      ffmpeg.off('progress', handleProgress);
    }
  };

  const cancelProcessing = () => {
    if (isProcessing) {
      try {
        ffmpegRef.current.terminate();
        ffmpegRef.current = new FFmpeg();
        loadFFmpeg();
        setIsProcessing(false);
        setProgress(0);
      } catch(e) {
        console.error(e);
      }
    }
  };

  const reset = () => {
    setFile(null);
    setOutputUrl(null);
    setProgress(0);
    setCurrentTime(0);
    setSegments([]);
    setThumbnails([]);
  };

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const boundaries = segments.slice(0, -1).map((s, i) => ({
    index: i,
    time: s.end
  }));

  return (
    <ToolWrapper 
      title="Advanced Video Splitter" 
      description="Cut out unwanted parts and merge clips effortlessly. Fast, lossless cutting right in your browser."
      onBack={onBack}
    >
      {!file || !videoUrl ? (
        <FileUploader onFileSelect={setFile} description="Supports MP4, WebM, MOV up to 2GB" />
      ) : (
        <div className="space-y-6">
          {/* Header Info - Fixed layout truncation */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl gap-4">
            <div className="flex items-center gap-4 w-full sm:flex-1 min-w-0">
              <div className="p-3 bg-pink-500/20 text-pink-400 rounded-xl shrink-0">
                <Scissors className="w-6 h-6" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <p className="font-medium truncate block w-full" title={file.name}>{file.name}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  <span>{formatBytes(file.size)}</span>
                  {videoInfo && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-700 shrink-0" />
                      <span>{videoInfo.width}x{videoInfo.height}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-700 shrink-0" />
                      <span>{formatTime(videoInfo.duration)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={reset}
              className="p-3 shrink-0 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              disabled={isProcessing}
              title="Start Over"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video shadow-2xl flex items-center justify-center group">
                <video 
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onLoadedMetadata={handleVideoLoaded}
                  onTimeUpdate={handleTimeUpdate}
                  playsInline
                />
                
                <div 
                  className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity cursor-pointer ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
                  onClick={togglePlay}
                >
                  <button className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all border border-white/20">
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                  </button>
                </div>
              </div>

              {/* Advanced Multi-cut Timeline */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                  <div className="flex gap-4">
                    <span>Segments: <span className="text-white">{validSegments.length}</span></span>
                    <span>Total Output: <span className="text-indigo-400 font-mono">{formatTime(totalValidDuration)}</span></span>
                  </div>
                </div>

                <div 
                  ref={timelineRef}
                  className="relative h-20 bg-slate-950 rounded-xl border border-slate-800 cursor-text select-none overflow-hidden"
                  onClick={handleTimelineClick}
                >
                  {/* Thumbnails Background */}
                  <div className="absolute inset-0 flex h-full opacity-50">
                    {isGeneratingThumbs ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating timeline...
                      </div>
                    ) : (
                      thumbnails.map((thumb, i) => (
                        <img key={i} src={thumb} alt="" className="h-full flex-1 object-cover pointer-events-none" />
                      ))
                    )}
                  </div>

                  {/* Segments Overlay */}
                  {segments.map((seg) => {
                    const left = (seg.start / duration) * 100;
                    const width = ((seg.end - seg.start) / duration) * 100;
                    return (
                      <div
                        key={seg.id}
                        className={`absolute inset-y-0 transition-colors pointer-events-none ${
                          seg.deleted 
                            ? 'bg-red-900/70 border-x border-red-500/50' 
                            : 'bg-indigo-500/20 border-x border-indigo-500/50'
                        }`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        {seg.deleted && (
                           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }} />
                        )}
                      </div>
                    );
                  })}

                  {/* Boundary Handles */}
                  {boundaries.map((b) => (
                    <div 
                      key={`boundary-${b.index}`}
                      className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center z-20 group"
                      style={{ left: `${(b.time / duration) * 100}%` }}
                      onPointerDown={handlePointerDown(b.index)}
                    >
                      <div className="h-full w-0.5 bg-sky-500 group-hover:w-1 transition-all" />
                      <div className="absolute w-3 h-3 bg-sky-500 rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                  ))}

                  {/* Playhead */}
                  <div 
                    className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex flex-col items-center z-30 group"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                    onPointerDown={handlePointerDown('playhead')}
                  >
                    <div className="w-3 h-3 bg-white rounded-full shadow-md scale-75 group-hover:scale-125 transition-transform" />
                    <div className="w-0.5 flex-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 mt-4 justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <button 
                    onClick={togglePlay}
                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5"/> : <Play className="w-5 h-5"/>}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={splitAtPlayhead}
                      disabled={!canSplit}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      <Scissors className="w-4 h-4" /> Split at Playhead
                    </button>
                    
                    <button 
                      onClick={toggleCurrentSegment}
                      disabled={currentSegIndex === -1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors text-sm font-medium disabled:opacity-50 ${
                        currentSegIsDeleted 
                          ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400' 
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                      }`}
                    >
                      {currentSegIsDeleted ? <Undo2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                      {currentSegIsDeleted ? 'Restore Part' : 'Remove Part'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">Click "Split" to slice the video, then remove parts you don't want. The remaining parts will be merged together seamlessly.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-2 text-indigo-400 font-medium mb-2">
                  <Settings2 className="w-5 h-5" />
                  <h3>Export Settings</h3>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Mode</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">Lossless Cut & Merge</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Output Format</span>
                    <span className="text-white font-medium">MP4</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-3">
                    <span className="text-slate-400">Est. File Size</span>
                    <span className="text-white font-medium">
                      {formatBytes(estSize)}
                    </span>
                  </div>
                </div>

                {!outputUrl ? (
                  <div className="space-y-4">
                    <button
                      onClick={splitVideo}
                      disabled={!isLoaded || isProcessing || validSegments.length === 0}
                      className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : !isLoaded ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Scissors className="w-5 h-5" />
                      )}
                      {isProcessing ? "Processing..." : !isLoaded ? "Loading Engine..." : "Export Video"}
                    </button>
                    
                    {isProcessing && (
                      <button 
                        onClick={cancelProcessing}
                        className="w-full py-3 rounded-xl font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors text-sm"
                      >
                        Cancel Export
                      </button>
                    )}
                  </div>
                ) : (
                  <AnimatePresence>
                    <motion.a
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      href={outputUrl}
                      download={`cut_${file.name}`}
                      className="w-full py-4 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Download className="w-5 h-5" />
                      Download Final Video
                    </motion.a>
                  </AnimatePresence>
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Processing...</span>
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
              
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex gap-3 text-sm text-slate-400">
                <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                <p>Advanced cutting creates seamless merges between non-deleted parts without quality loss. All processing happens locally.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolWrapper>
  );
}
