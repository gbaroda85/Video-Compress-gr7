import React, { useState } from 'react';
import { TOOLS } from './config/tools';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Play, Download, ArrowLeft, Upload, Loader2, Music, ImageIcon, FileWarning, PlayCircle, Gauge, Scissors } from 'lucide-react';
import { cn } from './lib/utils';
import { SpeedChanger } from './components/tools/SpeedChanger';
import { AudioExtractor } from './components/tools/AudioExtractor';
import { ThumbnailExtractor } from './components/tools/ThumbnailExtractor';
import { VideoToGif } from './components/tools/VideoToGif';

import { VideoCompressor } from './components/tools/VideoCompressor';
import { VideoSplitter } from './components/tools/VideoSplitter';
import { AddAudioToVideo } from './components/tools/AddAudioToVideo';
import { AddWatermark } from './components/tools/AddWatermark';
import { RemoveWatermark } from './components/tools/RemoveWatermark';
import { RotateVideo } from './components/tools/RotateVideo';

export default function App() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const renderTool = () => {
    switch (activeTool) {
      case 'compress':
        return <VideoCompressor onBack={() => setActiveTool(null)} />;
      case 'split':
        return <VideoSplitter onBack={() => setActiveTool(null)} />;
      case 'add-audio':
        return <AddAudioToVideo onBack={() => setActiveTool(null)} />;
      case 'speed':
        return <SpeedChanger onBack={() => setActiveTool(null)} />;
      case 'audio':
        return <AudioExtractor onBack={() => setActiveTool(null)} />;
      case 'thumbnail':
        return <ThumbnailExtractor onBack={() => setActiveTool(null)} />;
      case 'gif':
        return <VideoToGif onBack={() => setActiveTool(null)} />;
      case 'add-watermark':
        return <AddWatermark onBack={() => setActiveTool(null)} />;
      case 'remove-watermark':
        return <RemoveWatermark onBack={() => setActiveTool(null)} />;
      case 'rotate-video':
        return <RotateVideo onBack={() => setActiveTool(null)} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-x-hidden">
      <header className="flex items-center justify-between px-8 py-4 bg-slate-900/50 border-b border-slate-800 backdrop-blur-xl sticky top-0 z-50">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveTool(null)}
        >
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">VidFlow</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button onClick={() => setActiveTool(null)} className="text-indigo-400">Tools</button>
          <a href="#" className="hover:text-white transition-colors">Templates</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Enterprise</a>
        </nav>
        <div className="flex items-center gap-4">
          <button className="hidden sm:block px-4 py-2 text-sm font-medium hover:text-white transition-colors">Log in</button>
          <button className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold shadow-lg shadow-indigo-500/20 transition-all">Get Started</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12 bg-gradient-to-br from-slate-900 to-indigo-950/30 p-8 lg:p-10 rounded-3xl border border-slate-800 shadow-2xl">
                <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest rounded-full border border-indigo-500/20">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    100% Free & Local Processing
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                    Professional video tools <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">in your browser</span>
                  </h1>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Edit, convert, and process your videos entirely in the browser. 
                    No uploads required, ensuring your media remains private and secure.
                  </p>
                </div>
                <div className="w-full lg:w-1/2 relative">
                  <div className="aspect-video bg-slate-800 rounded-2xl border border-slate-700 shadow-inner flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 z-10">
                      <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 h-1 bg-slate-700 rounded-full z-10">
                      <div className="h-full w-1/3 bg-indigo-500 rounded-full relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TOOLS.map((tool, i) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                  >
                    <button
                      onClick={() => setActiveTool(tool.id)}
                      className="w-full text-left p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-colors cursor-pointer group flex flex-col h-full"
                    >
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors", tool.color)}>
                        <tool.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-white font-bold mb-1">{tool.name}</h3>
                      <p className="text-slate-500 text-sm flex-grow">
                        {tool.description}
                      </p>
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="tool"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              {renderTool()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-8 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 mt-auto gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Server Status: Online</span>
          </div>
          <span className="hidden sm:inline">Engine: WASM v0.12.6</span>
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-300">Privacy</a>
          <a href="#" className="hover:text-slate-300">Terms</a>
          <span>© 2024 VidFlow</span>
        </div>
      </footer>
    </div>
  );
}
