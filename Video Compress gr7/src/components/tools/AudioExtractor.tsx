import React, { useState, useRef, useEffect } from 'react';
import { ToolWrapper } from '../layout/ToolWrapper';
import { FileUploader } from '../ui/FileUploader';
import { Download, FileAudio, Loader2, RefreshCw, Music } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { motion } from 'motion/react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

export function AudioExtractor({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
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

  const extractAudio = async () => {
    if (!file || !isLoaded) return;
    
    setIsProcessing(true);
    setProgress(0);
    setOutputUrl(null);
    
    const ffmpeg = ffmpegRef.current;
    
    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      
      // Extract audio to MP3 format
      await ffmpeg.exec(['-i', 'input.mp4', '-q:a', '0', '-map', 'a', 'output.mp3']);
      
      const fileData = await ffmpeg.readFile('output.mp3');
      const data = new Uint8Array(fileData as ArrayBuffer);
      
      const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      
    } catch (err) {
      console.error("Extraction failed", err);
      alert("Failed to extract audio. The video might not have an audio track.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolWrapper 
      title="Audio Extractor" 
      description="Extract high-quality MP3 audio from any video file instantly."
      onBack={onBack}
    >
      {!file ? (
        <FileUploader onFileSelect={setFile} description="Supports MP4, WebM, MOV, AVI" />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                <FileAudio className="w-5 h-5" />
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

          <div className="flex flex-col items-center justify-center py-10">
            {!outputUrl ? (
              <div className="w-full max-w-sm space-y-6">
                <div className="aspect-square w-48 mx-auto rounded-full bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center p-6 text-center">
                  <Music className="w-12 h-12 text-purple-400 mb-4" />
                  <p className="text-sm text-purple-200/60 font-medium">Ready to extract</p>
                </div>

                <button
                  onClick={extractAudio}
                  disabled={!isLoaded || isProcessing}
                  className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Extracting {progress}%
                    </>
                  ) : !isLoaded ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading Engine...
                    </>
                  ) : (
                    <>
                      <FileAudio className="w-5 h-5" />
                      Extract MP3
                    </>
                  )}
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm space-y-8"
              >
                <div className="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Music className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Extraction Complete</h3>
                  <p className="text-sm text-slate-400 mb-8">Your audio is ready to download.</p>
                  
                  <audio controls src={outputUrl} className="w-full mb-6" />
                  
                  <a
                    href={outputUrl}
                    download={`audio_${file.name.split('.')[0]}.mp3`}
                    className="w-full py-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    <Download className="w-5 h-5" />
                    Download MP3
                  </a>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </ToolWrapper>
  );
}
