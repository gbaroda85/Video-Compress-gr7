import React from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  description?: string;
  title?: string;
}

export function FileUploader({ 
  onFileSelect, 
  accept = "video/*", 
  description = "Drag and drop your video file here",
  title
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden group bg-slate-900/50",
        isDragging 
          ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]" 
          : "border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        accept={accept}
        onChange={handleChange}
      />
      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Upload className={cn("w-8 h-8 transition-colors", isDragging ? "text-indigo-400" : "text-slate-400")} />
      </div>
      <p className="text-lg font-bold text-white mb-2">{title || (accept.includes('audio') ? "Select an audio file" : "Select a video to upload")}</p>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
