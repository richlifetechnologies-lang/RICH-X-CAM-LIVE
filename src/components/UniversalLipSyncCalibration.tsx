import React from 'react';
import { Zap, Sliders, Activity } from 'lucide-react';
import { LipSyncMetrics, StudioCallMode } from '../types/cloudCall';

interface UniversalLipSyncCalibrationProps {
  autoCalibrationActive: boolean;
  onToggleAuto: () => void;
  audioLatencyCompensationMs: number;
  onChangeLatency: (latencyMs: number) => void;
  metrics: LipSyncMetrics | null;
  isCallActive: boolean;
  callMode: StudioCallMode;
  voiceMode: 'natural_mic' | 'cloned_voice';
  accentColor?: 'purple' | 'amber' | 'indigo';
  className?: string;
}

export const UniversalLipSyncCalibration: React.FC<UniversalLipSyncCalibrationProps> = ({
  autoCalibrationActive,
  onToggleAuto,
  audioLatencyCompensationMs,
  onChangeLatency,
  metrics,
  isCallActive,
  callMode,
  voiceMode,
  accentColor = 'amber',
  className = '',
}) => {
  const isSpeaking = isCallActive && (metrics?.isSpeaking ?? false);
  const openness = isCallActive && metrics ? metrics.mouthOpenness : 0;
  const phoneme = isCallActive && isSpeaking && metrics ? metrics.phoneme : 'Rest';

  // Dynamic latency delay display
  const latencyDisplay = autoCalibrationActive
    ? isSpeaking
      ? voiceMode === 'cloned_voice'
        ? '~40 ms (Cloned Voice Active)'
        : '~165 ms (Active Speaking Match)'
      : voiceMode === 'cloned_voice'
      ? '~35 ms (Cloned Standby)'
      : '~155 ms (Standby Anchor)'
    : `${audioLatencyCompensationMs} ms delay (Manual)`;

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Zap className={`w-3.5 h-3.5 ${autoCalibrationActive && isCallActive ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white tracking-wide">
                Universal Lip Sync Calibration
              </h3>
              <span
                className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                  autoCalibrationActive
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {autoCalibrationActive ? 'AUTO-SYNC' : 'MANUAL'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Aligns video mouth aperture timing to audio speech.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleAuto}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            autoCalibrationActive
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          {autoCalibrationActive ? 'Auto Active' : 'Enable Auto'}
        </button>
      </div>

      {/* Auto vs Manual calibration controls */}
      {autoCalibrationActive ? (
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Video-Audio Dynamic Alignment:
          </span>
          <span className="font-mono text-amber-300 font-bold text-xs">
            {latencyDisplay}
          </span>
        </div>
      ) : (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Manual Timing Buffer
            </span>
            <span className="font-mono text-amber-300 font-semibold">{audioLatencyCompensationMs} ms delay</span>
          </div>
          <input
            type="range"
            min="0"
            max="350"
            step="10"
            value={audioLatencyCompensationMs}
            onChange={(e) => onChangeLatency(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* Real-time mini aperture meter */}
      <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-amber-400" />
          Aperture: <strong className="text-white">{openness}%</strong>
        </span>
        <span className="text-slate-400">
          Formant: <strong className="text-amber-300">[{phoneme}]</strong>
        </span>
        <span className="text-[10px] text-slate-500">
          {isCallActive ? (isSpeaking ? 'Speaking' : 'Resting') : 'Standby'}
        </span>
      </div>

      <p className="text-[10px] text-slate-400 leading-tight">
        Ensures listener hears voice at the exact moment mouth moves in calling apps.
      </p>
    </div>
  );
};
