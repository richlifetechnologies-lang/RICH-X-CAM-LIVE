import React from 'react';
import { Mic, Activity, Clock, DollarSign, Volume2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SessionMetrics, VoiceProfile, EngineSettings } from '../types/voiceEngine';

interface DashboardProps {
  metrics: SessionMetrics;
  selectedVoice: VoiceProfile | undefined;
  settings: EngineSettings;
  isConverting: boolean;
  onToggleConversion: () => void;
  onOpenSettings: () => void;
  onOpenVoiceLibrary: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  metrics,
  selectedVoice,
  settings,
  isConverting,
  onToggleConversion,
  onOpenVoiceLibrary,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 150) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
    if (ms < 350) return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
    return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                isConverting
                  ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse'
                  : 'bg-slate-600'
              }`}
            />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-white">Live Voice Conversion Engine</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {settings.provider === 'elevenlabs'
                    ? 'Cloud STS: ElevenLabs'
                    : 'Simulation DSP Engine (Local/Testing)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isConverting
                  ? 'Actively capturing live physical mic, streaming to voice transformer, and outputting to virtual cable.'
                  : 'Standby mode. Audio capture paused. No cloud credits or bandwidth consumed.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleConversion}
              className={`px-6 py-3 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all shadow-md ${
                isConverting
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30'
              }`}
            >
              <Mic className={`w-4 h-4 ${isConverting ? 'animate-bounce' : ''}`} />
              <span>{isConverting ? 'Stop Voice Conversion' : 'Start Live Conversion'}</span>
            </button>
          </div>
        </div>

        {/* Live Audio Meter Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80">
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                Physical Mic Input (VAD Active)
              </span>
              <span>{metrics.audioInputLevel}%</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${metrics.audioInputLevel}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                Transformed Output to Virtual Mic Cable
              </span>
              <span>{metrics.audioOutputLevel}%</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-75"
                style={{ width: `${metrics.audioOutputLevel}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latency */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Round-Trip Latency</span>
            <Activity className="w-4 h-4 text-slate-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics.totalEstimatedLatencyMs}
            </span>
            <span className="text-xs font-mono text-slate-400 ml-1">ms</span>
          </div>
          <div
            className={`text-xs px-2 py-0.5 rounded border inline-flex items-center justify-center font-mono ${getLatencyColor(
              metrics.totalEstimatedLatencyMs
            )}`}
          >
            {metrics.totalEstimatedLatencyMs < 200
              ? 'Ultra-Low (Conversational)'
              : metrics.totalEstimatedLatencyMs < 450
              ? 'Standard Cloud STS'
              : 'High Latency'}
          </div>
        </div>

        {/* Selected Voice Profile */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Target Voice Profile</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2 truncate">
            <div className="text-sm font-semibold text-white truncate">
              {selectedVoice ? selectedVoice.name : 'No Voice Selected'}
            </div>
            <div className="text-xs text-slate-400 font-mono truncate">
              ID: {selectedVoice?.providerVoiceId || 'N/A'}
            </div>
          </div>
          <button
            onClick={onOpenVoiceLibrary}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium text-left transition-colors"
          >
            Change in Library →
          </button>
        </div>

        {/* Session Time */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Session Duration</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-white">
              {formatTime(metrics.durationSeconds)}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Safety Cutoff: {settings.maxSessionMinutes} min
          </div>
        </div>

        {/* Cloud Cost Guardrail */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Est. Session Spend</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-amber-300">
              ${metrics.estimatedCost.toFixed(3)}
            </span>
            <span className="text-xs text-slate-400 font-mono ml-1">USD</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Limit: ${settings.sessionSpendingLimit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Safety Notice & Virtual Microphone Connection Status */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-300">
        <AlertTriangle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">
            Windows Calling Application Routing Notice:
          </p>
          <p className="text-slate-400 leading-relaxed">
            Ensure your destination calling software (e.g. <strong>Discord, Zoom, Teams, Google Meet</strong>)
            has its microphone input set to <strong>"CABLE Output (VB-Audio Virtual Cable)"</strong> or your primary loopback device.
            This ensures your normal voice is replaced completely with the converted reference voice.
          </p>
        </div>
      </div>
    </div>
  );
};
