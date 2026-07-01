import { LayoutDashboard, FileAudio, Image as ImageIcon, Gauge, Film, Minimize, Scissors, Music, Wand2, Type, RotateCw } from "lucide-react";
import { Tool } from "../types";

export const TOOLS: Tool[] = [
  {
    id: "compress",
    name: "Video Compressor",
    description: "Reduce video size quickly without losing quality.",
    icon: Minimize,
    color: "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white",
  },
  {
    id: "split",
    name: "Split & Trim",
    description: "Cut and split your video into smaller parts precisely.",
    icon: Scissors,
    color: "bg-pink-500/10 text-pink-400 group-hover:bg-pink-500 group-hover:text-white",
  },
  {
    id: "add-audio",
    name: "Add Audio to Video",
    description: "Merge or replace the audio track in your video.",
    icon: Music,
    color: "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white",
  },
  {
    id: "speed",
    name: "Video Speed Changer",
    description: "Speed up or slow down any video online for free.",
    icon: Gauge,
    color: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
  },
  {
    id: "audio",
    name: "Extract Audio",
    description: "Extract high-quality audio track from your video files.",
    icon: FileAudio,
    color: "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
  },
  {
    id: "thumbnail",
    name: "Thumbnail Extractor",
    description: "Capture high-resolution thumbnails from any frame.",
    icon: ImageIcon,
    color: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
  },
  {
    id: "gif",
    name: "Video to GIF",
    description: "Convert video clips into shareable animated GIFs.",
    icon: Film,
    color: "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white",
  },
  {
    id: "add-watermark",
    name: "Add Watermark",
    description: "Add text or image watermark to protect your videos.",
    icon: Type,
    color: "bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
  },
  {
    id: "remove-watermark",
    name: "Remove Watermark",
    description: "Blur or remove watermarks and logos from your videos.",
    icon: Wand2,
    color: "bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-white",
  },
  {
    id: "rotate-video",
    name: "Rotate Video",
    description: "Rotate your video 90, 180, or 270 degrees.",
    icon: RotateCw,
    color: "bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white",
  }
];
