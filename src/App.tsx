import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Mic,
  PhoneCall,
  PhoneOff,
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
  Radio,
  Lock,
  Clock,
  Headphones,
  Volume2,
  Activity,
  Check,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Info,
  Zap,
  DollarSign,
  TrendingUp,
  Square,
} from 'lucide-react';
import {
  RichXCallConfig,
  ClonedVoiceItem,
  VideoOrientation,
  StudioCallMode,
  LipSyncMetrics,
} from './types/cloudCall';
import { CloudCallStore } from './services/storage/CloudCallStore';
import { RichXVideoEngine } from './services/video/RichXVideoEngine';
import { AudioCaptureService } from './services/audio/AudioCaptureService';
import { VirtualMicRoutingService } from './services/audio/VirtualMicRoutingService';
import { ElevenLabsEngine } from './services/voiceEngine/ElevenLabsEngine';
import { VoiceCloningSection } from './components/VoiceCloningSection';
import { LipSyncVisualizer } from './components/LipSyncVisualizer';
import { CloudApiModal } from './components/CloudApiModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import { ProductKeyActivationModal } from './components/ProductKeyActivationModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AvatarReferenceUploader } from './components/AvatarReferenceUploader';
import { RichXRealtimeVideoEngine } from './components/RichXRealtimeVideoEngine';
import { LicenseService } from './services/licensing/LicenseService';
import { LicenseKeyItem, SessionFinancials } from './types/licensing';
import { BillingRateEngine } from './services/billing/BillingRateEngine';

interface StopServiceButtonProps {
  isCallActive: boolean;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  subtext?: string;
}

const StopServiceButton: React.FC<StopServiceButtonProps> = ({
  isCallActive,
  onStop,
  disabled = false,
  className = '',
  label = 'STOP SERVICE',
  subtext,
}) => {
  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={onStop}
        disabled={disabled}
        aria-label="Stop active service and timer"
        className={`w-full py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all shadow-lg ${
          disabled
            ? 'bg-slate-900 border border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
            : isCallActive
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-600/40 ring-2 ring-red-500/50 hover:scale-[1.01] active:scale-[0.99] cursor-pointer animate-pulse'
            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-rose-500/50 cursor-pointer'
        }`}
      >
        <Square className={`w-4 h-4 fill-current ${isCallActive ? 'text-white' : 'text-rose-400'}`} />
        <span>{label}</span>
        {isCallActive && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/20 text-white font-normal lowercase tracking-normal">
            active &bull; click to stop
          </span>
        )}
      </button>
      {isCallActive && (
        <p className="text-[10px] text-center text-rose-400 font-medium mt-1.5 flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
          {subtext || 'Immediately halts media streams, active API sessions, and stops wallet timer.'}
        </p>
      )}
    </div>
  );
};

