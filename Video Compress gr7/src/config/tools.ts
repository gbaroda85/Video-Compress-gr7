import { LayoutDashboard, FileAudio, Image as ImageIcon, Gauge, Film, Minimize, Scissors, Music, Wand2, Type, RotateCw } from "lucide-react";
import { Tool } from "../types";

export const TOOLS: Tool[] = [
  {
    id: "compress",
    name: "Video Compressor",
    description: "Efficiently reduce video file size while maintaining optimal visual quality. Perfect for meeting strict upload limits and saving storage space securely in your browser.",
    icon: Minimize,
    color: "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white",
  },
  {
    id: "split",
    name: "Video Splitter & Trimmer",
    description: "Precisely cut, trim, and split video files to remove unwanted sections. Streamline your content for social media platforms with our accurate timeline controls.",
    icon: Scissors,
    color: "bg-pink-500/10 text-pink-400 group-hover:bg-pink-500 group-hover:text-white",
  },
  {
    id: "add-audio",
    name: "Add Audio to Video",
    description: "Seamlessly overlay or replace background music and voiceovers. Combine high-quality audio tracks with your existing video content for professional results.",
    icon: Music,
    color: "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white",
  },
  {
    id: "speed",
    name: "Playback Speed Controller",
    description: "Create stunning slow-motion effects or fast-forward timelapses. Adjust video playback speed smoothly without compromising frame integrity.",
    icon: Gauge,
    color: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
  },
  {
    id: "audio",
    name: "Audio Extractor",
    description: "Instantly strip and export high-fidelity audio tracks from video files. Save podcasts, speeches, or background music as standalone MP3 files locally.",
    icon: FileAudio,
    color: "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
  },
  {
    id: "thumbnail",
    name: "Thumbnail Extractor",
    description: "Capture high-resolution, pixel-perfect frames from any timestamp. Generate professional thumbnails optimized for YouTube, Instagram, and web publishing.",
    icon: ImageIcon,
    color: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
  },
  {
    id: "gif",
    name: "Video to GIF Converter",
    description: "Transform video segments into high-quality, lightweight animated GIFs. Ideal for creating engaging email content, memes, and social media reactions.",
    icon: Film,
    color: "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white",
  },
  {
    id: "add-watermark",
    name: "Watermark Protection",
    description: "Secure your intellectual property by applying custom text or image overlays. Easily adjust opacity, positioning, and scale to brand your video content.",
    icon: Type,
    color: "bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
  },
  {
    id: "remove-watermark",
    name: "Watermark Remover",
    description: "Intelligently blur and obscure unwanted logos, timestamps, or text overlays. Clean up your video frames with targeted area-masking technology.",
    icon: Wand2,
    color: "bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-white",
  },
  {
    id: "rotate-video",
    name: "Rotate Video",
    description: "Correct misaligned footage by rotating videos in 90-degree increments. Fix horizontally flipped or upside-down clips recorded on mobile devices effortlessly.",
    icon: RotateCw,
    color: "bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white",
  }
];
