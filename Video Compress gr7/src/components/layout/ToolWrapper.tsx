import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ToolWrapperProps {
  title: string;
  description: string;
  onBack: () => void;
  children: React.ReactNode;
}

export function ToolWrapper({ title, description, onBack, children }: ToolWrapperProps) {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <button 
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors mb-8 group"
      >
        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        Back to tools
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">{title}</h2>
        <p className="text-slate-400 text-lg">{description}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-10 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
