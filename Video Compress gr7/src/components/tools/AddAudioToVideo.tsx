import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Music, Loader2, Play, Pause, Plus, Trash, Volume2, VolumeX, ArrowLeft, ZoomIn, ZoomOut, FileVideo, Settings } from 'lucide-react';
import { formatBytes, cn } from '../../lib/utils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { FileUploader } from '../ui/FileUploader';

export interface AudioTrack {
  id: string;
  file: File;
  url: string;
  name: string;
  duration: number;
  offset: number;
  startTime: number;
  endTime: number;
  volume: number;
  muted: boolean;
}

export interface VideoState {
  file: File | null;
  url: string | null;
  duration: number;
  muted: boolean;
  volume: number;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

function Waveform({ url, color }: { url: string, color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const ctxCache = (window as any).__audioCache || ((window as any).__audioCache = {});
    
    const draw = (channelData: Float32Array) => {
      const step = Math.ceil(channelData.length / 1000);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      
      for (let i = 0; i < 1000; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = channelData[(i * step) + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        const y = (1 + min) * canvas.height / 2;
        const h = Math.max(1, (max - min) * canvas.height / 2);
        ctx.fillRect(i * (canvas.width / 1000), y, canvas.width / 1000, h);
      }
    };

    if (ctxCache[url]) {
       draw(ctxCache[url]);
    } else {
       fetch(url)
         .then(res => res.arrayBuffer())
         .then(buf => new AudioContext().decodeAudioData(buf))
         .then(audioBuffer => {
           if (!active) return;
           ctxCache[url] = audioBuffer.getChannelData(0);
           draw(ctxCache[url]);
         })
         .catch(console.error);
    }
      
    return () => { active = false; };
  }, [url, color]);
  
  return <canvas ref={canvasRef} width={1000} height={50} className="w-full h-full opacity-60 pointer-events-none" preserveAspectRatio="none" />;
}

function TrackClip({ track, zoom, updateTrack }: { track: AudioTrack, zoom: number, updateTrack: (id: string, updates: Partial<AudioTrack>) => void }) {
  const handleDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    let startX = e.clientX;
    const startOffset = track.offset;
    
    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dt = dx / zoom;
      let newOffset = startOffset + dt;
      if (newOffset < 0) newOffset = 0;
      updateTrack(track.id, { offset: newOffset });
    };
    
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  
  const handleLeftResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    let startX = e.clientX;
    const startOffset = track.offset;
    const startStartTime = track.startTime;
    
    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dt = dx / zoom;
      
      let newOffset = startOffset + dt;
      let newStartTime = startStartTime + dt;
      
      if (newOffset < 0) {
        newStartTime -= newOffset;
        newOffset = 0;
      }
      if (newStartTime < 0) {
        newOffset -= newStartTime;
        newStartTime = 0;
      }
      if (newStartTime >= track.endTime - 0.1) {
        newStartTime = track.endTime - 0.1;
        newOffset = startOffset + (track.endTime - startStartTime) - 0.1;
      }
      
