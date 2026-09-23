import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AvatarReferenceUploaderProps {
  referenceImageUrl: string;
  onImageChange: (imageUrl: string) => void;
  onPromptChange?: (prompt: string) => void;
  isCallActive?: boolean;
  selectedCameraId?: string;
  compact?: boolean;
  className?: string;
}

export const AvatarReferenceUploader: React.FC<AvatarReferenceUploaderProps> = ({
  referenceImageUrl,
  onImageChange,
  isCallActive = false,
  className = '',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compress and prepare image data url for ultra-fast low-latency transmission
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800; // Optimal resolution for real-time reference face
        let { width, height } = img;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          onImageChange(compressedDataUrl);
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setIsProcessing(false);
        alert('Could not load the image. Please try another file.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    onImageChange('');
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>Image Upload</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold uppercase">
                Target Persona
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Upload the image to use for the live video output.
            </p>
          </div>
        </div>

        {referenceImageUrl ? (
          <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            READY
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
            NO IMAGE
          </span>
        )}
      </div>

      {/* Upload Zone & Compact Preview */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Compact Image Preview Area */}
        {referenceImageUrl ? (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-purple-500/70 bg-slate-950 shrink-0 shadow-md group">
            <img
              src={referenceImageUrl}
              alt="Uploaded Persona"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded bg-rose-600/90 hover:bg-rose-600 text-white cursor-pointer"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-black/75 px-1 py-0.5 text-center">
              <span className="text-[8px] font-mono text-emerald-300 block truncate">Active</span>
            </div>
          </div>
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/60 flex flex-col items-center justify-center text-slate-500 shrink-0">
            <ImageIcon className="w-5 h-5 text-slate-600" />
            <span className="text-[8px] mt-1 text-slate-500 text-center leading-tight">No Photo</span>
          </div>
        )}

        {/* Small & Compact Drag/Click Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 w-full border-2 border-dashed rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-purple-500 bg-purple-950/20'
              : 'border-slate-700/70 hover:border-purple-500/70 bg-slate-950/40 hover:bg-slate-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processImageFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex items-center gap-2 text-purple-400 mb-1">
            <Upload className="w-4 h-4" />
            <span className="text-xs font-semibold text-white">
              {referenceImageUrl ? 'Replace Uploaded Image' : 'Upload Image'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 max-w-xs leading-tight">
            Click to browse or drop JPG, PNG, WEBP face photo
          </p>

          {isProcessing && (
            <div className="mt-1 text-[10px] text-purple-300 font-mono animate-pulse">
              Processing image...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
