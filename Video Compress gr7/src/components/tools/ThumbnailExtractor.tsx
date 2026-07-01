import React, { useRef, useState, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, Camera, Loader2, RefreshCw } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { motion } from 'motion/react';

export function ThumbnailExtractor({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setThumbnailUrl(null);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const captureFrame = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    
    setTimeout(() => {
      try {
        const video = videoRef.current!;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          setThumbnailUrl(dataUrl);
        }
      } catch (err) {
        console.error("Failed to capture frame", err);
        alert("Failed to capture frame. Some videos (like ones with DRM or cross-origin issues) cannot be captured.");
      } finally {
        setIsCapturing(false);
      }
    }, 300);
  };

  const downloadThumbnail = () => {
    if (!thumbnailUrl) return;
    const a = document.createElement('a');
    a.href = thumbnailUrl;
    a.download = `thumbnail_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ToolWrapper 
      title="Thumbnail Extractor" 
      description="Play the video and pause at the exact moment you want to capture."
      onBack={onBack}
    >
      {!file || !videoUrl ? (
        <FileUploader onFileSelect={setFile} description="Supports MP4, WebM, MOV up to any size" />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button 
              onClick={() => setFile(null)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Upload another video"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">1. Find the frame</h3>
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
                <video 
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  crossOrigin="anonymous"
                />
              </div>
              
              <button
                onClick={captureFrame}
                disabled={isCapturing}
                className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                {isCapturing ? "Capturing..." : "Capture Current Frame"}
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">2. Preview & Download</h3>
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video shadow-2xl flex items-center justify-center">
                {thumbnailUrl ? (
                  <motion.img 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={thumbnailUrl} 
                    alt="Captured thumbnail" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-neutral-500 flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 opacity-50" />
                    <p className="text-sm">Captured frame will appear here</p>
                  </div>
                )}
              </div>

              {thumbnailUrl && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={downloadThumbnail}
                  className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Download className="w-5 h-5" />
                  Download High-Res JPG
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolWrapper>
  );
}
