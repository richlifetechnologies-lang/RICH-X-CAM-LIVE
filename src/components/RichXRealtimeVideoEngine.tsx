import React, { useRef, useEffect, useState } from 'react';
import {
  Camera,
  Video,
  Sparkles,
  RefreshCw,
  PhoneCall,
  PhoneOff,
  Maximize2,
  Minimize2,
  PictureInPicture,
  AlertCircle,
  Smartphone,
  Monitor,
  Zap,
  Eye,
  EyeOff,
  Move,
} from 'lucide-react';
import { VideoOrientation } from '../types/cloudCall';
import { AvatarReferenceUploader } from './AvatarReferenceUploader';

interface RichXRealtimeVideoEngineProps {
  selectedCameraId: string;
  onCameraChange: (deviceId: string) => void;
  availableCameras: MediaDeviceInfo[];
  referenceImageUrl: string;
  onImageChange: (url: string) => void;
  videoOrientation: VideoOrientation;
  onOrientationChange: (orientation: VideoOrientation) => void;
  isCallActive: boolean;
  onStartCall: () => void;
  onStopCall: () => void;
  callStatus: string;
  videoDisplayRef: React.RefObject<HTMLVideoElement | null>;
  isAllowed: boolean;
  videoPrompt: string;
  onPromptChange: (prompt: string) => void;
  className?: string;
}

