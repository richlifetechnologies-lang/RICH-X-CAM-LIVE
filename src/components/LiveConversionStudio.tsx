import React from 'react';
import { Sliders, Cpu, Zap, Volume2, Headphones, Radio } from 'lucide-react';
import { EngineSettings, AudioDeviceOption } from '../types/voiceEngine';

interface LiveConversionStudioProps {
  settings: EngineSettings;
  audioDevices: AudioDeviceOption[];
  onUpdateSettings: (newSettings: Partial<EngineSettings>) => void;
  isConverting: boolean;
}

export const LiveConversionStudio: React.FC<LiveConversionStudioProps> = ({
  settings,
  audioDevices,
  onUpdateSettings,
  isConverting,
}) => {
  const inputDevices = audioDevices.filter((d) => d.kind === 'audioinput');
  const outputDevices = audioDevices.filter((d) => d.kind === 'audiooutput');

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          Real-Time Audio & Neural DSP Studio
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Fine-tune low-latency audio packetization, Voice Activity Detection (VAD) gating,
          acoustic stability, and local headphone sidetone monitoring.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hardware & Virtual Cable Routing */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400" />
            Hardware & Virtual Audio Routing
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Physical Microphone Input
            </label>
            <select
              value={settings.selectedInputDeviceId}
              onChange={(e) => onUpdateSettings({ selectedInputDeviceId: e.target.value })}
              disabled={isConverting}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="default">Default System Microphone</option>
              {inputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label} {d.isVirtual ? ' [Virtual Cable]' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Select your real desk microphone or headset mic.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Primary Converted Output (Windows Virtual Cable Input)
            </label>
            <select
              value={settings.selectedOutputDeviceId}
              onChange={(e) => onUpdateSettings({ selectedOutputDeviceId: e.target.value })}
              disabled={isConverting}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="default">Default System Audio Endpoint</option>
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label} {d.isVirtual ? ' ★ [Virtual Cable Recommended]' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Point this to <strong>CABLE Input (VB-Audio Virtual Cable)</strong> to broadcast into Discord, Zoom, or Teams.
            </p>
          </div>

          {/* Local Sidetone / Headphone Monitor */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableLocalMonitor}
                  onChange={(e) => onUpdateSettings({ enableLocalMonitor: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                />
                <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-indigo-400" />
                  Enable Headphone Sidetone (Hear your transformed voice)
                </span>
              </label>
            </div>

            {settings.enableLocalMonitor && (
              <div className="space-y-1.5 pl-5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Monitor Volume</span>
                  <span>{Math.round(settings.monitorVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.monitorVolume}
                  onChange={(e) => onUpdateSettings({ monitorVolume: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-amber-400/90">
                  ⚠ Use headphones! Open speakers will cause acoustic feedback loops back into the microphone.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Latency & Packet Framing */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Packet Framing & Latency Optimization
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Audio Chunk Frame Size (Packetization)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[40, 60, 80, 100].map((chunk) => (
                <button
                  key={chunk}
                  type="button"
                  disabled={isConverting}
                  onClick={() => onUpdateSettings({ chunkSizeMs: chunk as any })}
                  className={`py-2 text-xs font-mono rounded-lg border transition-all ${
                    settings.chunkSizeMs === chunk
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {chunk}ms
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Lower chunk size reduces conversion delay, but requires steady high-speed broadband.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Voice Activity Detection (VAD) Gate</span>
              <span className="font-mono text-slate-400">
                {(settings.vadThreshold * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.1"
              step="0.005"
              value={settings.vadThreshold}
              onChange={(e) => onUpdateSettings({ vadThreshold: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Filters out background typing and room hum so only active speech is sent to the cloud.
            </p>
          </div>

          {/* Neural Acoustic Tuning */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <h4 className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Neural Timbre & Inflection Controls
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Stability / Formant Lock</span>
                  <span className="font-mono">{Math.round(settings.stability * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.stability}
                  onChange={(e) => onUpdateSettings({ stability: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Similarity Boost</span>
                  <span className="font-mono">{Math.round(settings.similarityBoost * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.similarityBoost}
                  onChange={(e) => onUpdateSettings({ similarityBoost: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
