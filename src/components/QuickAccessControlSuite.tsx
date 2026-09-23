import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  Camera,
  Layers,
  Zap,
  Sliders,
  Radio,
  Headphones,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClonedVoiceItem, RichXCallConfig } from '../types/cloudCall';
import { VoiceCloningSection } from './VoiceCloningSection';

interface QuickAccessControlSuiteProps {
  config: RichXCallConfig;
  onUpdateConfig: (updated: Partial<RichXCallConfig>) => void;
  availableCameras: MediaDeviceInfo[];
  isCallActive: boolean;
  // Voice clone props
  voices: ClonedVoiceItem[];
  voiceEngineApiKey: string;
  isVoiceCloneLocked?: boolean;
  onVoiceAdded: (voice: ClonedVoiceItem) => void;
  onVoiceDeleted: (id: string) => void;
  // Audio pipelining optional callback
  onOpenGuide?: () => void;
  accentColor?: 'purple' | 'indigo' | 'sky';
}

export const QuickAccessControlSuite: React.FC<QuickAccessControlSuiteProps> = ({
  config,
  onUpdateConfig,
  availableCameras,
  isCallActive,
  voices,
  voiceEngineApiKey,
  isVoiceCloneLocked = false,
  onVoiceAdded,
  onVoiceDeleted,
  onOpenGuide,
  accentColor = 'purple',
}) => {
  const [isAudioPipeExpanded, setIsAudioPipeExpanded] = useState<boolean>(false);
  const [isVoiceCloneExpanded, setIsVoiceCloneExpanded] = useState<boolean>(
    config.voiceMode === 'cloned_voice' || Boolean(config.videoOnlyEnableVoiceCloning)
  );

  const selectedCam = availableCameras.find((c) => c.deviceId === config.selectedCameraId);

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------------- */}
      {/* 1. AUDIO PIPELINING & VIRTUAL CABLE ROUTING                  */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-bold text-white">Audio Pipelining</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 uppercase font-semibold">
              LOW-LATENCY DSP
            </span>
            <button
              type="button"
              onClick={() => setIsAudioPipeExpanded(!isAudioPipeExpanded)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title={isAudioPipeExpanded ? 'Collapse' : 'Expand'}
            >
              {isAudioPipeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          Real-time low-jitter audio routing between microphone input and virtual endpoints.
        </p>

        {/* Quick summary strip */}
        <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Audio Pipeline Mode:</span>
          <span className="font-mono text-sky-300 font-semibold">
            {config.voiceMode === 'cloned_voice' ? 'Neural AI Transformed' : 'Direct Low-Latency Pass'}
          </span>
        </div>

        {/* Expandable detailed audio pipeline controls */}
        {isAudioPipeExpanded && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Virtual Output Endpoint (Broadcasting Bridge)
                </label>
                {onOpenGuide && (
                  <button
                    type="button"
                    onClick={onOpenGuide}
                    className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Setup Guide
                  </button>
                )}
              </div>
              <input
                type="text"
                readOnly
                value="RICHX Virtual Cable Bridge (Default)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 select-all"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Set mic to <strong>RICHX MIC</strong> inside WhatsApp, Telegram, Zoom, or Discord.
              </p>
            </div>

            <div className="bg-sky-950/30 border border-sky-900/40 p-2.5 rounded-lg text-[10px] text-sky-300 flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Ultra-low latency packet framing (40ms) with automated noise suppression active.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. VOICE CLONE                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-white">Voice Clone</span>
          </div>

          <div className="flex items-center gap-2">
            {isVoiceCloneLocked ? (
              <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-950 text-slate-500 border border-slate-800">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                LOCKED
              </span>
            ) : config.voiceMode === 'cloned_voice' ? (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold uppercase">
                ACTIVE
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                OFF (NATURAL)
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsVoiceCloneExpanded(!isVoiceCloneExpanded)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title={isVoiceCloneExpanded ? 'Collapse' : 'Expand'}
            >
              {isVoiceCloneExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Voice Mode Toggle Switch */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onUpdateConfig({ voiceMode: 'natural_mic', videoOnlyEnableVoiceCloning: false });
            }}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
              config.voiceMode === 'natural_mic'
                ? 'bg-sky-950/80 border-sky-500 text-white shadow-xs ring-1 ring-sky-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-semibold text-xs text-white">Natural Mic</div>
            <div className="text-[9px] text-slate-400 leading-tight">Your real voice</div>
          </button>

          <button
            type="button"
            disabled={isVoiceCloneLocked}
            onClick={() => {
              onUpdateConfig({ voiceMode: 'cloned_voice', videoOnlyEnableVoiceCloning: true });
              setIsVoiceCloneExpanded(true);
            }}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
              isVoiceCloneLocked
                ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800'
                : config.voiceMode === 'cloned_voice'
                ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-xs ring-1 ring-indigo-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-semibold text-xs text-white flex items-center justify-between">
              <span>Cloned Voice</span>
              {config.voiceMode === 'cloned_voice' && <CheckCircle2 className="w-3 h-3 text-indigo-400" />}
            </div>
            <div className="text-[9px] text-slate-400 leading-tight">AI converted profile</div>
          </button>
        </div>

        {/* Expandable Voice Profiles / Voice Clone Uploader */}
        {isVoiceCloneExpanded && !isVoiceCloneLocked && (
          <div className="pt-2 border-t border-slate-800/80">
            <VoiceCloningSection
              voices={voices}
              activeVoiceId={config.activeVoiceId}
              voiceEngineApiKey={voiceEngineApiKey}
              onSelectVoice={(id) => onUpdateConfig({ activeVoiceId: id })}
              onVoiceAdded={onVoiceAdded}
              onVoiceDeleted={onVoiceDeleted}
            />
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CAMERA SELECTOR                                            */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Camera Selector</span>
          </label>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
            {availableCameras.length} Device{availableCameras.length === 1 ? '' : 's'}
          </span>
        </div>

        <select
          value={config.selectedCameraId}
          onChange={(e) => onUpdateConfig({ selectedCameraId: e.target.value })}
          disabled={isCallActive}
          className="w-full bg-slate-950 border border-slate-700 hover:border-purple-500 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-medium transition-colors cursor-pointer"
        >
          <option value="default">Default Physical Webcam</option>
          {availableCameras.map((cam, idx) => (
            <option key={cam.deviceId || idx} value={cam.deviceId}>
              {cam.label || `Camera Device ${idx + 1}`}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-400">
          Source camera for real-time facial expression and motion capture.
        </p>
      </div>
    </div>
  );
};