export const RichXRealtimeVideoEngine: React.FC<RichXRealtimeVideoEngineProps> = ({
  selectedCameraId,
  onCameraChange,
  availableCameras,
  referenceImageUrl,
  onImageChange,
  videoOrientation,
  onOrientationChange,
  isCallActive,
  onStartCall,
  onStopCall,
  callStatus,
  videoDisplayRef,
  isAllowed,
  videoPrompt,
  onPromptChange,
  className = '',
}) => {
  const localWebcamRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isMirrorWebcam, setIsMirrorWebcam] = useState<boolean>(true);
  const [showWebcamPip, setShowWebcamPip] = useState<boolean>(true);
  const [pipPosition, setPipPosition] = useState<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'>('bottom-right');

  const isPortrait = videoOrientation === 'portrait';

  // Manage local webcam stream for live driving movement and small PiP view
  const startLocalWebcam = async (deviceId: string) => {
    try {
      setCameraError(null);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
          width: { ideal: isPortrait ? 720 : 1280 },
          height: { ideal: isPortrait ? 1280 : 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      }

      localStreamRef.current = stream;
      if (localWebcamRef.current) {
        localWebcamRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
    } catch (err: any) {
      console.warn('Could not start local webcam preview:', err);
      setCameraError(err.message || 'Camera permission denied');
      setHasCameraPermission(false);
    }
  };

  useEffect(() => {
    startLocalWebcam(selectedCameraId);
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedCameraId, videoOrientation]);

  // Picture in Picture for system window
  const handlePictureInPicture = async () => {
    if (videoDisplayRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoDisplayRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('PiP not available', err);
      }
    }
  };

  // Cycle PiP corner position
  const cyclePipPosition = () => {
    const positions: Array<'bottom-right' | 'top-right' | 'bottom-left' | 'top-left'> = [
      'bottom-right',
      'bottom-left',
      'top-left',
      'top-right',
    ];
    const currentIndex = positions.indexOf(pipPosition);
    setPipPosition(positions[(currentIndex + 1) % positions.length]);
  };

  const getPipPositionClass = () => {
    switch (pipPosition) {
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-14 right-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Engine Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                RICH X Realtime Neural Video Engine
              </h2>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold uppercase">
                30 FPS Realtime
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Webcam movement tracking &bull; Target identity transformation &bull; Low-latency WebRTC output
            </p>
          </div>
        </div>

        {/* Orientation Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => onOrientationChange('landscape')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              !isPortrait
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9 Landscape</span>
          </button>
          <button
            type="button"
            onClick={() => onOrientationChange('portrait')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isPortrait
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 Portrait</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRIMARY VIDEO STAGE (OUTPUT WINDOW AT THE TOP, WITH SMALL WEBCAM PiP)     */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Stage Viewport */}
        <div
          className={`relative bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center transition-all ${
            isTheaterMode
              ? 'fixed inset-0 z-50 bg-black/95 p-6 flex items-center justify-center'
              : isPortrait
              ? 'w-full max-w-sm mx-auto aspect-[9/16]'
              : 'w-full aspect-video'
          }`}
        >
          {/* Main Remote Video Output Element */}
          <video
            ref={videoDisplayRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Top Viewport Floating Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30">
            <button
              type="button"
              onClick={() => setShowWebcamPip(!showWebcamPip)}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer text-[10px] flex items-center gap-1"
              title={showWebcamPip ? 'Hide Webcam PiP' : 'Show Webcam PiP'}
            >
              {showWebcamPip ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showWebcamPip ? 'Hide PiP' : 'Show PiP'}</span>
            </button>
            <button
              type="button"
              onClick={handlePictureInPicture}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
              title="Pop out video (Picture-in-Picture)"
            >
              <PictureInPicture className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
              title={isTheaterMode ? 'Exit Full Screen' : 'Full Screen View'}
            >
              {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Active Call Badge / Status Floating in Viewport */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            {isCallActive ? (
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE STREAMING (30 FPS)
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-950/80 text-slate-300 border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                READY TO CONNECT
              </span>
            )}
          </div>

          {/* ===================================================================== */}
          {/* COMPACT WEBCAM PiP (VERY SMALL LIVE CAMERA INPUT IN CORNER OF OUTPUT) */}
          {/* ===================================================================== */}
          {showWebcamPip && (
            <div
              className={`absolute ${getPipPositionClass()} z-30 transition-all duration-200 group/pip`}
            >
              <div className="relative w-32 sm:w-40 aspect-video rounded-xl overflow-hidden border-2 border-purple-500/80 bg-slate-950 shadow-2xl backdrop-blur-md">
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-slate-950/95 text-rose-400">
                    <AlertCircle className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] leading-tight line-clamp-2">Camera in use or denied</span>
                    <button
                      type="button"
                      onClick={() => startLocalWebcam(selectedCameraId)}
                      className="mt-1 px-1.5 py-0.5 rounded bg-slate-800 text-[8px] text-white"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={localWebcamRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isMirrorWebcam ? 'scale-x-[-1]' : ''}`}
                    />
                    {/* Tiny PiP Label */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[8px] font-mono text-purple-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Webcam PiP</span>
                    </div>

                    {/* PiP Action Buttons (Corner move & Mirror) */}
                    <div className="absolute bottom-1 right-1 flex items-center gap-1 opacity-80 group-hover/pip:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={cyclePipPosition}
                        className="p-1 rounded bg-black/75 hover:bg-black text-white text-[9px] cursor-pointer"
                        title="Move PiP to another corner"
                      >
                        <Move className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMirrorWebcam(!isMirrorWebcam)}
                        className="px-1 py-0.5 rounded bg-black/75 hover:bg-black text-white text-[8px] cursor-pointer font-mono"
                        title="Flip mirror"
                      >
                        Flip
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Idle Placeholder when NOT active */}
          {!isCallActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs p-6 text-center space-y-3 z-20">
              <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-900/40">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">RICH X Realtime Video Engine Ready</h4>
                <p className="text-xs text-slate-400 max-w-md">
                  Click <span className="text-purple-300 font-semibold">Start Video Call</span> to connect your live camera movement and uploaded visual identity into the realtime stream.
                </p>
              </div>

              {referenceImageUrl ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-700/50 text-[11px] text-purple-200">
                  <img
                    src={referenceImageUrl}
                    alt="Target Avatar"
                    className="w-5 h-5 rounded-full object-cover border border-purple-400"
                  />
                  <span>Target Persona Configured</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-700/50 text-[11px] text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Upload a character image below to drive the visual identity</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controller: Start / Stop Call & Camera Device Switcher */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Camera device selection bar */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-medium text-slate-300">Camera:</span>
            </div>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                onCameraChange(e.target.value);
                startLocalWebcam(e.target.value);
              }}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              {availableCameras.length === 0 ? (
                <option value="default">Default System Webcam</option>
              ) : (
                availableCameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId}>
                    {cam.label || `Camera Device ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => startLocalWebcam(selectedCameraId)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Refresh camera stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status & Call Buttons */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate max-w-[200px]">{callStatus}</span>
            </div>

            {!isCallActive ? (
              <button
                type="button"
                onClick={onStartCall}
                disabled={!isAllowed}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                  isAllowed
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 hover:scale-105 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <PhoneCall className="w-4 h-4" />
                <span>START VIDEO CALL</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopCall}
                className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 hover:scale-105 cursor-pointer animate-pulse"
              >
                <PhoneOff className="w-4 h-4" />
                <span>STOP VIDEO CALL</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISUAL IDENTITY / IMAGE UPLOAD INPUT (TARGET PERSONA CHARACTER IMAGE)     */}
      {/* ========================================================================= */}
      <AvatarReferenceUploader
        referenceImageUrl={referenceImageUrl}
        onImageChange={onImageChange}
        onPromptChange={onPromptChange}
        isCallActive={isCallActive}
        selectedCameraId={selectedCameraId}
      />
    </div>
  );
};