      updateTrack(track.id, { offset: newOffset, startTime: newStartTime });
    };
    
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  
  const handleRightResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    let startX = e.clientX;
    const startEndTime = track.endTime;
    
    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dt = dx / zoom;
      
      let newEndTime = startEndTime + dt;
      if (newEndTime > track.duration) newEndTime = track.duration;
      if (newEndTime <= track.startTime + 0.1) newEndTime = track.startTime + 0.1;
      
      updateTrack(track.id, { endTime: newEndTime });
    };
    
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div 
      className={cn(
        "absolute top-2 bottom-2 rounded-md flex flex-col justify-center overflow-hidden group shadow-md transition-colors duration-100",
        track.muted ? "bg-slate-700/30 border-slate-600 border" : "bg-indigo-600/30 border border-indigo-500"
      )}
      style={{ left: track.offset * zoom, width: (track.endTime - track.startTime) * zoom }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ 
          position: 'absolute',
          left: `${-(track.startTime / track.duration) * 100}%`,
          width: `${(track.duration / (track.endTime - track.startTime)) * 100}%`,
          height: '100%'
        }}>
          <Waveform url={track.url} color={track.muted ? "#64748b" : "#818cf8"} />
        </div>
      </div>

      <div 
        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/40 bg-black/10 z-10 flex items-center justify-center transition-colors"
        onPointerDown={handleLeftResize}
      >
        <div className="w-0.5 h-4 bg-white/50 rounded-full" />
      </div>
      
      <div 
        className="absolute inset-x-3 top-0 bottom-0 cursor-grab active:cursor-grabbing z-0"
        onPointerDown={handleDrag}
      />

      <div 
        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/40 bg-black/10 z-10 flex items-center justify-center transition-colors"
        onPointerDown={handleRightResize}
      >
        <div className="w-0.5 h-4 bg-white/50 rounded-full" />
      </div>
      
      <span className={cn(
        "absolute bottom-1 left-3 text-[10px] font-semibold text-white truncate pointer-events-none px-1.5 py-0.5 rounded backdrop-blur-sm z-20",
        track.muted ? "bg-black/40 text-slate-400" : "bg-black/60"
      )}>
         {track.name}
      </span>
    </div>
  );
}

