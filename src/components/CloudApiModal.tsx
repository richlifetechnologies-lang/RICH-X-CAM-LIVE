import React from 'react';
import { Key, Video, Mic, DollarSign, X, Check, ShieldCheck } from 'lucide-react';
import { RichXCallConfig } from '../types/cloudCall';

interface CloudApiModalProps {
  settings: RichXCallConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: Partial<RichXCallConfig>) => void;
}

export const CloudApiModal: React.FC<CloudApiModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = React.useState<RichXCallConfig>(settings);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">RICH X CAM LIVE — Engine Credentials</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Video Engine API Key */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Video className="w-4 h-4 text-emerald-400" />
              Real-Time Video Engine Access Key
            </label>
            <p className="text-[11px] text-slate-400">
              Powers real-time 30FPS low-latency video transformation for RICH X CAM.
            </p>
            <input
              type="password"
              value={localSettings.videoEngineApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, videoEngineApiKey: e.target.value })}
              placeholder="Enter video engine key..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Voice Engine API Key */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-sky-400" />
              Real-Time Voice Engine Access Key
            </label>
            <p className="text-[11px] text-slate-400">
              Powers instant speech-to-speech voice conversion for RICH X AUDIO.
            </p>
            <input
              type="password"
              value={localSettings.voiceEngineApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, voiceEngineApiKey: e.target.value })}
              placeholder="Enter voice engine key..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Spending Cap Guardrail */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <DollarSign className="w-4 h-4" />
              <span>Safety Spending Guardrail</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Session Max Spend ($ USD)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={localSettings.spendingCapUsd}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, spendingCapUsd: parseFloat(e.target.value) || 5 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Max Call Duration (Mins)</label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="120"
                  value={localSettings.maxDurationMinutes}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, maxDurationMinutes: parseInt(e.target.value, 10) || 15 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted in local browser storage.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{saved ? 'Saved!' : 'Save Credentials'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
