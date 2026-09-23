import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Mic,
  PhoneCall,
  PhoneOff,
  Settings as SettingsIcon,
  Sparkles,
  Layers,
  Sliders,
  CheckCircle2,
  Camera,
  Smartphone,
  Monitor,
  UserCheck,
  Maximize2,
  Minimize2,
  PictureInPicture,
  HelpCircle,
  ShieldCheck,
  Radio,
  Lock,
  Key,
  Clock,
  AlertTriangle,
  Cpu,
  Volume2,
  Activity,
  Headphones,
} from 'lucide-react';
import { RichXCallConfig, ClonedVoiceItem, VideoOrientation } from './types/cloudCall';
import { CloudCallStore } from './services/storage/CloudCallStore';
import { RichXVideoEngine } from './services/video/RichXVideoEngine';
import { AudioCaptureService } from './services/audio/AudioCaptureService';
import { VirtualMicRoutingService } from './services/audio/VirtualMicRoutingService';
import { ElevenLabsEngine } from './services/voiceEngine/ElevenLabsEngine';
import { VoiceCloningSection } from './components/VoiceCloningSection';
import { CloudApiModal } from './components/CloudApiModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import { ProductKeyActivationModal } from './components/ProductKeyActivationModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { LicenseService } from './services/licensing/LicenseService';
import { LicenseKeyItem } from './types/licensing';

