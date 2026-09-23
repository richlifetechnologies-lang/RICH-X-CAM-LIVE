import React, { useRef, useEffect, useState } from 'react';
import {
  Camera,
  Video,
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
} from 'lucide-react';
import { VideoOrientation } from '../types/cloudCall';

interface RichXRealtimeVideoEngineProps {
  selectedCameraId: string;
  onCameraChange: (deviceId: string) => void;
  availableCameras: MediaDeviceInfo[];
  referenceImageUrl: string;
  videoOrientation: VideoOrientation;
  onOrientationChange: (orientation: VideoOrientation) => void;
  isCallActive: boolean;
  onStartCall: () => void;
  onStopCall: () => void;
  callStatus: string;
  videoDisplayRef: React.RefObject<HTMLVideoElement | null>;
  isAllowed: boolean;
  className?: string;
}

export const RichXRealtimeVideoEngine: React.FC<RichXRealtimeVideoEngineProps> = ({
  selectedCameraId,
  onCameraChange,
  availableCameras,
  referenceImageUrl,
  videoOrientation,
  onOrientationChange,
  isCallActive,
  onStartCall,
  onStopCall,
  callStatus,
  videoDisplayRef,
  isAllowed,
  className = '',
}) => {
  const localWebcamRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isMirrorWebcam, setIsMirrorWebcam] = useState<boolean>(true);
  // Privacy-first: camera stays off unless a call is active OR the user
  // explicitly enables the preview toggle below.
  const [isPreviewEnabled, setIsPreviewEnabled] = useState<boolean>(false);

  const isPortrait = videoOrientation === 'portrait';
  const cameraShouldBeOn = isCallActive || isPreviewEnabled;

  // Manage local webcam stream for the separate live camera input window
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
      setCameraError(err.message || 'Camera permission denied or camera in use');
      setHasCameraPermission(false);
    }
  };

  // Manage local webcam stream for the separate live camera input window.
  // The physical camera is ONLY acquired while a call is active or the user
  // explicitly enabled preview — it stays powered off (no getUserMedia) in
  // standby so the webcam light remains off.
  useEffect(() => {
    if (!cameraShouldBeOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (localWebcamRef.current) {
        localWebcamRef.current.srcObject = null;
      }
      return;
    }

    let cancelled = false;
    startLocalWebcam(selectedCameraId).then(() => {
      if (cancelled && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [cameraShouldBeOn, selectedCameraId, videoOrientation]);

  // Ensure the video output element plays when call is active and stream is assigned
  useEffect(() => {
    if (isCallActive && videoDisplayRef.current && videoDisplayRef.current.srcObject) {
      videoDisplayRef.current.play().catch((e) => console.warn('Video play interrupted:', e));
    }
  }, [isCallActive, videoDisplayRef]);

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
      {/* 1. PRIMARY GENERATED VIDEO OUTPUT WINDOW (TOP STAGE)                      */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Generated Video Output
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ({isPortrait ? '9:16 Mobile View' : '16:9 Standard'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCallActive ? (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                STREAMING
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                STANDBY
              </span>
            )}

            <button
              type="button"
              onClick={handlePictureInPicture}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isTheaterMode ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Output Stage Viewport */}
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

          {/* Idle Placeholder when NOT active */}
          {!isCallActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs p-6 text-center space-y-3 z-10">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-900/40">
                <Video className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Video Output Ready</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click <span className="text-purple-300 font-semibold">Start Video Call</span> below to stream the transformed persona output to virtual camera.
                </p>
              </div>

              {referenceImageUrl ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-700/50 text-[11px] text-purple-200">
                  <img
                    src={referenceImageUrl}
                    alt="Target Avatar"
                    className="w-4 h-4 rounded-full object-cover border border-purple-400"
                  />
                  <span>Target Persona Configured</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-700/50 text-[11px] text-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Upload target image below</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Start / Stop Call Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="truncate max-w-[280px]">{callStatus}</span>
          </div>

          <div>
            {!isCallActive ? (
              <button
                type="button"
                onClick={onStartCall}
                disabled={!isAllowed}
                className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
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
                className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 hover:scale-105 cursor-pointer animate-pulse"
              >
                <PhoneOff className="w-4 h-4" />
                <span>STOP VIDEO CALL</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEPARATE LIVE WEBCAM INPUT WINDOW (COMPACT & SEPARATE)                 */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status & Label */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white">Live Webcam Input</h3>
                {isCallActive ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    FEED ACTIVE
                  </span>
                ) : isPreviewEnabled ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    PREVIEW
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700/60 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    STANDBY
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {isCallActive
                  ? 'Compact physical camera monitor &bull; Tracking facial expressions and motion'
                  : isPreviewEnabled
                  ? 'Manual preview is on &bull; Camera turns off automatically when a call starts or you stop the preview'
                  : 'Camera is powered off &bull; Turn it on below to test, or it starts automatically when a call starts'}
              </p>
            </div>
          </div>

          {/* Compact Webcam Viewport & Mini Controls */}
          <div className="flex items-center gap-2 self-center sm:self-auto">
            {/* Small Compact Webcam Viewport Window */}
            <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden border border-purple-500/60 bg-black shadow shrink-0">
              {!cameraShouldBeOn ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-500">
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span className="text-[8px] font-semibold leading-none">Camera Off</span>
                  <button
                    type="button"
                    onClick={() => setIsPreviewEnabled(true)}
                    className="mt-1.5 px-2 py-1 rounded bg-purple-950/80 border border-purple-700/60 text-purple-200 text-[8px] font-semibold hover:bg-purple-900/80 cursor-pointer"
                  >
                    Turn Camera On
                  </button>
                </div>
              ) : cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-slate-950 text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 mb-0.5" />
                  <span className="text-[8px] font-semibold leading-none">Error</span>
                  <button
                    type="button"
                    onClick={() => startLocalWebcam(selectedCameraId)}
                    className="mt-1 px-1.5 py-0.5 rounded bg-slate-800 text-[8px] text-white hover:bg-slate-700"
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
                  <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />
                  {!isCallActive && (
                    <button
                      type="button"
                      onClick={() => setIsPreviewEnabled(false)}
                      className="absolute inset-x-0 bottom-0 py-0.5 bg-slate-950/85 text-slate-300 text-[8px] font-semibold hover:text-white cursor-pointer"
                    >
                      Turn Off
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Quick Actions */}
            {isCallActive && (
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMirrorWebcam(!isMirrorWebcam)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[9px] font-mono transition-colors cursor-pointer text-center"
                  title="Toggle Mirroring"
                >
                  {isMirrorWebcam ? 'Mirrored' : 'Normal'}
                </button>
                <button
                  type="button"
                  onClick={() => startLocalWebcam(selectedCameraId)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  title="Refresh camera feed"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
