import React, { useState } from 'react';
import { Key, ShieldCheck, Cpu, CheckCircle2, AlertCircle, ArrowRight, Lock, X } from 'lucide-react';
import { LicenseService } from '../services/licensing/LicenseService';
import { LicenseKeyItem } from '../types/licensing';

interface ProductKeyActivationModalProps {
  isOpen: boolean;
  onActivated: (license: LicenseKeyItem) => void;
  onOpenAdmin: () => void;
  onClose?: () => void;
}

export const ProductKeyActivationModal: React.FC<ProductKeyActivationModalProps> = ({
  isOpen,
  onActivated,
  onOpenAdmin,
  onClose,
}) => {
  const [productKey, setProductKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  if (!isOpen) return null;

  const currentHWID = LicenseService.getMachineHWID();
  const currentDevice = LicenseService.getDeviceName();
  const activeLicense = LicenseService.getActiveClientLicense();

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productKey.trim()) {
      setErrorMsg('Please enter your Product Key to activate RICH X CAM LIVE.');
      return;
    }

    setIsActivating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    setTimeout(() => {
      const res = LicenseService.activateKey(productKey);
      setIsActivating(false);

      if (res.success && res.license) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onActivated(res.license!);
        }, 800);
      } else {
        setErrorMsg(res.message);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Optional Close Button if software is already active */}
        {activeLicense && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Top Header Banner */}
        <div className="px-8 pt-8 pb-6 text-center space-y-3 bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800/80">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 mx-auto flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">RICH X CAM LIVE</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your Product Key to activate and bind this computer
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleActivate} className="p-8 space-y-6">
          {/* Machine HWID Badge */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
                  Detected Hardware Fingerprint (HWID)
                </div>
                <div className="text-xs font-mono font-bold text-slate-200">
                  {currentHWID} &bull; <span className="text-indigo-400">{currentDevice}</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full font-semibold">
              {activeLicense ? 'ACTIVE' : 'LOCKED'}
            </div>
          </div>

          {/* Product Key Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-400" />
                License / Product Key:
              </span>
            </label>
            <input
              type="text"
              value={productKey}
              onChange={(e) => setProductKey(e.target.value.toUpperCase())}
              placeholder="RICHX-XXXX-XXXX-LIVE"
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-center text-sm font-mono font-bold tracking-wider text-white placeholder-slate-600 focus:outline-none transition-all shadow-inner"
            />
            <p className="text-[11px] text-slate-500 text-center">
              Each key binds exclusively to this machine to protect your minutes.
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-900/60 p-3 rounded-xl flex items-start gap-2 leading-relaxed animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 p-3 rounded-xl flex items-start gap-2 leading-relaxed animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isActivating}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01]"
          >
            {isActivating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Hardware & Binding...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Activate Software & Launch</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Footer Admin Entry on Locked Screen */}
        <div className="px-8 py-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hardware-Locked License Protection</span>
          </div>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Administrator Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
