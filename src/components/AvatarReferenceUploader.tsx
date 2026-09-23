import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Camera,
  Trash2,
  Sparkles,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  Globe,
  User,
  Sliders,
} from 'lucide-react';

export interface AvatarPreset {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  promptDescription: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'preset_male_exec',
    name: 'Alex Vance',
    role: 'Executive Broadcaster',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=768&q=80',
    promptDescription: 'Professional studio lighting, sharp tailored suit, confident direct eye contact',
  },
  {
    id: 'preset_fem_anchor',
    name: 'Sophia Chen',
    role: 'Studio News Anchor',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=768&q=80',
    promptDescription: 'Broadcast studio background, soft warm key light, crystal-clear 4k detail',
  },
  {
    id: 'preset_tech_lead',
    name: 'Marcus Hayes',
    role: 'Tech Founder & Lead',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=768&q=80',
    promptDescription: 'Modern minimalist studio, natural daylight, executive casual look',
  },
  {
    id: 'preset_fem_director',
    name: 'Elena Rostova',
    role: 'Creative Director',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=768&q=80',
    promptDescription: 'Cinematic portrait, subtle bokeh, high-definition rim lighting',
  },
  {
    id: 'preset_consultant',
    name: 'David Okafor',
    role: 'Global Consultant',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=768&q=80',
    promptDescription: 'Corporate boardroom setting, crisp professional framing, natural warmth',
  },
  {
    id: 'preset_digital_host',
    name: 'Chloe Williams',
    role: 'Digital Media Presenter',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=768&q=80',
    promptDescription: 'Vibrant modern studio, high-end commercial grade clarity, engaging smile',
  },
];

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
  onPromptChange,
  isCallActive = false,
  selectedCameraId = 'default',
  compact = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'camera' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturingCam, setIsCapturingCam] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Helper to resize and compress image to base64 for fast low-latency streaming and localStorage safety
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

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onImageChange(urlInput.trim());
    setUrlInput('');
  };

  // Webcam Snapshot Capture
  const startCameraCapture = async () => {
    setCameraError(null);
    setIsCapturingCam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCameraId && selectedCameraId !== 'default' ? { exact: selectedCameraId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError(err.message || 'Could not access camera for snapshot.');
      setIsCapturingCam(false);
    }
  };

  const stopCameraCapture = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }
    setIsCapturingCam(false);
  };

  const takeCameraSnapshot = () => {
    if (!webcamVideoRef.current) return;
    const video = webcamVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onImageChange(dataUrl);
      stopCameraCapture();
    }
  };

  const handlePresetSelect = (preset: AvatarPreset) => {
    onImageChange(preset.imageUrl);
    if (onPromptChange) {
      onPromptChange(preset.promptDescription);
    }
  };

  const handleClear = () => {
    onImageChange('');
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl ${className}`}>
      {/* Header with RICH X Neural Video Engine Branding */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                RICH X Real-Time Video Engine
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold uppercase tracking-wider">
                Target Avatar
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Upload the target persona face photo that RICH X CAM uses to transform your live camera feed in real time.
            </p>
          </div>
        </div>

        {referenceImageUrl ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-[10px] font-medium text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Target Avatar Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-700/50 text-[10px] font-medium text-amber-300">
            <AlertCircle className="w-3 h-3" />
            <span>Avatar Photo Required</span>
          </div>
        )}
      </div>

      {/* Main Grid: Active Image Card & Selector Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Card: Active Reference Image Display (4 Cols on medium/large) */}
        <div className="md:col-span-4 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex flex-col items-center justify-center min-h-[170px] relative group overflow-hidden">
          {referenceImageUrl ? (
            <div className="w-full flex flex-col items-center space-y-2.5">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-indigo-500/60 shadow-xl group-hover:border-purple-400 transition-all bg-slate-900">
                <img
                  src={referenceImageUrl}
                  alt="Active RICH X Avatar Reference"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-1.5">
                  <span className="text-[9px] font-mono text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    RICH X Ready
                  </span>
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-[10px] font-mono text-slate-300 max-w-[190px] truncate">
                  Active Reference Avatar
                </p>
                {isCallActive && (
                  <p className="text-[9px] text-purple-400 font-semibold flex items-center justify-center gap-1">
                    <Zap className="w-2.5 h-2.5 animate-bounce" />
                    Syncing live to active call
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Photo</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-3 space-y-2 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-slate-400">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-300">No Reference Image</p>
                <p className="text-[10px] text-slate-400 max-w-[160px] leading-tight">
                  Upload a photo or pick a preset on the right to power the video engine.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Upload Options (8 Cols on medium/large) */}
        <div className="md:col-span-8 space-y-3">
          {/* Option Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                stopCameraCapture();
                setActiveTab('upload');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCameraCapture();
                setActiveTab('presets');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Avatar Presets</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                startCameraCapture();
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam Snap</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCameraCapture();
                setActiveTab('url');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD (DRAG & DROP) */}
          {activeTab === 'upload' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-purple-500 bg-purple-950/20'
                  : 'border-slate-700/80 hover:border-purple-500/70 bg-slate-950/40 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processImageFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 mb-2">
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <p className="text-xs font-semibold text-white">
                {isProcessing ? 'Processing & optimizing image...' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                PNG, JPG, WEBP &bull; Auto-optimized for real-time 30FPS streaming
              </p>
            </div>
          )}

          {/* TAB 2: CURATED AVATAR PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = referenceImageUrl === preset.imageUrl;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all p-1 flex flex-col items-center cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-950/50 ring-2 ring-purple-500/50 scale-[1.02]'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
                      }`}
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden relative bg-slate-900">
                        <img
                          src={preset.imageUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-purple-600 rounded-full p-0.5 text-white shadow">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-200 mt-1 truncate w-full text-center">
                        {preset.name.split(' ')[0]}
                      </span>
                      <span className="text-[8px] text-slate-400 truncate w-full text-center leading-none">
                        {preset.role.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Click any persona to immediately configure the reference image and appearance prompt.
              </p>
            </div>
          )}

          {/* TAB 3: WEBCAM SNAPSHOT */}
          {activeTab === 'camera' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
              {cameraError ? (
                <div className="text-center py-4 text-xs text-rose-400 space-y-2">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCameraCapture}
                    className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-700"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-full max-w-xs aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 relative">
                    <video
                      ref={webcamVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={takeCameraSnapshot}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Snapshot</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCameraCapture}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PASTE IMAGE URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/avatar-portrait.jpg (or Cloud Storage URL)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                >
                  Use URL
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Paste any direct image URL (PNG, JPG, WebP) from your cloud storage or CDN.
              </p>
            </form>
          )}

          {/* Engine Technical Note */}
          <div className="bg-purple-950/30 border border-purple-800/30 rounded-lg px-3 py-2 flex items-start gap-2 text-[10px] text-slate-300">
            <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>RICH X Real-Time AI Video Engine:</strong> The neural transformation model maps head position, facial expressions, and mouth movements directly onto this reference avatar in real time.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