export default function App() {
  const [config, setConfig] = useState<RichXCallConfig>(CloudCallStore.getConfig());
  const [voices, setVoices] = useState<ClonedVoiceItem[]>(CloudCallStore.getVoices());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('RICHX CAM Ready for live call');
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Call Type: 'video' (Full Video + Audio) vs 'audio_only' (Live Voice Engine / Microphone only)
  const [callType, setCallType] = useState<'video' | 'audio_only'>('video');

  // Licensing & Admin State
  const [activeLicense, setActiveLicense] = useState<LicenseKeyItem | null>(LicenseService.getActiveClientLicense());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState<boolean>(!LicenseService.getActiveClientLicense());

  // Hardware Device dropdown lists
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [availableOutputs, setAvailableOutputs] = useState<MediaDeviceInfo[]>([]);

  // Video Ref
  const videoDisplayRef = useRef<HTMLVideoElement | null>(null);

  // Call Metrics
  const [durationSec, setDurationSec] = useState(0);
  const [audioInLevel, setAudioInLevel] = useState(0);
  const [audioOutLevel, setAudioOutLevel] = useState(0);

  // Services
  const videoEngineRef = useRef<RichXVideoEngine>(new RichXVideoEngine());
  const audioCaptureRef = useRef<AudioCaptureService>(new AudioCaptureService());
  const audioRoutingRef = useRef<VirtualMicRoutingService>(new VirtualMicRoutingService());
  const voiceEngineRef = useRef<ElevenLabsEngine>(new ElevenLabsEngine());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate Effective Keys and Allowed Modes based on active license
  const effectiveKeys = LicenseService.getEffectiveKeysForLicense(activeLicense);

  // Automatically enforce restrictions if license is restricted
  useEffect(() => {
    if (activeLicense) {
      if (activeLicense.featureMode === 'voice_only') {
        setCallType('audio_only');
      } else if (activeLicense.featureMode === 'video_only' && config.voiceMode === 'cloned_voice') {
        const updated = { ...config, voiceMode: 'natural_mic' as const };
        setConfig(updated);
        CloudCallStore.saveConfig(updated);
      }
    }
  }, [activeLicense]);

  // Keyboard shortcut (Ctrl+Shift+A) for hidden Admin Portal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enumerate hardware devices
  const refreshDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      const mics = devices.filter((d) => d.kind === 'audioinput');
      const outs = devices.filter((d) => d.kind === 'audiooutput');

      setAvailableCameras(cams);
      setAvailableMics(mics);
      setAvailableOutputs(outs);
    } catch (err) {
      console.warn('Could not enumerate hardware media devices', err);
    }
  };

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
    };
  }, []);

  // Duration & License Minute Consumption Meter
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setDurationSec((prev) => prev + 1);

        // Deduct usage via License Engine
        const isCloned = config.voiceMode === 'cloned_voice';
        const deductionResult = LicenseService.deductUsageSecond(1, isCloned);

        // Refresh current license state in HUD
        const currentFresh = LicenseService.getActiveClientLicense();
        if (currentFresh) {
          setActiveLicense({ ...currentFresh });
        }

        // Check if minutes are exhausted and auto-terminate is required
        if (deductionResult.shouldTerminate) {
          handleEndCall();
          setCallStatus('Call ended: Product Key call minutes have expired. Please top up.');
          setIsActivationModalOpen(true);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive, config]);

  const handleStartCall = async () => {
    // 1. Verify License Status
    const license = LicenseService.getActiveClientLicense();
    if (!license) {
      setIsActivationModalOpen(true);
      return;
    }

    if (license.status === 'suspended') {
      alert('This Product Key has been suspended by the administrator.');
      return;
    }

    if (license.status === 'depleted' || (!license.isUnlimited && license.remainingMinutes <= 0)) {
      alert('Your Product Key minutes have expired. Please contact the administrator to add minutes.');
      return;
    }

    // 2. Verify Feature Mode Restrictions
    const keysInfo = LicenseService.getEffectiveKeysForLicense(license);

    if (callType === 'video' && !keysInfo.isVideoAllowed) {
      alert('Your Product Key is restricted to Voice Calls only. Video transformation is not permitted.');
      setCallType('audio_only');
      return;
    }

    if (config.voiceMode === 'cloned_voice' && !keysInfo.isVoiceAllowed) {
      alert('Your Product Key is restricted to Video Only calls with your normal microphone. Cloned voice is locked.');
      const updated = { ...config, voiceMode: 'natural_mic' as const };
      setConfig(updated);
      CloudCallStore.saveConfig(updated);
      return;
    }

    try {
      const isAudioOnly = callType === 'audio_only' || !keysInfo.isVideoAllowed;

      setCallStatus(
        isAudioOnly
          ? 'RICH X CAM LIVE: Initializing Audio-Only Live Call pipeline...'
          : `RICH X CAM LIVE: Initializing ${
              config.videoOrientation === 'portrait' ? 'Portrait (Mobile Phone)' : 'Landscape (Desktop/Webcam)'
            } video & audio sync...`
      );

      // Resolve API keys (prioritizing assigned key, then fallback)
      const effectiveVideoKey = keysInfo.videoKey || config.videoEngineApiKey;
      const effectiveVoiceKey = keysInfo.voiceKey || config.voiceEngineApiKey;

      // 1. Start Video Stream only if NOT audio-only
      if (!isAudioOnly) {
        await videoEngineRef.current.startWebRTCStream(
          effectiveVideoKey,
          config.selectedCameraId,
          config.videoPrompt,
          config.referenceImageUrl,
          config.videoOrientation,
          (stream) => {
            if (videoDisplayRef.current) {
              videoDisplayRef.current.srcObject = stream;
            }
          },
          (status) => setCallStatus(status)
        );
      }

      // 2. Initialize Virtual Routing with chosen output device
      await audioRoutingRef.current.init(
        24000,
        false,
        0.8,
        (lvl) => setAudioOutLevel(lvl),
        config.selectedOutputId
      );

      // 3. Audio Pipeline Execution based on Voice Mode
      if (config.voiceMode === 'cloned_voice' && effectiveVoiceKey) {
        setCallStatus('Connecting RICHX Audio speech-to-speech pipeline...');
        await voiceEngineRef.current.init({
          provider: 'elevenlabs',
          apiKey: effectiveVoiceKey,
          selectedInputDeviceId: config.selectedMicId,
          selectedOutputDeviceId: config.selectedOutputId,
          monitorOutputDeviceId: 'default',
          enableLocalMonitor: false,
          monitorVolume: 0.8,
          sampleRate: 24000,
          chunkSizeMs: 60,
          vadThreshold: 0.02,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          stability: 0.5,
          similarityBoost: 0.8,
          style: 0.15,
          latencyOptimization: 'ultra_low',
          costPerMinute: 0.18,
          sessionSpendingLimit: config.spendingCapUsd,
          maxSessionMinutes: config.maxDurationMinutes,
        });

        await voiceEngineRef.current.startStreamingSession(config.activeVoiceId, (chunk) => {
          setTimeout(() => {
            audioRoutingRef.current.playChunk(chunk);
          }, config.audioLatencyCompensationMs);
        });

        await audioCaptureRef.current.startCapture(
          config.selectedMicId,
          24000,
          0.02,
          (chunk) => {
            voiceEngineRef.current.sendAudioChunk(chunk);
          },
          (lvl) => setAudioInLevel(lvl)
        );
      } else {
        // Natural Microphone Mode with Lip-Sync Delay Buffer
        setCallStatus('Routing natural microphone through RICHX lip-sync buffer...');
        await audioCaptureRef.current.startCapture(
          config.selectedMicId,
          24000,
          0.005,
          (chunk) => {
            setTimeout(() => {
              audioRoutingRef.current.playFloat32Chunk(chunk);
            }, config.audioLatencyCompensationMs);
          },
          (lvl) => {
            setAudioInLevel(lvl);
          }
        );
      }

      setDurationSec(0);
      setIsCallActive(true);
      setCallStatus(
        isAudioOnly
          ? `RICH X Audio Live Active — ${config.voiceMode === 'cloned_voice' ? 'Cloned Voice' : 'Natural Mic'}`
          : `RICH X CAM LIVE Active (${config.videoOrientation === 'portrait' ? 'Portrait Phone' : 'Landscape PC'}) — ${
              config.voiceMode === 'cloned_voice' ? 'Cloned Voice' : 'Natural Mic Synchronized'
            }`
      );
    } catch (err: any) {
      console.error('Call failed', err);
      setCallStatus(`Error: ${err.message || 'Failed to start call'}`);
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    videoEngineRef.current.stopStream();
    audioCaptureRef.current.stopCapture();
    audioRoutingRef.current.stop();
    voiceEngineRef.current.stopStreamingSession();

    if (videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = null;
    }
    setAudioInLevel(0);
    setAudioOutLevel(0);
    setCallStatus('Live call ended.');
  };

  const handleOrientationChange = (orientation: VideoOrientation) => {
    const updated = { ...config, videoOrientation: orientation };
    setConfig(updated);
    CloudCallStore.saveConfig(updated);
    if (isCallActive && callType === 'video') {
      handleStartCall();
    }
  };

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

  const handleUpdatePrompt = (prompt: string) => {
    const updated = { ...config, videoPrompt: prompt };
    setConfig(updated);
    CloudCallStore.saveConfig(updated);
    videoEngineRef.current.updatePrompt(prompt, config.referenceImageUrl);
  };

  const handleVoiceAdded = (voice: ClonedVoiceItem) => {
    CloudCallStore.addVoice(voice);
    setVoices(CloudCallStore.getVoices());
  };

  const handleVoiceDeleted = (id: string) => {
    CloudCallStore.removeVoice(id);
    const updated = CloudCallStore.getVoices();
    setVoices(updated);
    if (config.activeVoiceId === id && updated.length > 0) {
      const nextId = updated[0].providerVoiceId;
      const newCfg = { ...config, activeVoiceId: nextId };
      setConfig(newCfg);
      CloudCallStore.saveConfig(newCfg);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isPortrait = config.videoOrientation === 'portrait';
  const timerConfig = LicenseService.getTimerConfig();
  const isLowMinutes =
    activeLicense &&
    !activeLicense.isUnlimited &&
    activeLicense.remainingMinutes <= timerConfig.warningThresholdMinutes;

  const isVideoLocked = !effectiveKeys.isVideoAllowed;
  const isVoiceCloneLocked = !effectiveKeys.isVoiceAllowed;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">
                RICH X CAM LIVE
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-bold uppercase tracking-wider">
                VIRTUAL ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Universal Studio for WhatsApp, Telegram, WeChat, Discord, Zoom, Teams, Meet & Browsers
            </p>
          </div>
        </div>

        {/* License Minute HUD & Header Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Active License Minutes HUD */}
          {activeLicense ? (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                isLowMinutes
                  ? 'bg-amber-950/70 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-xs'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isLowMinutes ? 'text-amber-400' : 'text-indigo-400'}`} />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate max-w-[130px]">{activeLicense.clientName}:</span>
                <span className="font-bold">
                  {activeLicense.isUnlimited ? (
                    <span className="text-indigo-400">VIP ∞</span>
                  ) : (
                    <span>{activeLicense.remainingMinutes.toFixed(1)} mins</span>
                  )}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                    activeLicense.featureMode === 'video_only'
                      ? 'bg-purple-900/80 text-purple-300'
                      : activeLicense.featureMode === 'voice_only'
                      ? 'bg-sky-900/80 text-sky-300'
                      : 'bg-indigo-900/80 text-indigo-300'
                  }`}
                >
                  {activeLicense.featureMode === 'video_only'
                    ? 'Video Only'
                    : activeLicense.featureMode === 'voice_only'
                    ? 'Voice Only'
                    : 'Full'}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsActivationModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-mono font-semibold flex items-center gap-1.5 animate-pulse"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Unactivated (Enter Key)</span>
            </button>
          )}

          {/* Calling App Integration Guide */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors border border-slate-700 shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Calling Apps Guide</span>
          </button>

          {/* Owner & Admin Portal Button */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 text-xs flex items-center gap-1.5 transition-colors border border-indigo-700/60 shadow-xs"
            title="Owner & Admin Control Panel (or press Ctrl+Shift+A)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline font-medium">Admin Portal</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Video Stage (Left) & Controls (Right) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stage Viewport & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Bar: Call Type Selector (Video + Audio vs Audio-Only) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            {/* Primary Call Type Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {/* Option 1: Video + Audio Call */}
              <button
                type="button"
                disabled={isVideoLocked || isCallActive}
                onClick={() => setCallType('video')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  callType === 'video'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-400'
                }`}
                title={isVideoLocked ? 'Video transformation locked on this license' : 'Full Video Camera + Audio Call'}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video + Audio Call</span>
                {isVideoLocked && <Lock className="w-2.5 h-2.5 text-rose-400" />}
              </button>

              {/* Option 2: Audio-Only Call (Voice Engine / Mic) */}
              <button
                type="button"
                disabled={isCallActive}
                onClick={() => setCallType('audio_only')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  callType === 'audio_only'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Audio-Only Call (Saves GPU/Battery, routes cloned voice or mic to calling apps)"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Audio-Only Call</span>
              </button>
            </div>

            {/* Orientation Mode Switcher (Visible only in Video Mode) */}
            {callType === 'video' && !isVideoLocked && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOrientationChange('landscape')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    !isPortrait
                      ? 'bg-slate-800 text-indigo-300 border border-indigo-700/60'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="16:9 PC / Webcam Widescreen"
                >
                  <Monitor className="w-3 h-3" />
                  <span>16:9 PC</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOrientationChange('portrait')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    isPortrait
                      ? 'bg-slate-800 text-indigo-300 border border-indigo-700/60'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="9:16 Mobile Phone Portrait"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>9:16 Phone</span>
                </button>
              </div>
            )}
          </div>

          {/* Viewport Stage: Video Window or Audio Waveform Stage */}
          <div
            className={`flex justify-center transition-all duration-300 ${
              isTheaterMode
                ? 'fixed inset-0 z-50 bg-black/95 p-4 sm:p-8 flex items-center justify-center'
                : 'bg-slate-950/60 p-2 rounded-2xl border border-slate-900'
            }`}
          >
            <div
              className={`relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center transition-all duration-300 ${
                isTheaterMode
                  ? isPortrait && callType === 'video'
                    ? 'h-[90vh] aspect-[9/16]'
                    : 'w-full max-w-5xl aspect-video'
                  : isPortrait && callType === 'video'
                  ? 'w-full max-w-sm aspect-[9/16]'
                  : 'w-full aspect-video'
              }`}
            >
              {/* VIDEO MODE */}
              {callType === 'video' ? (
                <>
                  <video
                    ref={videoDisplayRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Top Viewport Action Controls (PiP & Theater Mode) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={handlePictureInPicture}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
                      title="Picture in Picture"
                    >
                      <PictureInPicture className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTheaterMode(!isTheaterMode)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors"
                      title={isTheaterMode ? 'Exit Clean Screen' : 'Clean Theater Screen'}
                    >
                      {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Video Idle Placeholder */}
                  {!isCallActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs p-6 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-950/70 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
                        {isPortrait ? <Smartphone className="w-7 h-7" /> : <Video className="w-7 h-7" />}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-white">
                          RICH X CAM LIVE
                        </h3>
                        <p className="text-xs text-slate-400 max-w-xs">
                          {isPortrait
                            ? 'Simulates vertical mobile phone streaming on RICHX CAM.'
                            : 'Simulates widescreen desktop webcam streaming on RICHX CAM.'}
                        </p>
                      </div>
                      <button
                        onClick={handleStartCall}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Start RICH X Video Call</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* AUDIO-ONLY CALL STAGE */
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center space-y-5">
                  <div className="relative">
                    <div
                      className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${
                        isCallActive
                          ? 'bg-sky-600/20 border-2 border-sky-400 shadow-xl shadow-sky-500/20 animate-pulse'
                          : 'bg-slate-800/80 border border-slate-700 text-slate-400'
                      }`}
                    >
                      <Headphones className={`w-10 h-10 ${isCallActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    </div>
                    {isCallActive && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
                    )}
                  </div>

                  <div className="space-y-1.5 max-w-sm">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        {isCallActive ? 'Live Audio Call Active' : 'RICHX Audio-Only Studio'}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800/60 font-semibold">
                        AUDIO ONLY
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {isCallActive
                        ? `Live voice streaming to WhatsApp, Telegram, Zoom, Discord via RICHX MIC endpoint.`
                        : `Make crystal-clear calls without camera usage. Choose cloned voice or your natural mic.`}
                    </p>
                  </div>

                  {/* Animated Waveform Visualizer */}
                  {isCallActive && (
                    <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs">
                      {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 65, 35].map((baseHeight, idx) => {
                        const dynamicMultiplier = Math.max(0.15, (audioInLevel + audioOutLevel) / 100);
                        const calculatedHeight = Math.min(100, Math.max(12, baseHeight * dynamicMultiplier));
                        return (
                          <div
                            key={idx}
                            className="w-1.5 bg-gradient-to-t from-sky-500 to-indigo-400 rounded-full transition-all duration-75"
                            style={{ height: `${calculatedHeight}%` }}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Audio Call Start / End Button */}
                  <div>
                    {!isCallActive ? (
                      <button
                        onClick={handleStartCall}
                        className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-all hover:scale-105"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Start Live Audio Call</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleEndCall}
                        className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>End Live Audio Call</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* In-Call Telemetry Overlay (Timer & Left Minutes) */}
              {isCallActive && (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                    <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] font-mono text-emerald-400 font-semibold">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{callType === 'audio_only' ? 'RICHX LIVE AUDIO' : isPortrait ? 'RICHX 9:16 PHONE' : 'RICHX 16:9 PC'}</span>
                    </div>
                    <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] font-mono text-white">
                      {formatTimer(durationSec)}
                    </div>
                    {activeLicense && !activeLicense.isUnlimited && (
                      <div
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-mono font-semibold ${
                          isLowMinutes
                            ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-bounce'
                            : 'bg-black/70 border-white/10 text-slate-300'
                        }`}
                      >
                        {activeLicense.remainingMinutes.toFixed(1)}m Left
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar: VU Meters & End Call */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between bg-black/75 backdrop-blur-md p-2.5 rounded-xl border border-white/10 z-10">
                    <div className="flex items-center gap-3 flex-1 max-w-[200px]">
                      <div className="flex-1 space-y-0.5">
                        <div className="flex justify-between text-[9px] text-slate-300 font-mono">
                          <span>RICHX MIC</span>
                          <span>{audioInLevel}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-400 transition-all duration-75"
                            style={{ width: `${audioInLevel}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex-1 space-y-0.5">
                        <div className="flex justify-between text-[9px] text-slate-300 font-mono">
                          <span>Output</span>
                          <span>{audioOutLevel}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all duration-75"
                            style={{ width: `${audioOutLevel}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleEndCall}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>End</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Device Selection Bar (Positioned Below Video Window) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 shadow-sm">
            {/* Select Camera Dropdown (Only relevant if callType === 'video') */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Select Physical Webcam</span>
                {callType === 'audio_only' && <span className="text-[10px] text-slate-500">(Disabled in Audio Mode)</span>}
              </label>
              <select
                value={config.selectedCameraId}
                onChange={(e) => {
                  const updated = { ...config, selectedCameraId: e.target.value };
                  setConfig(updated);
                  CloudCallStore.saveConfig(updated);
                }}
                disabled={isCallActive || callType === 'audio_only'}
                className="w-full bg-slate-950 border border-slate-700 disabled:opacity-40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="default">Default Physical Webcam</option>
                {availableCameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Camera (${c.deviceId.slice(0, 6)})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Audio Microphone Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-sky-400" />
                Select Audio Microphone
              </label>
              <select
                value={config.selectedMicId}
                onChange={(e) => {
                  const updated = { ...config, selectedMicId: e.target.value };
                  setConfig(updated);
                  CloudCallStore.saveConfig(updated);
                }}
                disabled={isCallActive}
                className="w-full bg-slate-950 border border-slate-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="default">Default System Microphone</option>
                {availableMics.map((m) => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {m.label || `Microphone (${m.deviceId.slice(0, 6)})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Video Transformation Prompt (Visible when Video Mode is active) */}
          {callType === 'video' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  RICH X CAM Persona & Appearance Prompt
                </span>
                <span className="text-[11px] text-slate-400">Updates live in real time</span>
              </div>
              <input
                type="text"
                value={config.videoPrompt}
                onChange={(e) => handleUpdatePrompt(e.target.value)}
                placeholder="e.g. Sharp cinematic lighting, photorealistic executive studio look..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {/* Audio Lip-Sync Delay Slider */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-400" />
                RICHX Audio Timing Buffer / Lip-Sync
              </span>
              <span className="font-mono text-slate-300 font-semibold">{config.audioLatencyCompensationMs} ms delay</span>
            </div>
            <input
              type="range"
              min="0"
              max="350"
              step="10"
              value={config.audioLatencyCompensationMs}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const updated = { ...config, audioLatencyCompensationMs: val };
                setConfig(updated);
                CloudCallStore.saveConfig(updated);
              }}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Matches mouth movements with what listeners hear in WhatsApp, Telegram, Zoom, or Discord.
            </p>
          </div>
        </div>

        {/* Right Column: Audio Mode Selector, Voice Cloning & Routing (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Audio Source Mode Switcher */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-white">RICHX Audio Mode:</label>
              {isVoiceCloneLocked && (
                <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/60">
                  Voice Clone Locked (Video Only Key)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Option 1: Cloned Cloud Voice */}
              <button
                type="button"
                disabled={isVoiceCloneLocked}
                onClick={() => {
                  const updated = { ...config, voiceMode: 'cloned_voice' as const };
                  setConfig(updated);
                  CloudCallStore.saveConfig(updated);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isVoiceCloneLocked
                    ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800'
                    : config.voiceMode === 'cloned_voice'
                    ? 'bg-indigo-950/70 border-indigo-500 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-xs text-white mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cloned Voice</span>
                  </div>
                  {isVoiceCloneLocked && <Lock className="w-3 h-3 text-rose-400" />}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {isVoiceCloneLocked ? 'Not available on Video-Only plans.' : 'Real-time AI voice transformation.'}
                </div>
              </button>

              {/* Option 2: Own Natural Microphone */}
              <button
                type="button"
                onClick={() => {
                  const updated = { ...config, voiceMode: 'natural_mic' as const };
                  setConfig(updated);
                  CloudCallStore.saveConfig(updated);
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  config.voiceMode === 'natural_mic'
                    ? 'bg-sky-950/70 border-sky-500 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-white mb-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Natural Mic</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Uses physical microphone with synchronized delay buffer.
                </div>
              </button>
            </div>
          </div>

          {/* Voice Upload & Cloning Section (Shown if Cloned Voice is active) */}
          {config.voiceMode === 'cloned_voice' && !isVoiceCloneLocked ? (
            <VoiceCloningSection
              voices={voices}
              activeVoiceId={config.activeVoiceId}
              voiceEngineApiKey={effectiveKeys.voiceKey || config.voiceEngineApiKey}
              onSelectVoice={(id) => {
                const updated = { ...config, activeVoiceId: id };
                setConfig(updated);
                CloudCallStore.saveConfig(updated);
              }}
              onVoiceAdded={handleVoiceAdded}
              onVoiceDeleted={handleVoiceDeleted}
            />
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sky-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Natural Microphone Mode Active</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your microphone audio is captured directly and passed through the RICHX audio alignment buffer to synchronize with the RICHX CAM feed or live call.
              </p>
            </div>
          )}

          {/* Output Device & Calling Apps Setup */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>RICHX CAM Virtual Audio Endpoint</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Calling App Setup Guide</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Routes synchronized audio to WhatsApp, Telegram, Discord, Zoom, Teams, and WeChat:
            </p>

            <select
              value={config.selectedOutputId}
              onChange={(e) => {
                const updated = { ...config, selectedOutputId: e.target.value };
                setConfig(updated);
                CloudCallStore.saveConfig(updated);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="default">RICHX MIC Audio Bridge (Default)</option>
              {availableOutputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Audio Endpoint (${d.deviceId.slice(0, 6)})`}
                </option>
              ))}
            </select>

            <div className="text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2.5 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Inside WhatsApp, Telegram, Zoom, or Discord, select <strong>RICHX CAM</strong> as Camera and <strong>RICHX MIC (or CABLE Output)</strong> as Microphone!
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Product Key Activation Screen */}
      <ProductKeyActivationModal
        isOpen={isActivationModalOpen}
        onActivated={(lic) => {
          setActiveLicense(lic);
          setIsActivationModalOpen(false);
        }}
        onOpenAdmin={() => {
          setIsActivationModalOpen(false);
          setIsAdminOpen(true);
        }}
      />

      {/* Owner & Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          setActiveLicense(LicenseService.getActiveClientLicense());
        }}
        onLicenseChanged={() => {
          setActiveLicense(LicenseService.getActiveClientLicense());
        }}
      />

      {/* Setup Guide Modal */}
      <SetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Fallback Cloud API Modal (for Admin / Power User) */}
      <CloudApiModal
        settings={config}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(newSettings) => {
          const updated = { ...config, ...newSettings };
          setConfig(updated);
          CloudCallStore.saveConfig(updated);
        }}
      />
    </div>
  );
}
