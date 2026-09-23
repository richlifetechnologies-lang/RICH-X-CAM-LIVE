import React from 'react';
import { Activity, Mic, Sparkles, Volume2 } from 'lucide-react';
import { LipSyncMetrics, StudioCallMode } from '../types/cloudCall';

interface LipSyncVisualizerProps {
  metrics: LipSyncMetrics | null;
  isCallActive: boolean;
  callMode: StudioCallMode;
  voiceMode: 'natural_mic' | 'cloned_voice';
  micName: string;
  clonedVoiceName?: string;
  compact?: boolean;
  autoCalibrationActive?: boolean;
}

export const LipSyncVisualizer: React.FC<LipSyncVisualizerProps> = ({
  metrics,
  isCallActive,
  callMode,
  voiceMode,
  micName,
  clonedVoiceName,
  compact = false,
  autoCalibrationActive = true,
}) => {
  const openness = isCallActive && metrics ? metrics.mouthOpenness : 0;
  const mouthWidth = isCallActive && metrics ? metrics.mouthWidth : 0;
  const phoneme = isCallActive && metrics?.isSpeaking ? metrics.phoneme : 'Rest';
  const isSpeaking = isCallActive && (metrics?.isSpeaking ?? false);
  const autoDelay = metrics?.autoAdjustedDelayMs ?? (callMode === 'audio_only' ? 0 : 160);
  const isAutoSync = metrics?.isAutoCalibrated ?? autoCalibrationActive;

  const activeSourceLabel =
    callMode === 'video_only'
      ? `Natural Mic: ${micName}`
      : voiceMode === 'cloned_voice'
      ? `Cloned Voice: ${clonedVoiceName || 'Custom Profile'}`
      : `Natural Mic: ${micName}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono">
        <div
          className={`w-2 h-2 rounded-full ${
            isSpeaking ? 'bg-emerald-400 animate-ping' : isCallActive ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
        />
        <span className="text-white font-medium">LIP-SYNC:</span>
        <span className="text-emerald-300 font-semibold">{openness}%</span>
        <span className="text-slate-400">[{phoneme}]</span>
        {isAutoSync && (
          <span className="text-amber-400 text-[9px] font-bold">⚡{autoDelay}ms</span>
        )}
      </div>
    );
  }

  // Calculate dynamic mouth SVG parameters based on speech formants
  // Mouth center at (50, 25)
  // Half-width scales with mouthWidth (-50 to +50)
  const baseW = 28 + (mouthWidth * 0.2); // 18 to 38
  const halfH = Math.max(3, (openness / 100) * 16); // 3 to 16

  const leftX = 50 - baseW;
  const rightX = 50 + baseW;
  const topY = 25 - halfH;
  const bottomY = 25 + halfH;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-md">
      {/* Header status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isSpeaking
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : isCallActive
                  ? 'bg-emerald-500'
                  : 'bg-slate-600'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                UNIVERSAL LIP-SYNC ENGINE
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold uppercase">
                {isCallActive ? 'SYNCHRONIZED' : 'STANDBY'}
              </span>
              {isAutoSync && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold flex items-center gap-1">
                  <span>⚡ AUTO-SYNC: {autoDelay}ms</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[260px]">
              Source: <span className="text-slate-200 font-medium">{activeSourceLabel}</span>
            </p>
          </div>
        </div>

        {/* Phoneme Pill */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono">Viseme:</span>
          <span className="text-xs font-mono font-bold text-sky-400">{phoneme}</span>
        </div>
      </div>

      {/* Reactive Mouth Motion & Gauges */}
      <div className="grid grid-cols-12 gap-3 items-center bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
        {/* Animated Mouth Preview Graphic */}
        <div className="col-span-4 flex flex-col items-center justify-center p-1 bg-slate-900/90 rounded border border-slate-800">
          <svg viewBox="0 0 100 50" className="w-20 h-10 overflow-visible">
            {/* Background Mouth Cavity */}
            <path
              d={`M ${leftX} 25 Q 50 ${topY} ${rightX} 25 Q 50 ${bottomY} ${leftX} 25 Z`}
              fill={openness > 15 ? '#450a0a' : '#1e1b4b'}
              stroke={isSpeaking ? '#38bdf8' : '#64748b'}
              strokeWidth="2.5"
              className="transition-all duration-75"
            />
            {/* Teeth / Upper Lip Highlight */}
            {openness > 20 && (
              <path
                d={`M ${leftX + 6} 23 Q 50 ${topY + 3} ${rightX - 6} 23`}
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            )}
            {/* Tongue Shape */}
            {openness > 35 && (
              <ellipse
                cx="50"
                cy={bottomY - 4}
                rx={baseW * 0.45}
                ry={halfH * 0.45}
                fill="#f43f5e"
                opacity="0.85"
              />
            )}
          </svg>
          <span className="text-[9px] font-mono text-slate-400 mt-1">
            Mouth Opening: {openness}%
          </span>
        </div>

        {/* Telemetry Meters */}
        <div className="col-span-8 space-y-2">
          {/* Mouth Openness Gauge */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-0.5">
              <span>Mouth Aperture</span>
              <span className="text-emerald-400 font-bold">{openness}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 transition-all duration-75"
                style={{ width: `${openness}%` }}
              />
            </div>
          </div>

          {/* Vocal Energy Gauge */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-0.5">
              <span>Outgoing Vocal Energy</span>
              <span className="text-sky-400 font-bold">{metrics?.vocalEnergy || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-75"
                style={{ width: `${metrics?.vocalEnergy || 0}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-slate-400 leading-tight">
            <span>
              {isAutoSync
                ? `⚡ Auto Lip-Sync: Active (~${autoDelay}ms matches video on speech onset)`
                : `Manual latency buffer: ${autoDelay}ms`}
            </span>
            {isSpeaking && (
              <span className="text-emerald-400 font-mono font-semibold animate-pulse">
                ● Speaking: Video-Matched
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