export function AddAudioToVideo({ onBack }: { onBack: () => void }) {
  const [videoState, setVideoState] = useState<VideoState>({ file: null, url: null, duration: 0, muted: true, volume: 1 });
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [zoom, setZoom] = useState(50); // px per second
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const ffmpegRef = useRef(new FFmpeg());
  const playheadRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const audioTracksRef = useRef(audioTracks);
  useEffect(() => { audioTracksRef.current = audioTracks; }, [audioTracks]);

  const videoStateRef = useRef(videoState);
  useEffect(() => { videoStateRef.current = videoState; }, [videoState]);

  useEffect(() => {
    loadFFmpeg();
    return () => {
       if (videoStateRef.current.url) URL.revokeObjectURL(videoStateRef.current.url);
       audioTracksRef.current.forEach(t => URL.revokeObjectURL(t.url));
    };
  }, []);

  useEffect(() => {
    let raf: number;
    const sync = () => {
      if (videoRef.current) {
        const vTime = videoRef.current.currentTime;
        
        if (playheadRef.current) {
          playheadRef.current.style.transform = `translateX(${vTime * zoom}px)`;
        }
        
        const vPaused = videoRef.current.paused;
        const vRate = videoRef.current.playbackRate;
        
        if (videoRef.current.volume !== videoStateRef.current.volume) {
           videoRef.current.volume = videoStateRef.current.volume;
        }
        if (videoRef.current.muted !== videoStateRef.current.muted) {
           videoRef.current.muted = videoStateRef.current.muted;
        }

        audioTracksRef.current.forEach(track => {
          const audioEl = audioRefs.current[track.id];
          if (!audioEl) return;
          
          const isActive = vTime >= track.offset && vTime < track.offset + (track.endTime - track.startTime);
          
          if (isActive && !track.muted) {
            const expectedTime = track.startTime + (vTime - track.offset);
            
            if (vPaused) {
              if (!audioEl.paused) audioEl.pause();
            } else {
              if (audioEl.paused) audioEl.play().catch(() => {});
            }
            
            if (Math.abs(audioEl.currentTime - expectedTime) > 0.1) {
              audioEl.currentTime = expectedTime;
            }
            if (audioEl.playbackRate !== vRate) {
               audioEl.playbackRate = vRate;
            }
            if (audioEl.volume !== track.volume) {
               audioEl.volume = track.volume;
            }
          } else {
            if (!audioEl.paused) audioEl.pause();
          }
        });
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [zoom]);

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
      await ffmpeg.load({ coreURL, wasmURL });
      setIsLoaded(true);
    } catch (err) {
      console.error("Error loading FFmpeg:", err);
    }
  };

  const handleVideoSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoState(s => ({ ...s, file, url }));
  };

  const audioInputRef = useRef<HTMLInputElement>(null);
  const handleAddAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
           const newTrack: AudioTrack = {
              id: Math.random().toString(36).substring(7),
              file,
              url,
              name: file.name,
              duration: audio.duration,
              offset: videoRef.current ? videoRef.current.currentTime : 0,
              startTime: 0,
              endTime: audio.duration,
              volume: 1,
              muted: false
           };
           setAudioTracks(prev => [...prev, newTrack]);
        };
        // Reset input to allow adding same file again
        e.target.value = '';
     }
  };

  const updateTrack = useCallback((id: string, updates: Partial<AudioTrack>) => {
    setAudioTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTrack = (id: string) => {
    setAudioTracks(prev => prev.filter(t => t.id !== id));
    delete audioRefs.current[id];
  };

  const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const update = (clientX: number) => {
      let x = clientX - rect.left;
      if (x < 0) x = 0;
      const newTime = x / zoom;
      if (videoRef.current) {
         videoRef.current.currentTime = Math.max(0, Math.min(newTime, videoState.duration));
      }
    };
    
    update(e.clientX);
    
    const onMove = (moveEvent: PointerEvent) => update(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const exportVideo = async () => {
    if (!videoState.file || !isLoaded) return;
    setIsProcessing(true);
    setProgress(0);
    
    const ffmpeg = ffmpegRef.current;
    try {
      await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoState.file));
      for (let i = 0; i < audioTracks.length; i++) {
         await ffmpeg.writeFile(`input_audio_${i}.mp3`, await fetchFile(audioTracks[i].file));
      }
      
      const filterParts: string[] = [];
      const mixInputs: string[] = [];
      
      if (!videoState.muted) {
        filterParts.push(`[0:a]volume=${videoState.volume}[a0]`);
        mixInputs.push('[a0]');
      } else {
        filterParts.push(`anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${videoState.duration}[a0]`);
        mixInputs.push('[a0]');
      }
      
      let trackIdx = 0;
      for (let i = 0; i < audioTracks.length; i++) {
        const track = audioTracks[i];
        if (track.muted) continue;
        trackIdx++;
        const idx = i + 1; 
        const delayMs = Math.round(track.offset * 1000);
        const atrim = `atrim=start=${track.startTime}:end=${track.endTime}`;
        const adelay = `adelay=${delayMs}|${delayMs}`;
        const volume = `volume=${track.volume}`;
        
        filterParts.push(`[${idx}:a]${atrim},asetpts=PTS-STARTPTS,${adelay},${volume}[a${trackIdx}]`);
        mixInputs.push(`[a${trackIdx}]`);
      }
      
      let command = ['-i', 'input_video.mp4'];
      for (let i = 0; i < audioTracks.length; i++) {
        command.push('-i', `input_audio_${i}.mp3`);
      }
      
      if (mixInputs.length > 1) {
        filterParts.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2[aout]`);
        command.push('-filter_complex', filterParts.join(';'));
        command.push('-map', '0:v', '-map', '[aout]');
      } else {
        command.push('-filter_complex', filterParts.join(';'));
        command.push('-map', '0:v', '-map', '[a0]');
      }
      
      command.push('-c:v', 'copy', '-c:a', 'aac', '-shortest', 'output.mp4');
      
      await ffmpeg.exec(command);
      
      const fileData = await ffmpeg.readFile('output.mp4');
      const data = new Uint8Array(fileData as ArrayBuffer);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_video_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const timelineWidth = Math.max(
    videoState.duration, 
    ...audioTracks.map(t => t.offset + (t.endTime - t.startTime))
  ) * zoom + 200;

  const numTicks = Math.ceil(timelineWidth / zoom);
  const ticks = [];
  for (let i = 0; i <= numTicks; i++) {
    if (i % 5 === 0) {
      ticks.push(<div key={i} className="absolute top-0 bottom-0 border-l border-slate-600" style={{ left: i * zoom }}><span className="text-[10px] text-slate-400 absolute left-1 top-1">{formatTime(i)}</span></div>);
    } else {
      ticks.push(<div key={i} className="absolute top-4 bottom-0 border-l border-slate-800" style={{ left: i * zoom }} />);
    }
  }

  if (!videoState.url) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-slate-200 overflow-hidden font-sans">
        <div className="max-w-xl w-full space-y-6">
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 mb-8 transition-colors"><ArrowLeft size={16}/> Back to tools</button>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest rounded-full border border-indigo-500/20">
             <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
             Pro Editor Engine
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">Real-Time Audio Mixer</h1>
          <p className="text-slate-400 mb-8 text-lg">Upload a video to start your non-destructive editing session directly in your browser.</p>
          <FileUploader onFileSelect={handleVideoSelect} accept="video/*" title="Select Video Project" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col font-sans text-slate-200 overflow-hidden">
      <div className="hidden">
        {audioTracks.map(track => (
          <audio 
            key={track.id} 
            src={track.url} 
            ref={el => { if (el) audioRefs.current[track.id] = el; }} 
          />
        ))}
      </div>

      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-white">Audio Mixer</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 shadow-inner">
            <button 
              onClick={() => setVideoState(s => ({...s, muted: true}))} 
              className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-all", videoState.muted ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white")}
            >
              Replace Audio
            </button>
            <button 
              onClick={() => setVideoState(s => ({...s, muted: false}))} 
              className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-all", !videoState.muted ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white")}
            >
              Mix Audio
            </button>
          </div>

          <button
            onClick={exportVideo}
            disabled={!isLoaded || isProcessing || audioTracks.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-slate-200 text-slate-950 rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {progress}%</>
            ) : (
              <><Download className="w-4 h-4" /> Export Video</>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 bg-black">
        <div className="flex-1 relative flex flex-col items-center justify-center p-4 min-h-0 overflow-hidden group">
           <video 
             ref={videoRef} 
             src={videoState.url!} 
             className="max-h-full max-w-full object-contain rounded-xl border border-slate-800 shadow-2xl bg-slate-950" 
             onLoadedMetadata={e => {
               const duration = e.currentTarget.duration;
               setVideoState(s => ({...s, duration}));
             }}
             onPlay={() => setIsPlaying(true)}
             onPause={() => setIsPlaying(false)}
             onClick={togglePlay}
           />
           <button 
             onClick={togglePlay}
             className={cn(
               "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-indigo-600/80 backdrop-blur text-white rounded-full flex items-center justify-center transition-all duration-300 pointer-events-none",
               isPlaying ? "opacity-0 scale-150" : "opacity-100 scale-100"
             )}
           >
             <Play className="w-8 h-8 ml-1" fill="currentColor" />
           </button>
        </div>
        
        <div className="h-72 md:h-80 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
             <div className="flex items-center gap-4">
               <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                 {isPlaying ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-1"/>}
               </button>
               <div className="font-mono text-sm text-slate-300 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
                  {videoRef.current ? formatTime(videoRef.current.currentTime) : "0:00.0"} / {formatTime(videoState.duration)}
               </div>
             </div>
             
             <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <ZoomOut size={16} className="text-slate-500"/>
                 <input type="range" min="10" max="200" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-24 accent-indigo-500" />
                 <ZoomIn size={16} className="text-slate-500"/>
               </div>
               
               <input type="file" accept="audio/*" ref={audioInputRef} onChange={handleAddAudio} className="hidden" />
               <button 
                 onClick={() => audioInputRef.current?.click()}
                 className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-sm font-medium transition-colors border border-slate-700"
               >
                 <Plus size={16}/> Add Audio Track
               </button>
             </div>
          </div>
          
          <div className="flex-1 flex overflow-hidden">
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto hidden-scrollbar z-40 shrink-0">
               <div className="h-8 border-b border-slate-800 bg-slate-950/80 sticky top-0" />
               
               <div className="h-20 flex flex-col justify-center px-4 border-b border-slate-800 bg-slate-900">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2 text-slate-300">
                     <FileVideo size={14} className="text-indigo-400" />
                     <span className="text-xs font-bold">Original Audio</span>
                   </div>
                   <button onClick={() => setVideoState(s => ({...s, muted: !s.muted}))} className={cn("p-1.5 rounded transition-colors", videoState.muted ? "bg-red-500/10 text-red-400" : "bg-slate-800 text-slate-300 hover:text-white")}>
                     {videoState.muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
                   </button>
                 </div>
                 <div className="flex items-center gap-2">
                   <Volume2 size={12} className="text-slate-500 shrink-0" />
                   <input 
                     type="range" min="0" max="1" step="0.05" 
                     value={videoState.volume} 
                     onChange={e => {
                       const volume = Number(e.target.value);
                       setVideoState(s => ({...s, volume}));
                     }} 
                     disabled={videoState.muted}
                     className={cn("w-full accent-indigo-500 h-1 rounded-full appearance-none", videoState.muted ? "opacity-50" : "bg-slate-800")}
                   />
                 </div>
               </div>
               
               {audioTracks.map((track, i) => (
                 <div key={track.id} className="h-20 flex flex-col justify-center px-4 border-b border-slate-800 bg-slate-900 group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-slate-300 min-w-0 pr-2">
                        <Music size={14} className="text-purple-400 shrink-0" />
                        <span className="text-xs font-bold truncate">Track {i+1}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateTrack(track.id, { muted: !track.muted })} className={cn("p-1.5 rounded transition-colors", track.muted ? "bg-red-500/10 text-red-400" : "hover:bg-slate-800 text-slate-400 hover:text-white")}>
                          {track.muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
                        </button>
                        <button onClick={() => deleteTrack(track.id)} className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition-colors">
                          <Trash size={14}/>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 size={12} className="text-slate-500 shrink-0" />
                      <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={track.volume} 
                        onChange={e => updateTrack(track.id, { volume: Number(e.target.value) })} 
                        disabled={track.muted}
                        className={cn("w-full accent-purple-500 h-1 rounded-full appearance-none", track.muted ? "opacity-50" : "bg-slate-800")}
                      />
                    </div>
                 </div>
               ))}
            </div>
            
            <div className="flex-1 overflow-auto relative bg-slate-950" ref={timelineContainerRef}>
               <div 
                 className="relative min-w-full min-h-full" 
                 style={{ width: `${timelineWidth}px` }}
               >
                 <div 
                   className="h-8 border-b border-slate-800 sticky top-0 bg-slate-950/90 backdrop-blur z-30 cursor-pointer hover:bg-slate-900 transition-colors"
                   onPointerDown={handleTimelinePointerDown}
                 >
                    {ticks}
                 </div>
                 
                 <div ref={playheadRef} className="absolute top-0 bottom-0 w-px bg-red-500 z-40 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    <div className="w-3 h-3 bg-red-500 absolute -top-1.5 -left-1.5 rotate-45 rounded-sm" />
                 </div>
                 
                 <div className="h-20 border-b border-slate-800/50 relative bg-slate-950">
                    <div 
                      className={cn(
                        "absolute top-2 bottom-2 rounded-md transition-colors duration-200 border",
                        videoState.muted ? "bg-slate-800/50 border-slate-700" : "bg-indigo-600/20 border-indigo-500/50"
                      )} 
                      style={{ left: 0, width: videoState.duration * zoom }} 
                    >
                      <div className="w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 20px)' }} />
                      <span className="absolute bottom-1 left-2 text-[10px] font-semibold text-slate-400">Main Video</span>
                    </div>
                 </div>
                 
                 {audioTracks.map(track => (
                   <div key={track.id} className="h-20 border-b border-slate-800/50 relative bg-slate-950">
                      <TrackClip track={track} zoom={zoom} updateTrack={updateTrack} />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
