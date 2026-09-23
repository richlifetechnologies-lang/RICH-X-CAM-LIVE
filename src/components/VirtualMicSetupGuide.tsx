import React from 'react';
import { Cable, ExternalLink, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { AudioDeviceOption } from '../types/voiceEngine';

interface VirtualMicSetupGuideProps {
  audioDevices: AudioDeviceOption[];
}

export const VirtualMicSetupGuide: React.FC<VirtualMicSetupGuideProps> = ({ audioDevices }) => {
  const hasVirtualCable = audioDevices.some((d) => d.isVirtual);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cable className="w-5 h-5 text-indigo-400" />
          Windows Virtual Microphone Setup & Calling App Bridge
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          To broadcast your converted voice directly into calling applications (such as <strong>Discord, Zoom, Microsoft Teams, Google Meet, Skype, or OBS</strong>),
          Windows requires a certified virtual audio loopback bridge.
        </p>
      </div>

      {/* Virtual Device Status Banner */}
      <div
        className={`border rounded-xl p-5 flex items-start gap-4 ${
          hasVirtualCable
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
            : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
        }`}
      >
        {hasVirtualCable ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <h3 className="font-semibold text-sm">
            {hasVirtualCable
              ? 'Virtual Audio Cable Driver Detected!'
              : 'Virtual Audio Driver Not Detected in Audio Endpoints'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {hasVirtualCable
              ? 'Windows has detected a virtual audio endpoint (VB-Audio CABLE or VAC). You can now route converted speech directly into calling applications.'
              : 'To route your converted voice as a hardware microphone on Windows, install the free, Microsoft-certified VB-Audio Virtual Cable driver.'}
          </p>
        </div>
      </div>

      {/* 3-Step Setup Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h4 className="font-semibold text-sm text-white">Install VB-Audio Cable</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Download the driver from the official site (free donationware, standard signed Windows driver).
            Run installer as Administrator and reboot or restart your browser.
          </p>
          <div className="pt-2">
            <a
              href="https://vb-audio.com/Cable/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>Download Official Driver</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h4 className="font-semibold text-sm text-white">Select Output in LiveVoice</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            In LiveVoice Audio Studio, set your <strong>Primary Converted Output</strong> to:
            <span className="block mt-1.5 font-mono text-[11px] bg-slate-950 p-1.5 rounded border border-slate-800 text-indigo-300">
              CABLE Input (VB-Audio Virtual Cable)
            </span>
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h4 className="font-semibold text-sm text-white">Configure Your Calling App</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            In Discord, Zoom, or Teams settings, set your <strong>Input Device (Microphone)</strong> to:
            <span className="block mt-1.5 font-mono text-[11px] bg-slate-950 p-1.5 rounded border border-slate-800 text-emerald-300">
              CABLE Output (VB-Audio Virtual Cable)
            </span>
          </p>
        </div>
      </div>

      {/* Calling Application Configuration Guides */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
        <h3 className="font-semibold text-sm text-white">
          Step-by-Step Settings for Top Calling Applications
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-indigo-400">
              <span>Discord</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Open <strong>User Settings</strong> → <strong>Voice & Video</strong>.</li>
              <li>Input Device: Pick <strong>CABLE Output (VB-Audio)</strong>.</li>
              <li>Output Device: Keep your real headphones.</li>
              <li>Input Sensitivity: Uncheck automatic; set to -60dB so all converted speech passes through.</li>
            </ul>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-sky-400">
              <span>Zoom & Google Meet</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Open <strong>Audio Settings</strong>.</li>
              <li>Microphone: Pick <strong>CABLE Output (VB-Audio Virtual Cable)</strong>.</li>
              <li>Speaker: Keep your actual headphones/speakers.</li>
              <li>Disable "Automatically adjust microphone volume" for consistent loudness.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            This bridge leaves your private messages, contacts, and account security completely untouched.
          </span>
        </div>
      </div>
    </div>
  );
};
