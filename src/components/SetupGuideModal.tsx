import React, { useState } from 'react';
import { Video, Mic, Monitor, CheckCircle, X, Layers, Globe, Smartphone, ShieldCheck, Download, Settings, Volume2, Sparkles, AlertCircle } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallDrivers = async () => {
    setIsInstalling(true);
    setDriverStatus('Registering RICHX CAM & RICHX MIC drivers with Windows...');
    try {
      if ((window as any).electronAPI?.installVirtualDrivers) {
        const res = await (window as any).electronAPI.installVirtualDrivers();
        if (res.success) {
          setDriverStatus('SUCCESS: RICHX CAM and RICHX MIC are now registered in Windows! Restart WhatsApp to select them.');
        } else {
          setDriverStatus(`Notice: ${res.message}. Run drivers\\install-richx-virtual-devices.bat as Administrator.`);
        }
      } else {
        // In browser mode, trigger download or instruction
        setDriverStatus('Running in Web Browser mode: In your installed Windows app, click this button or run install-richx-virtual-devices.bat as Administrator.');
      }
    } catch (err: any) {
      setDriverStatus(`Error: ${err.message || err}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleOpenSoundSettings = async () => {
    if ((window as any).electronAPI?.openSoundSettings) {
      await (window as any).electronAPI.openSoundSettings();
    }
  };

  const handleOpenCameraSettings = async () => {
    if ((window as any).electronAPI?.openCameraSettings) {
      await (window as any).electronAPI.openCameraSettings();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Universal Calling Apps Integration</h2>
              <p className="text-[11px] text-slate-400">
                WhatsApp, Telegram, WeChat, Google Chat, Zoom, Discord, Teams, Skype & Browser Web Calls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Driver Registration Quick Action (For WhatsApp & Zoom) */}
          <div className="bg-gradient-to-r from-purple-950/80 to-indigo-950/80 border border-purple-500/40 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Windows Driver Registration (WhatsApp, Zoom, Discord)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                DirectShow & WASAPI
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              If <strong>RICHX CAM</strong> or <strong>RICHX MIC</strong> does not appear in your WhatsApp camera/microphone dropdown list, click below to register the Windows DirectShow & CoreAudio device drivers with administrator rights:
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleInstallDrivers}
                disabled={isInstalling}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInstalling ? 'Registering Drivers...' : 'Register Drivers in Windows'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenSoundSettings}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Open Windows Sound Control Panel"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sound Settings</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCameraSettings}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                title="Open Windows Camera Settings"
              >
                <Settings className="w-3.5 h-3.5 text-purple-400" />
                <span>Camera Settings</span>
              </button>
            </div>

            {driverStatus && (
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-[11px] text-indigo-300 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{driverStatus}</span>
              </div>
            )}
          </div>
          {/* Universal System-Level Guarantee Banner */}
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <Globe className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-white">DirectShow & Windows Core Audio Universal Support</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                Because <strong>RICHX CAM</strong> and <strong>RICHX MIC</strong> register at the Windows Kernel driver layer (DirectShow / MediaFoundation / WASAPI), <strong>every single calling application</strong> (desktop client, Windows Store app, or web browser) automatically lists them alongside physical webcams and microphones.
              </p>
            </div>
          </div>

          {/* App-by-App Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* WhatsApp Desktop / Web */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                <Smartphone className="w-3.5 h-3.5" />
                <span>WhatsApp (Desktop & Web)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Settings &rarr; Audio & Video &rarr; Camera: select <strong>RICHX CAM</strong>. Microphone: select <strong>RICHX MIC</strong>. Perfect for Portrait (9:16) phone calls!
              </p>
            </div>

            {/* Telegram Desktop / Web */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-xs">
                <Globe className="w-3.5 h-3.5" />
                <span>Telegram Desktop / Calls</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Settings &rarr; Advanced &rarr; Call Settings: choose <strong>RICHX CAM</strong> and <strong>RICHX MIC</strong>.
              </p>
            </div>

            {/* WeChat & Google Chat / Meet */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-green-400 font-semibold text-xs">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>WeChat & Google Chat / Meet</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                In settings or in-call gear icon &rarr; select <strong>RICHX CAM</strong> for video, <strong>RICHX MIC</strong> for audio.
              </p>
            </div>

            {/* Zoom, Discord, Teams, Skype */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                <Monitor className="w-3.5 h-3.5" />
                <span>Discord, Zoom, Teams, Skype</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                User Settings &rarr; Voice & Video &rarr; Camera: <strong>RICHX CAM</strong>, Input Device: <strong>RICHX MIC (or CABLE Output)</strong>.
              </p>
            </div>
          </div>

          {/* Quick 2-Step Summary */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>How It Works Seamlessly for Any Unknown or Future Calling App</span>
            </h4>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-indigo-400">1. Video:</span>
                <span>
                  Any app that asks for camera permission queries the Windows DirectShow list. <strong>RICHX CAM</strong> appears right next to your real webcam. Works in portrait (phone) or landscape (PC).
                </span>
              </div>
              <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="font-bold text-indigo-400">2. Audio:</span>
                <span>
                  Any app that captures microphone audio queries the Windows Audio Endpoint list. <strong>RICHX MIC</strong> delivers your lip-synced transformed voice automatically.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Universal DirectShow & CoreAudio Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