export default function App() {
  const [config, setConfig] = useState<RichXCallConfig>(CloudCallStore.getConfig());
  const [voices, setVoices] = useState<ClonedVoiceItem[]>(CloudCallStore.getVoices());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('RICHX CAM Ready for live call');
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // 3 Distinct Call Modes:
  // 1. 'video_audio': Video Call + Audio Call (Video + Natural Voice or Cloned Voice with upload)
  // 2. 'audio_only': Audio Calls Only (Voice-only studio, no camera interface)
  // 3. 'video_only': Video Calls Only (Video-call only, uses natural mic by default with mic selector, optional cloning)
  const [callMode, setCallMode] = useState<StudioCallMode>(config.callMode || 'video_audio');

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

  // Call Metrics & Lip Sync Telemetry
  const [durationSec, setDurationSec] = useState(0);
  const [audioInLevel, setAudioInLevel] = useState(0);
  const [audioOutLevel, setAudioOutLevel] = useState(0);
  const [lipSyncMetrics, setLipSyncMetrics] = useState<LipSyncMetrics | null>(null);
  const [sessionFinancials, setSessionFinancials] = useState<SessionFinancials | null>(null);

  // Services
  const videoEngineRef = useRef<RichXVideoEngine>(new RichXVideoEngine());
  const audioCaptureRef = useRef<AudioCaptureService>(new AudioCaptureService());
  const audioRoutingRef = useRef<VirtualMicRoutingService>(new VirtualMicRoutingService());
  const voiceEngineRef = useRef<ElevenLabsEngine>(new ElevenLabsEngine());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpeakingRef = useRef<boolean>(false);

  // Calculate Effective Keys and Allowed Modes based on active license
  const effectiveKeys = LicenseService.getEffectiveKeysForLicense(activeLicense);

  // Automatically select assigned tab when active license is loaded or changed
  useEffect(() => {
    if (activeLicense) {
      const assigned = LicenseService.getAssignedStudioMode(activeLicense.featureMode);
      if (assigned !== 'all' && !isCallActive) {
        setCallMode(assigned);
        const updated = { ...config, callMode: assigned };
        setConfig(updated);
        CloudCallStore.saveConfig(updated);
      }
    }
  }, [activeLicense?.key, activeLicense?.featureMode]);

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
        setDurationSec((prev) => {
          const nextSec = prev + 1;

          // Deduct usage via License Engine with Verified API Cost Tracking
          const isCloned =
            callMode === 'video_only'
              ? Boolean(config.videoOnlyEnableVoiceCloning)
              : config.voiceMode === 'cloned_voice';

          const deductionResult = LicenseService.deductUsageSecond(1, isCloned, callMode);
          
          // Compute real-time session financials
          const financials = BillingRateEngine.calculateSessionFinancials(nextSec, callMode, isCloned);
          setSessionFinancials(financials);

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

          return nextSec;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive, config, callMode]);

  // Tab switching handler
  const handleSwitchTab = (newMode: StudioCallMode) => {
    if (isCallActive) {
      handleEndCall();
    }
    setCallMode(newMode);
    const updated = { ...config, callMode: newMode };
    if (newMode === 'video_only') {
      // Respect user requirement: "It should use the user's natural microphone/voice by default."
      // "Voice cloning should not be required for this mode unless specifically enabled by the user."
      updated.voiceMode = 'natural_mic';
    }
    setConfig(updated);
    CloudCallStore.saveConfig(updated);
  };

  const handleStartCall = async () => {
    // 1. Verify License Status
    const license = LicenseService.getActiveClientLicense();
    if (!license) {
      setIsActivationModalOpen(true);
      return;
    }

    if (license.status === 'suspended') {
      setCallStatus('Access Denied: This Product Key has been suspended by the administrator.');
      return;
    }

    if (license.status === 'depleted' || (!license.isUnlimited && license.remainingMinutes <= 0)) {
      setCallStatus('Your Product Key minutes have expired. Please contact your administrator.');
      return;
    }

    // Verify Tab / Mode Permission for this Product Key
    if (!LicenseService.isTabAccessible(callMode, license)) {
      const allowedName = LicenseService.getFeatureModeDisplayName(license.featureMode);
      setCallStatus(`Access Denied: Your Product Key is assigned exclusively to "${allowedName}". This tab is locked.`);
      return;
    }

    const keysInfo = LicenseService.getEffectiveKeysForLicense(license);

    try {
      const isVideoMode = callMode === 'video_audio' || callMode === 'video_only';
      const isAudioOnly = callMode === 'audio_only';

      // Determine active voice source based on tab mode
      // Video Calls Only: natural mic by default unless user specifically enabled voice cloning
      const isClonedVoiceActive =
        callMode === 'video_only'
          ? Boolean(config.videoOnlyEnableVoiceCloning && keysInfo.isVoiceAllowed)
          : config.voiceMode === 'cloned_voice' && keysInfo.isVoiceAllowed;

      const effectiveVideoKey = keysInfo.videoKey || config.videoEngineApiKey;
      const effectiveVoiceKey = keysInfo.voiceKey || config.voiceEngineApiKey;

      setCallStatus(
        isAudioOnly
          ? `RICH X Audio Studio: Initializing Audio-Only live stream (${isClonedVoiceActive ? 'Cloned Voice' : 'Natural Mic'})...`
          : `RICH X CAM LIVE: Initializing ${
              config.videoOrientation === 'portrait' ? 'Portrait (Mobile Phone)' : 'Landscape (Desktop/Webcam)'
            } with real-time Lip-Sync (${isClonedVoiceActive ? 'Cloned Voice' : 'Natural Mic'})...`
      );

      // 1. Initialize Virtual Routing with chosen output device
      await audioRoutingRef.current.init(
        24000,
        false,
        0.8,
        (lvl) => setAudioOutLevel(lvl),
        config.selectedOutputId
      );

      // Identify active microphone device name for lip sync context
      const selectedMicDevice = availableMics.find((m) => m.deviceId === config.selectedMicId);
      const micLabel = selectedMicDevice?.label || 'Microphone';
      audioRoutingRef.current.setAudioSourceContext(
        isClonedVoiceActive ? 'cloned_voice' : 'natural_mic',
        micLabel
      );

      // Hook up real-time lip sync metrics callback (treated as source for lip-sync in all modes)
      audioRoutingRef.current.onLipSyncMetrics((metrics) => {
        currentSpeakingRef.current = metrics.isSpeaking;
        const autoDelay =
          callMode === 'audio_only'
            ? 0
            : isClonedVoiceActive
            ? (metrics.isSpeaking ? 40 : 35)
            : (metrics.isSpeaking ? 165 : 155);

        setLipSyncMetrics({
          ...metrics,
          autoAdjustedDelayMs: autoDelay,
          isAutoCalibrated: config.autoLipSyncCalibration,
        });
      });

      // 2. Audio Pipeline Execution based on Voice Mode
      if (isClonedVoiceActive && effectiveVoiceKey) {
        setCallStatus('Connecting RICHX Audio speech-to-speech pipeline with Lip-Sync tracking...');
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
          const effectiveDelay = config.autoLipSyncCalibration
            ? (currentSpeakingRef.current ? 40 : 35)
            : config.audioLatencyCompensationMs;
          setTimeout(() => {
            audioRoutingRef.current.playChunk(chunk);
          }, effectiveDelay);
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
        // Lip-sync is driven by the actual outgoing natural microphone audio
        setCallStatus(`Routing natural microphone [${micLabel}] through RICHX Lip-Sync buffer...`);
        await audioCaptureRef.current.startCapture(
          config.selectedMicId,
          24000,
          0.005,
          (chunk) => {
            const effectiveDelay =
              callMode === 'audio_only'
                ? 0
                : config.autoLipSyncCalibration
                ? (currentSpeakingRef.current ? 165 : 155)
                : config.audioLatencyCompensationMs;
            setTimeout(() => {
              audioRoutingRef.current.playFloat32Chunk(chunk);
            }, effectiveDelay);
          },
          (lvl) => {
            setAudioInLevel(lvl);
          }
        );
      }

      // 3. Start Video Stream only if Video Mode (video_audio or video_only)
      if (isVideoMode) {
        // Pass outgoing audio stream from audioRoutingRef to ensure Lip-Sync in WebRTC
        const outgoingAudioStream = audioRoutingRef.current.getOutgoingMediaStream();

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
          (status) => setCallStatus(status),
          outgoingAudioStream
        );
      }

      setDurationSec(0);
      setSessionFinancials(BillingRateEngine.calculateSessionFinancials(0, callMode, isClonedVoiceActive));
      setIsCallActive(true);
      setCallStatus(
        isAudioOnly
          ? `RICH X Audio Live Active — ${isClonedVoiceActive ? 'Cloned Voice' : `Natural Mic (${micLabel})`}`
          : `RICH X CAM LIVE Active (${config.videoOrientation === 'portrait' ? 'Portrait Phone' : 'Landscape PC'}) — Lip-Sync Synced (${
              isClonedVoiceActive ? 'Cloned Voice' : `Natural Mic: ${micLabel}`
            })`
      );
    } catch (err: any) {
      console.error('Call failed', err);
      setCallStatus(`Error: ${err.message || 'Failed to start call'}`);
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    videoEngineRef.current.stopStream();
    audioCaptureRef.current.stopCapture();
    audioRoutingRef.current.stop();
    voiceEngineRef.current.stopStreamingSession();

    if (videoDisplayRef.current) {
      videoDisplayRef.current.srcObject = null;
    }
    setAudioInLevel(0);
    setAudioOutLevel(0);
    setLipSyncMetrics(null);
    setCallStatus('Service stopped immediately. Camera, microphone, and API sessions terminated.');
  };

  const handleStopService = () => {
    handleEndCall();
  };

  const handleOrientationChange = (orientation: VideoOrientation) => {
    const updated = { ...config, videoOrientation: orientation };
    setConfig(updated);
    CloudCallStore.saveConfig(updated);
    if (isCallActive && (callMode === 'video_audio' || callMode === 'video_only')) {
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

  const handleCameraChange = async (cameraId: string) => {
    const updated = { ...config, selectedCameraId: cameraId };
    setConfig(updated);
    CloudCallStore.saveConfig(updated);
    if (isCallActive) {
      await videoEngineRef.current.switchCamera(cameraId);
    }
  };

  const handleUpdatePrompt = (prompt: string) => {
    const updated = { ...config, videoPrompt: prompt };
    setConfig(updated);
    CloudCallStore.saveConfig(updated);
    videoEngineRef.current.updatePrompt(prompt);
  };

  const handleUpdateReferenceImage = async (imageUrl: string) => {
    const updated = { ...config, referenceImageUrl: imageUrl };
    setConfig(updated);
    CloudCallStore.saveConfig(updated);
    const license = LicenseService.getActiveClientLicense();
    const keysInfo = LicenseService.getEffectiveKeysForLicense(license);
    const effectiveVideoKey = keysInfo.videoKey || config.videoEngineApiKey;
    if (isCallActive) {
      await videoEngineRef.current.updateReferenceImage(imageUrl, effectiveVideoKey);
    }
  };

  const handleVoiceAdded = (newVoice: ClonedVoiceItem) => {
    const updatedVoices = [newVoice, ...voices];
    setVoices(updatedVoices);
    localStorage.setItem('richx_cam_live_voices_v1', JSON.stringify(updatedVoices));
    const updatedConfig = { ...config, activeVoiceId: newVoice.providerVoiceId };
    setConfig(updatedConfig);
    CloudCallStore.saveConfig(updatedConfig);
  };

  const handleVoiceDeleted = (voiceId: string) => {
    const updatedVoices = voices.filter((v) => v.id !== voiceId);
    setVoices(updatedVoices);
    localStorage.setItem('richx_cam_live_voices_v1', JSON.stringify(updatedVoices));
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isPortrait = config.videoOrientation === 'portrait';
  const isVideoLocked = !effectiveKeys.isVideoAllowed;
  const isVoiceCloneLocked = !effectiveKeys.isVoiceAllowed;
  const isLowMinutes = activeLicense && !activeLicense.isUnlimited && activeLicense.remainingMinutes <= 5;

  const currentSelectedMic = availableMics.find((m) => m.deviceId === config.selectedMicId);
  const currentMicName = currentSelectedMic?.label || 'Default Microphone';
  const currentActiveVoice = voices.find((v) => v.providerVoiceId === config.activeVoiceId);

  // Tab Accessibility & License Plan Binding
  const assignedStudioMode = activeLicense ? LicenseService.getAssignedStudioMode(activeLicense.featureMode) : 'all';
  const assignedModeDisplayName = activeLicense ? LicenseService.getFeatureModeDisplayName(activeLicense.featureMode) : 'All Modes';
  
  const isVideoAudioAllowed = !activeLicense || LicenseService.isTabAccessible('video_audio', activeLicense);
  const isAudioOnlyAllowed = !activeLicense || LicenseService.isTabAccessible('audio_only', activeLicense);
  const isVideoOnlyAllowed = !activeLicense || LicenseService.isTabAccessible('video_only', activeLicense);

  const isCurrentTabAllowed = !activeLicense || LicenseService.isTabAccessible(callMode, activeLicense);

  const renderModeLockedBanner = (tabName: string) => (
    <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 border border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-sm text-white">
              {tabName} Tab Locked
            </h3>
            {activeLicense?.key && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                KEY: {activeLicense.key}
              </span>
            )}
            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono font-semibold">
              PREVIEW ONLY
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Your product key is assigned exclusively to <strong className="text-amber-300">{assignedModeDisplayName}</strong>. 
            All buttons, controls, and functions on this tab are <strong className="text-slate-400">greyed out and disabled</strong>.
          </p>
        </div>
      </div>
      {assignedStudioMode !== 'all' && (
        <button
          type="button"
          onClick={() => handleSwitchTab(assignedStudioMode as StudioCallMode)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>Switch to Your Plan ({assignedModeDisplayName})</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Banner / Studio Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
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
            <button
              type="button"
              onClick={() => setIsActivationModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all hover:border-slate-600 cursor-pointer ${
                isLowMinutes
                  ? 'bg-amber-950/70 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-xs'
              }`}
              title="Click to view License & Hardware Lock details"
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
                    assignedStudioMode === 'video_only'
                      ? 'bg-purple-900/80 text-purple-300'
                      : assignedStudioMode === 'audio_only'
                      ? 'bg-sky-900/80 text-sky-300'
                      : 'bg-indigo-900/80 text-indigo-300'
                  }`}
                >
                  {assignedModeDisplayName}
                </span>
              </div>
            </button>
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
            className="px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors border border-slate-700 shadow-xs cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Calling Apps Guide</span>
          </button>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* THREE SEPARATE STUDIO TABS/MODES                                        */}
        {/* Mode 1: Video Call + Audio Call                                          */}
        {/* Mode 2: Audio Calls Only                                                 */}
        {/* Mode 3: Video Calls Only                                                 */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg backdrop-blur-md">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* TAB 1: Video Call + Audio Call */}
            <button
              type="button"
              disabled={isCallActive && callMode !== 'video_audio'}
              onClick={() => handleSwitchTab('video_audio')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                callMode === 'video_audio'
                  ? isVideoAudioAllowed
                    ? 'bg-gradient-to-r from-indigo-950/90 to-purple-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/40 text-white'
                    : 'bg-slate-900 border-amber-500/60 shadow-md text-amber-200 ring-1 ring-amber-500/30'
                  : isVideoAudioAllowed
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60 hover:opacity-85 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div
                    className={`p-1.5 rounded-lg ${
                      callMode === 'video_audio'
                        ? isVideoAudioAllowed
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                        : isVideoAudioAllowed
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-900 text-slate-600'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                  </div>
                  <span className={isVideoAudioAllowed ? 'text-white' : 'text-slate-400'}>
                    1. Video Call + Audio Call
                  </span>
                </div>
                {callMode === 'video_audio' && isVideoAudioAllowed && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                )}
                {!isVideoAudioAllowed && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>LOCKED</span>
                  </span>
                )}
              </div>
              <p className={`text-[11px] pl-8 leading-tight ${isVideoAudioAllowed ? 'text-slate-400' : 'text-slate-600'}`}>
                Real-time video & audio. Choose natural voice or cloned voice with custom voice uploads.
              </p>
            </button>

            {/* TAB 2: Audio Calls Only */}
            <button
              type="button"
              disabled={isCallActive && callMode !== 'audio_only'}
              onClick={() => handleSwitchTab('audio_only')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                callMode === 'audio_only'
                  ? isAudioOnlyAllowed
                    ? 'bg-gradient-to-r from-sky-950/90 to-cyan-950/60 border-sky-500 shadow-md ring-1 ring-sky-500/40 text-white'
                    : 'bg-slate-900 border-amber-500/60 shadow-md text-amber-200 ring-1 ring-amber-500/30'
                  : isAudioOnlyAllowed
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60 hover:opacity-85 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div
                    className={`p-1.5 rounded-lg ${
                      callMode === 'audio_only'
                        ? isAudioOnlyAllowed
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                        : isAudioOnlyAllowed
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-900 text-slate-600'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                  </div>
                  <span className={isAudioOnlyAllowed ? 'text-white' : 'text-slate-400'}>
                    2. Audio Calls Only
                  </span>
                </div>
                {callMode === 'audio_only' && isAudioOnlyAllowed && (
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                )}
                {!isAudioOnlyAllowed && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>LOCKED</span>
                  </span>
                )}
              </div>
              <p className={`text-[11px] pl-8 leading-tight ${isAudioOnlyAllowed ? 'text-slate-400' : 'text-slate-600'}`}>
                Audio-only calls without video interface. Select microphone, natural mic or cloned voice.
              </p>
            </button>

            {/* TAB 3: Video Calls Only */}
            <button
              type="button"
              disabled={isCallActive && callMode !== 'video_only'}
              onClick={() => handleSwitchTab('video_only')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                callMode === 'video_only'
                  ? isVideoOnlyAllowed
                    ? 'bg-gradient-to-r from-purple-950/90 to-pink-950/60 border-purple-500 shadow-md ring-1 ring-purple-500/40 text-white'
                    : 'bg-slate-900 border-amber-500/60 shadow-md text-amber-200 ring-1 ring-amber-500/30'
                  : isVideoOnlyAllowed
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60 hover:opacity-85 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div
                    className={`p-1.5 rounded-lg ${
                      callMode === 'video_only'
                        ? isVideoOnlyAllowed
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                        : isVideoOnlyAllowed
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-900 text-slate-600'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className={isVideoOnlyAllowed ? 'text-white' : 'text-slate-400'}>
                    3. Video Calls Only
                  </span>
                </div>
                {callMode === 'video_only' && isVideoOnlyAllowed && (
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                )}
                {!isVideoOnlyAllowed && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    <span>LOCKED</span>
                  </span>
                )}
              </div>
              <p className={`text-[11px] pl-8 leading-tight ${isVideoOnlyAllowed ? 'text-slate-400' : 'text-slate-600'}`}>
                Video-call interface only. Uses natural microphone by default with full mic selector.
              </p>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1 INTERFACE: VIDEO CALL + AUDIO CALL                                */}
        {/* ========================================================================= */}
        {callMode === 'video_audio' && (
          <div className="space-y-4">
            {!isVideoAudioAllowed && renderModeLockedBanner('Video Call + Audio Call')}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${!isVideoAudioAllowed ? 'opacity-40 grayscale pointer-events-none select-none cursor-not-allowed' : ''}`}>
            {/* Left Column: Stage Viewport & Video Controls (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <RichXRealtimeVideoEngine
                selectedCameraId={config.selectedCameraId}
                onCameraChange={handleCameraChange}
                availableCameras={availableCameras}
                referenceImageUrl={config.referenceImageUrl}
                onImageChange={handleUpdateReferenceImage}
                videoOrientation={config.videoOrientation}
                onOrientationChange={handleOrientationChange}
                isCallActive={isCallActive}
                onStartCall={handleStartCall}
                onStopCall={handleStopService}
                callStatus={callStatus}
                videoDisplayRef={videoDisplayRef}
                isAllowed={isVideoAudioAllowed}
                videoPrompt={config.videoPrompt}
                onPromptChange={handleUpdatePrompt}
              />

              {/* STOP BUTTON (Beneath user window, ON TOP of microphone selector) */}
              <StopServiceButton
                isCallActive={isCallActive}
                onStop={handleStopService}
                disabled={!isVideoAudioAllowed && !isCallActive}
                label="STOP SERVICE (CAMERA, MIC & TIMER)"
                subtext="Immediately terminates WebRTC video/audio stream, microphone capture, API sessions, and halts wallet timer."
              />

              {/* Hardware Device Selection (Microphone - BELOW STOP BUTTON) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-sky-400" />
                  <span>Select Input Microphone (Lip-Sync Tracking Driver)</span>
                </label>
                <select
                  value={config.selectedMicId}
                  onChange={(e) => {
                    const updated = { ...config, selectedMicId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  disabled={isCallActive}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="default">Default System Microphone</option>
                  {availableMics.map((m) => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label || `Microphone (${m.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Persona Appearance Prompt */}
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Dedicated Lip-Sync Engine Visualizer Component */}
              <LipSyncVisualizer
                metrics={lipSyncMetrics}
                isCallActive={isCallActive}
                callMode="video_audio"
                voiceMode={config.voiceMode}
                micName={currentMicName}
                clonedVoiceName={currentActiveVoice?.name}
                autoCalibrationActive={config.autoLipSyncCalibration}
              />

              {/* Audio Timing Buffer / Auto Lip-Sync Calibration */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${config.autoLipSyncCalibration ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Zap className={`w-4 h-4 ${config.autoLipSyncCalibration && isCallActive ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Auto Lip-Sync Calibration</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            config.autoLipSyncCalibration
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {config.autoLipSyncCalibration ? 'AUTO-SYNC ACTIVE' : 'MANUAL'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Automatically calibrates audio delay to match video render frames in real time when speaking.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, autoLipSyncCalibration: !config.autoLipSyncCalibration };
                      setConfig(updated);
                      CloudCallStore.saveConfig(updated);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      config.autoLipSyncCalibration
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {config.autoLipSyncCalibration ? 'Auto Enabled' : 'Enable Auto'}
                  </button>
                </div>

                {config.autoLipSyncCalibration ? (
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Dynamic Video-Audio Alignment:
                    </span>
                    <span className="font-mono text-amber-300 font-bold text-xs">
                      {lipSyncMetrics?.isSpeaking
                        ? (config.voiceMode === 'cloned_voice' ? '~40 ms (Cloned Voice Speaking)' : '~165 ms (Active Speaking)')
                        : (config.voiceMode === 'cloned_voice' ? '~35 ms (Cloned Standby)' : '~155 ms (Standby Anchor)')}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-sky-400" />
                        Manual Timing Buffer
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
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  Matches avatar/video mouth movements with what listeners hear in WhatsApp, Telegram, Zoom, or Discord.
                </p>
              </div>
            </div>

            {/* Right Column: Voice Selection, Voice Cloning & Upload Section (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Voice Source Switcher: Natural Voice vs Cloned Voice */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-white">Call Voice Input Option:</label>
                  <span className="text-[10px] text-slate-400">Switch anytime as needed</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Option A: Natural Voice */}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, voiceMode: 'natural_mic' as const };
                      setConfig(updated);
                      CloudCallStore.saveConfig(updated);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      config.voiceMode === 'natural_mic'
                        ? 'bg-sky-950/80 border-sky-500 text-white shadow-md ring-1 ring-sky-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-xs text-white mb-1">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span>Natural Voice</span>
                      </div>
                      {config.voiceMode === 'natural_mic' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      Uses selected natural microphone with aligned lip-sync.
                    </div>
                  </button>

                  {/* Option B: Cloned Voice */}
                  <button
                    type="button"
                    disabled={isVoiceCloneLocked}
                    onClick={() => {
                      const updated = { ...config, voiceMode: 'cloned_voice' as const };
                      setConfig(updated);
                      CloudCallStore.saveConfig(updated);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isVoiceCloneLocked
                        ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800'
                        : config.voiceMode === 'cloned_voice'
                        ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-xs text-white mb-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Cloned Voice</span>
                      </div>
                      {config.voiceMode === 'cloned_voice' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      Real-time AI voice conversion & custom cloned profiles.
                    </div>
                  </button>
                </div>
              </div>

              {/* Natural Voice Info or Voice Cloning Section */}
              {config.voiceMode === 'natural_mic' ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-sky-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Natural Voice Active for Video & Audio Call</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Microphone <strong>{currentMicName}</strong> captures your real voice directly. The audio is routed through the timing buffer to drive lip-sync mouth movements on video and stream into your calling apps.
                  </p>
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Want to use an AI voice instead?</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...config, voiceMode: 'cloned_voice' as const };
                        setConfig(updated);
                        CloudCallStore.saveConfig(updated);
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-colors"
                    >
                      Switch to Cloned Voice
                    </button>
                  </div>
                </div>
              ) : (
                /* Voice Cloning & Voice Upload Section */
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
              )}

              {/* Output Audio Virtual Cable Endpoint */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>RICHX Virtual Audio Endpoint (Output)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(true)}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    App Setup Guide
                  </button>
                </div>
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
                    In WhatsApp, Zoom, Discord, or Teams, set Camera to <strong>RICHX CAM</strong> and Mic to <strong>RICHX MIC</strong>.
                  </span>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2 INTERFACE: AUDIO CALLS ONLY                                       */}
        {/* ========================================================================= */}
        {callMode === 'audio_only' && (
          <div className="space-y-4">
            {!isAudioOnlyAllowed && renderModeLockedBanner('Audio Calls Only')}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${!isAudioOnlyAllowed ? 'opacity-40 grayscale pointer-events-none select-none cursor-not-allowed' : ''}`}>
            {/* Left Column: Dedicated Audio Call Stage (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden min-h-[380px]">
                {/* Decorative background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Status Indicator */}
                <div className="relative mb-5">
                  <div
                    className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all ${
                      isCallActive
                        ? 'bg-sky-600/20 border-2 border-sky-400 shadow-2xl shadow-sky-500/30 scale-105'
                        : 'bg-slate-800/80 border border-slate-700 text-slate-400'
                    }`}
                  >
                    <Headphones className={`w-12 h-12 ${isCallActive ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
                  </div>
                  {isCallActive && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
                  )}
                </div>

                <div className="space-y-2 max-w-md relative z-10">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl font-bold text-white">
                      {isCallActive ? 'Live Audio Call Active' : 'RICHX Audio-Only Studio'}
                    </h2>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-bold uppercase">
                      NO CAMERA REQUIRED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isCallActive
                      ? `Broadcasting high-definition voice to WhatsApp, Telegram, Discord, Zoom via RICHX MIC endpoint.`
                      : `Crystal-clear audio calling without video/webcam usage. Select your preferred microphone and choose natural or cloned voice.`}
                  </p>
                </div>

                {/* Animated Waveform Visualizer */}
                {isCallActive && (
                  <div className="my-6 flex items-center justify-center gap-2 h-16 w-full max-w-sm">
                    {[30, 60, 40, 95, 70, 100, 50, 85, 45, 90, 65, 35, 80, 55].map((baseHeight, idx) => {
                      const dynamicMultiplier = Math.max(0.15, (audioInLevel + audioOutLevel) / 100);
                      const calculatedHeight = Math.min(100, Math.max(15, baseHeight * dynamicMultiplier));
                      return (
                        <div
                          key={idx}
                          className="w-2 bg-gradient-to-t from-sky-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-75"
                          style={{ height: `${calculatedHeight}%` }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Call Timer & HUD when active */}
                {isCallActive && (
                  <div className="flex items-center gap-3 mb-6 font-mono text-xs">
                    <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-white font-bold">
                      Duration: {formatTimer(durationSec)}
                    </div>
                    {activeLicense && !activeLicense.isUnlimited && (
                      <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-emerald-400 font-bold">
                        {activeLicense.remainingMinutes.toFixed(1)} mins remaining
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Audio Call Action Button */}
                <div className="relative z-10">
                  {!isCallActive ? (
                    <button
                      onClick={handleStartCall}
                      disabled={!isAudioOnlyAllowed}
                      className={`px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-xl transition-all ${
                        isAudioOnlyAllowed
                          ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30 hover:scale-105 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      {isAudioOnlyAllowed ? (
                        <>
                          <PhoneCall className="w-4 h-4" />
                          <span>Start Live Audio Call</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Plan Required (Assigned: {assignedModeDisplayName})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleEndCall}
                      className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-xl shadow-rose-600/30 transition-all hover:scale-105 cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>End Live Audio Call</span>
                    </button>
                  )}
                </div>
              </div>

              {/* STOP BUTTON (Beneath user window, ON TOP of microphone selector) */}
              <StopServiceButton
                isCallActive={isCallActive}
                onStop={handleStopService}
                disabled={!isAudioOnlyAllowed && !isCallActive}
                label="STOP AUDIO SERVICE (MIC & TIMER)"
                subtext="Immediately terminates microphone capture, voice conversion pipeline, and halts wallet timer."
              />

              {/* Microphone Selector (Directly Below STOP Button) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-sm">
                <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-sky-400" />
                  <span>Select Audio Microphone (Below STOP)</span>
                </label>
                <select
                  value={config.selectedMicId}
                  onChange={(e) => {
                    const updated = { ...config, selectedMicId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  disabled={isCallActive}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="default">Default System Microphone</option>
                  {availableMics.map((m) => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label || `Microphone (${m.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-Time Audio Telemetry & Lip-Sync Formants */}
              <LipSyncVisualizer
                metrics={lipSyncMetrics}
                isCallActive={isCallActive}
                callMode="audio_only"
                voiceMode={config.voiceMode}
                micName={currentMicName}
                clonedVoiceName={currentActiveVoice?.name}
                autoCalibrationActive={config.autoLipSyncCalibration}
              />

              {/* Latency Timing Buffer / Auto Calibration */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${config.autoLipSyncCalibration ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Zap className={`w-4 h-4 ${config.autoLipSyncCalibration && isCallActive ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Auto Audio Calibration</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            config.autoLipSyncCalibration
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {config.autoLipSyncCalibration ? 'AUTO-SYNC ACTIVE' : 'MANUAL'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Zero-latency instant audio pipe for pure audio streaming.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, autoLipSyncCalibration: !config.autoLipSyncCalibration };
                      setConfig(updated);
                      CloudCallStore.saveConfig(updated);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      config.autoLipSyncCalibration
                        ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {config.autoLipSyncCalibration ? 'Auto Enabled' : 'Enable Auto'}
                  </button>
                </div>

                {config.autoLipSyncCalibration ? (
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      Pure Audio Direct Pipe:
                    </span>
                    <span className="font-mono text-sky-300 font-bold text-xs">
                      0 ms (Zero Latency Direct Pass)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-sky-400" />
                        Manual Timing Buffer
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
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  Calibrates audio routing to ensure crisp microphone broadcast without echo or stuttering.
                </p>
              </div>
            </div>

            {/* Right Column: Audio Hardware & Voice Options (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* STOP BUTTON (On top of microphone selector) */}
              <StopServiceButton
                isCallActive={isCallActive}
                onStop={handleStopService}
                disabled={!isAudioOnlyAllowed && !isCallActive}
                label="STOP AUDIO SERVICE"
                subtext="Halt audio streaming and wallet timer."
              />

              {/* Microphone Selector (BELOW STOP BUTTON) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <label className="block text-xs font-semibold text-white flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-sky-400" />
                  <span>Audio Microphone Selection</span>
                </label>
                <select
                  value={config.selectedMicId}
                  onChange={(e) => {
                    const updated = { ...config, selectedMicId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  disabled={isCallActive}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="default">Default System Microphone</option>
                  {availableMics.map((m) => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label || `Microphone (${m.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Select your physical desk mic, USB headset, or built-in microphone.
                </p>
              </div>

              {/* Voice Source Switcher */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-white">Audio Call Voice Mode:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, voiceMode: 'natural_mic' as const };
                      setConfig(updated);
                      CloudCallStore.saveConfig(updated);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      config.voiceMode === 'natural_mic'
                        ? 'bg-sky-950/80 border-sky-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-xs text-white mb-1">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span>Natural Voice</span>
                      </div>
                      {config.voiceMode === 'natural_mic' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      Streams your physical microphone directly.
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isVoiceCloneLocked}
                    onClick={() => {
                      const updated = { ...config, voiceMode: 'cloned_voice' as const };
                      setConfig(updated);
                      CloudCallStore.saveConfig(updated);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isVoiceCloneLocked
                        ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800'
                        : config.voiceMode === 'cloned_voice'
                        ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-xs text-white mb-1">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Cloned Voice</span>
                      </div>
                      {config.voiceMode === 'cloned_voice' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      Real-time AI voice conversion & custom cloned profiles.
                    </div>
                  </button>
                </div>
              </div>

              {/* Cloned Voice Section if active */}
              {config.voiceMode === 'cloned_voice' && !isVoiceCloneLocked && (
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
              )}

              {/* Output Audio Endpoint */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>RICHX MIC Virtual Output Endpoint</span>
                </h3>
                <select
                  value={config.selectedOutputId}
                  onChange={(e) => {
                    const updated = { ...config, selectedOutputId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="default">RICHX MIC Audio Bridge (Default)</option>
                  {availableOutputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Audio Endpoint (${d.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-sky-400 bg-sky-950/30 border border-sky-900/40 p-2.5 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Inside your calling app (Discord, WhatsApp, Zoom, Teams), choose <strong>RICHX MIC</strong> as your input device!
                  </span>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3 INTERFACE: VIDEO CALLS ONLY                                       */}
        {/* ========================================================================= */}
        {callMode === 'video_only' && (
          <div className="space-y-4">
            {!isVideoOnlyAllowed && renderModeLockedBanner('Video Calls Only')}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${!isVideoOnlyAllowed ? 'opacity-40 grayscale pointer-events-none select-none cursor-not-allowed' : ''}`}>
            {/* Left Column: Stage Viewport & Video Controls (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <RichXRealtimeVideoEngine
                selectedCameraId={config.selectedCameraId}
                onCameraChange={handleCameraChange}
                availableCameras={availableCameras}
                referenceImageUrl={config.referenceImageUrl}
                onImageChange={handleUpdateReferenceImage}
                videoOrientation={config.videoOrientation}
                onOrientationChange={handleOrientationChange}
                isCallActive={isCallActive}
                onStartCall={handleStartCall}
                onStopCall={handleStopService}
                callStatus={callStatus}
                videoDisplayRef={videoDisplayRef}
                isAllowed={isVideoOnlyAllowed}
                videoPrompt={config.videoPrompt}
                onPromptChange={handleUpdatePrompt}
              />

              {/* STOP BUTTON (Beneath user window, ON TOP of microphone selector) */}
              <StopServiceButton
                isCallActive={isCallActive}
                onStop={handleStopService}
                disabled={!isVideoOnlyAllowed && !isCallActive}
                label="STOP VIDEO SERVICE (CAMERA, MIC & TIMER)"
                subtext="Immediately terminates WebRTC video/audio stream, microphone capture, API sessions, and halts wallet timer."
              />

              {/* Hardware Device Selection (Microphone - BELOW STOP BUTTON) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-purple-400" />
                  <span>Select Detected Microphone</span>
                </label>
                <select
                  value={config.selectedMicId}
                  onChange={(e) => {
                    const updated = { ...config, selectedMicId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  disabled={isCallActive}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="default">Default System Microphone</option>
                  {availableMics.map((m) => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label || `Microphone (${m.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Persona Prompt */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Video Persona & Appearance Prompt
                  </span>
                  <span className="text-[11px] text-slate-400">Updates live in real time</span>
                </div>
                <input
                  type="text"
                  value={config.videoPrompt}
                  onChange={(e) => handleUpdatePrompt(e.target.value)}
                  placeholder="e.g. Professional executive, cinematic portrait lighting, high detail..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Lip-Sync Engine Visualizer */}
              <LipSyncVisualizer
                metrics={lipSyncMetrics}
                isCallActive={isCallActive}
                callMode="video_only"
                voiceMode={config.videoOnlyEnableVoiceCloning ? 'cloned_voice' : 'natural_mic'}
                micName={currentMicName}
                clonedVoiceName={config.videoOnlyEnableVoiceCloning ? currentActiveVoice?.name : undefined}
                autoCalibrationActive={config.autoLipSyncCalibration}
              />

              {/* Audio Timing Buffer / Auto Lip-Sync Calibration */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${config.autoLipSyncCalibration ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Zap className={`w-4 h-4 ${config.autoLipSyncCalibration && isCallActive ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Auto Lip-Sync Calibration</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                            config.autoLipSyncCalibration
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {config.autoLipSyncCalibration ? 'AUTO-SYNC ACTIVE' : 'MANUAL'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Automatically matches mouth movements to video frame latency when speaking.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, autoLipSyncCalibration: !config.autoLipSyncCalibration };
                      setConfig(updated);
                      CloudCallStore.saveConfig(updated);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      config.autoLipSyncCalibration
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {config.autoLipSyncCalibration ? 'Auto Enabled' : 'Enable Auto'}
                  </button>
                </div>

                {config.autoLipSyncCalibration ? (
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      Dynamic Video-Audio Alignment:
                    </span>
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      {lipSyncMetrics?.isSpeaking ? '~165 ms (Active Speaking)' : '~155 ms (Standby Anchor)'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-purple-400" />
                        Manual Lip-Sync Alignment
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
                      className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  Aligns mouth aperture timing with your natural microphone input in real-time.
                </p>
              </div>
            </div>

            {/* Right Column: Video Only Hardware & Detected Mic Selector (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* STOP BUTTON (On top of camera and microphone selectors) */}
              <StopServiceButton
                isCallActive={isCallActive}
                onStop={handleStopService}
                disabled={!isVideoOnlyAllowed && !isCallActive}
                label="STOP VIDEO SERVICE"
                subtext="Halt video streaming and wallet timer."
              />

              {/* Webcam Device Selection */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <label className="block text-xs font-semibold text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span>Physical Webcam Device</span>
                </label>
                <select
                  value={config.selectedCameraId}
                  onChange={(e) => {
                    const updated = { ...config, selectedCameraId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  disabled={isCallActive}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="default">Default Physical Webcam</option>
                  {availableCameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera (${c.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* PROMINENT DETECTED MICROPHONE SELECTOR (Requirement for Video Calls Only) */}
              <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-4 space-y-3 shadow-md ring-1 ring-purple-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-purple-400" />
                    <span>Microphone Input Selector</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
                    {availableMics.length} Device{availableMics.length === 1 ? '' : 's'} Detected
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Select any microphone detected on your computer. Your natural speech drives the real-time lip-sync mouth movements on video.
                </p>

                <select
                  value={config.selectedMicId}
                  onChange={(e) => {
                    const updated = { ...config, selectedMicId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  disabled={isCallActive}
                  className="w-full bg-slate-950 border border-purple-400/50 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                >
                  <option value="default">Default System Microphone</option>
                  {availableMics.map((m) => (
                    <option key={m.deviceId} value={m.deviceId}>
                      {m.label || `Microphone (${m.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>

                {/* Selected Device Badge & Live VU Level */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Active Mic:</span>
                    <span className="text-purple-300 font-semibold truncate max-w-[200px]">{currentMicName}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Mic Input Level</span>
                      <span className="text-emerald-400">{audioInLevel}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 transition-all duration-75"
                        style={{ width: `${audioInLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Natural Voice Default & Optional Voice Cloning Toggle */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Default: Natural Microphone Voice</h4>
                      <p className="text-[10px] text-slate-400">Uses your real voice with zero cloud AI voice overhead.</p>
                    </div>
                  </div>
                </div>

                {/* Optional Voice Cloning Toggle */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-slate-950/60 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Enable Voice Cloning (Optional)
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Voice cloning is not required for Video Only mode unless specifically enabled.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(config.videoOnlyEnableVoiceCloning)}
                      disabled={isVoiceCloneLocked || isCallActive}
                      onChange={(e) => {
                        const updated = { ...config, videoOnlyEnableVoiceCloning: e.target.checked };
                        setConfig(updated);
                        CloudCallStore.saveConfig(updated);
                      }}
                      className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-0 bg-slate-950 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Optional Voice Cloning Section if user explicitly turned it on */}
                {config.videoOnlyEnableVoiceCloning && !isVoiceCloneLocked && (
                  <div className="pt-2">
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
                  </div>
                )}
              </div>

              {/* Output Audio Endpoint */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>RICHX CAM Virtual Audio Endpoint (Output)</span>
                </h3>
                <select
                  value={config.selectedOutputId}
                  onChange={(e) => {
                    const updated = { ...config, selectedOutputId: e.target.value };
                    setConfig(updated);
                    CloudCallStore.saveConfig(updated);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="default">RICHX MIC Audio Bridge (Default)</option>
                  {availableOutputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Audio Endpoint (${d.deviceId.slice(0, 6)})`}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-purple-300 bg-purple-950/30 border border-purple-900/40 p-2.5 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-400" />
                  <span>
                    Select <strong>RICHX CAM</strong> as Camera and <strong>RICHX MIC</strong> as Audio in your calling apps!
                  </span>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

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
        onClose={() => setIsActivationModalOpen(false)}
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
