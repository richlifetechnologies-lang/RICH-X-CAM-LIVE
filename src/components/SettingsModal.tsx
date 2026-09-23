import React from 'react';
import { Settings as SettingsIcon, Key, ShieldCheck, DollarSign, Cloud, Check } from 'lucide-react';
import { EngineSettings, ProviderType } from '../types/voiceEngine';

interface SettingsModalProps {
  settings: EngineSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: Partial<EngineSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = React.useState<EngineSettings>(settings);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Engine Configuration & API Keys</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Voice Conversion Engine Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, provider: 'elevenlabs' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  localSettings.provider === 'elevenlabs'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs text-indigo-300">ElevenLabs Cloud STS</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Official Speech-to-Speech WebSocket API with Instant Voice Cloning.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, provider: 'simulation_local' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  localSettings.provider === 'simulation_local'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs text-emerald-300">Local Testing Simulation</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Zero-cost, zero-API key loopback for latency and Virtual Cable checks.
                </div>
              </button>
            </div>
          </div>

          {/* API Key Field */}
          {localSettings.provider === 'elevenlabs' && (
            <div className="space-y-1.5 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  ElevenLabs API Key
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Stored securely in local storage</span>
              </label>
              <input
                type="password"
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                placeholder="sk_..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Obtain your API Key from elevenlabs.io. Requires an account with Instant Voice Cloning enabled.
              </p>
            </div>
          )}

          {/* Cost Guardrails & Session Limits */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Safety Caps & Cloud Spend Guardrails
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Session Spending Limit (USD)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  value={localSettings.sessionSpendingLimit}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      sessionSpendingLimit: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Automatic Cutoff (Minutes)
                </label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="180"
                  value={localSettings.maxSessionMinutes}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      maxSessionMinutes: parseInt(e.target.value, 10) || 15,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{savedSuccess ? 'Saved!' : 'Apply Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
