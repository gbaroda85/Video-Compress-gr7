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
import { PrivacyPolicy } from './components/pages/PrivacyPolicy';
import { TermsOfService } from './components/pages/TermsOfService';

type ViewState = 'home' | 'privacy' | 'terms' | string;

export default function App() {
  const [activeView, setActiveView] = useState<ViewState>('home');

  const renderContent = () => {
    if (activeView === 'privacy') {
      return <PrivacyPolicy onBack={() => setActiveView('home')} />;
    }
    if (activeView === 'terms') {
      return <TermsOfService onBack={() => setActiveView('home')} />;
    }

    switch (activeView) {
      case 'compress':
        return <VideoCompressor onBack={() => setActiveView('home')} />;
      case 'split':
        return <VideoSplitter onBack={() => setActiveView('home')} />;
      case 'add-audio':
        return <AddAudioToVideo onBack={() => setActiveView('home')} />;
      case 'speed':
        return <SpeedChanger onBack={() => setActiveView('home')} />;
      case 'audio':
        return <AudioExtractor onBack={() => setActiveView('home')} />;
      case 'thumbnail':
        return <ThumbnailExtractor onBack={() => setActiveView('home')} />;
      case 'gif':
        return <VideoToGif onBack={() => setActiveView('home')} />;
      case 'add-watermark':
        return <AddWatermark onBack={() => setActiveView('home')} />;
      case 'remove-watermark':
        return <RemoveWatermark onBack={() => setActiveView('home')} />;
      case 'rotate-video':
        return <RotateVideo onBack={() => setActiveView('home')} />;
      default:
        return null;
    }
  };

  const activeToolInfo = activeView !== 'home' && activeView !== 'privacy' && activeView !== 'terms' 
    ? TOOLS.find(t => t.id === activeView) 
    : null;

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-950 font-sans text-slate-200 overflow-x-hidden">
      <header className="flex items-center justify-between px-8 py-4 bg-slate-900/50 border-b border-slate-800 backdrop-blur-xl sticky top-0 z-50">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setActiveView('home')}
        >
          <div className="w-11 h-11 bg-[#f8f9fa] rounded-[14px] flex items-center justify-center font-sans font-bold shrink-0 shadow-sm border border-slate-200 select-none overflow-hidden">
            <div className="flex items-baseline justify-center pl-1">
              <span className="text-[#115b68] text-[20px] tracking-tight leading-none">GR</span>
              <span className="text-[#e73b42] text-[26px] leading-[0.8] -ml-[3px] translate-y-[2px]">7</span>
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            VidFlow
            <span className="text-[10px] tracking-widest text-indigo-400 font-orbitron uppercase border border-indigo-500/30 px-1.5 py-0.5 rounded bg-indigo-500/10">Tools</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button onClick={() => setActiveView('home')} className="text-indigo-400 hover:text-indigo-300 transition-colors">Tools</button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeView === 'home' ? (
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
                      onClick={() => setActiveView(tool.id)}
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
              key="content"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex-1 w-full flex flex-col gap-8"
            >
              {renderContent()}
              
              {activeToolInfo && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-5xl mx-auto w-full space-y-8 shadow-xl mb-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-6 border-b border-slate-800 pb-6">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0", activeToolInfo.color)}>
                      <activeToolInfo.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">How to use {activeToolInfo.name}</h2>
                      <p className="text-slate-400 mt-1.5">{activeToolInfo.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 text-slate-300 max-w-4xl">
                    <h3 className="text-lg font-semibold text-white">Step-by-step Guide</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0 border border-slate-700">1</div>
                        <div>
                          <h4 className="font-medium text-slate-200 mb-1">Select your video</h4>
                          <p className="text-sm text-slate-400">Click the upload area or drag and drop your video file into the designated zone.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0 border border-slate-700">2</div>
                        <div>
                          <h4 className="font-medium text-slate-200 mb-1">Adjust the settings</h4>
                          <p className="text-sm text-slate-400">Use the intuitive controls to configure the {activeToolInfo.name.toLowerCase()} according to your needs.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0 border border-slate-700">3</div>
                        <div>
                          <h4 className="font-medium text-slate-200 mb-1">Process locally</h4>
                          <p className="text-sm text-slate-400">Click the primary action button to start processing. Everything happens securely within your browser.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0 border border-slate-700">4</div>
                        <div>
                          <h4 className="font-medium text-slate-200 mb-1">Save the result</h4>
                          <p className="text-sm text-slate-400">Once processing is complete, download the final output directly to your device.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <p className="text-sm text-indigo-300 flex gap-3 items-start leading-relaxed">
                        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span><strong className="text-indigo-200">Privacy Note:</strong> Your files never leave your device. All processing is powered by WebAssembly directly in your browser, ensuring complete privacy and fast processing times regardless of your internet connection speed.</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-8 py-6 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 mt-auto gap-4">
        <div>
          <span>© {new Date().getFullYear()} VidFlow. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="mailto:gr7imagepdf@gmail.com" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Support: gr7imagepdf@gmail.com
          </a>
          <div className="hidden md:block w-px h-4 bg-slate-800"></div>
          <button onClick={() => setActiveView('privacy')} className="hover:text-slate-300 transition-colors">Privacy Policy</button>
          <button onClick={() => setActiveView('terms')} className="hover:text-slate-300 transition-colors">Terms of Service</button>
        </div>
      </footer>
    </div>
  );
}
