import React, { useState } from 'react';
import {
  Key,
  Shield,
  ShieldAlert,
  Cpu,
  Clock,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Power,
  X,
  Sliders,
  Database,
  Lock,
  Search,
  User,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { LicenseService } from '../services/licensing/LicenseService';
import { LicenseKeyItem, TimerConsumptionConfig, AdminSecurityConfig } from '../types/licensing';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseChanged?: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onLicenseChanged,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Tabs: 'licenses' | 'timer' | 'engine' | 'security'
  const [activeTab, setActiveTab] = useState<'licenses' | 'timer' | 'engine' | 'security'>('licenses');

  // Licenses state
  const [licenses, setLicenses] = useState<LicenseKeyItem[]>(LicenseService.getAllLicenses());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Generator form
  const [newClientName, setNewClientName] = useState('');
  const [newAllocatedMinutes, setNewAllocatedMinutes] = useState<number>(60);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);

  // Minute Top-Up Modal/Prompt state
  const [topUpKey, setTopUpKey] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(30);

  // Timer & Security configs
  const [timerConfig, setTimerConfig] = useState<TimerConsumptionConfig>(LicenseService.getTimerConfig());
  const [adminConfig, setAdminConfig] = useState<AdminSecurityConfig>(LicenseService.getAdminConfig());
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const refreshLicenses = () => {
    setLicenses(LicenseService.getAllLicenses());
    if (onLicenseChanged) onLicenseChanged();
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (LicenseService.verifyAdminPassword(adminPasswordInput)) {
      setIsAuthenticated(true);
      setAuthError(null);
      refreshLicenses();
    } else {
      setAuthError('Incorrect Master Admin Password. Default is: admin');
    }
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const created = LicenseService.generateKey(
      newClientName,
      newAllocatedMinutes,
      isUnlimited,
      newNotes
    );
    setGeneratedKeyResult(created.key);
    setNewClientName('');
    setNewNotes('');
    refreshLicenses();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleUnbindPC = (key: string) => {
    if (confirm(`Unbind Hardware ID from key ${key}? This will allow the customer to activate on a different PC.`)) {
      LicenseService.unbindDevice(key);
      refreshLicenses();
    }
  };

  const handleToggleSuspend = (key: string) => {
    LicenseService.toggleSuspend(key);
    refreshLicenses();
  };

  const handleDeleteKey = (key: string) => {
    if (confirm(`Permanently delete license ${key}?`)) {
      LicenseService.deleteLicense(key);
      refreshLicenses();
    }
  };

  const handleApplyTopUp = () => {
    if (topUpKey && topUpAmount > 0) {
      LicenseService.addMinutes(topUpKey, topUpAmount);
      setTopUpKey(null);
      refreshLicenses();
    }
  };

  const handleSaveTimerConfig = () => {
    LicenseService.saveTimerConfig(timerConfig);
    setSaveSuccessMsg('Timer consumption rules saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 2000);
    if (onLicenseChanged) onLicenseChanged();
  };

  const handleSaveAdminConfig = () => {
    const updated = { ...adminConfig };
    if (newAdminPassword.trim()) {
      updated.masterAdminPassword = newAdminPassword.trim();
    }
    LicenseService.saveAdminConfig(updated);
    setAdminConfig(updated);
    setNewAdminPassword('');
    setSaveSuccessMsg('Admin credentials and Master Keys updated!');
    setTimeout(() => setSaveSuccessMsg(null), 2000);
    if (onLicenseChanged) onLicenseChanged();
  };

  const filteredLicenses = licenses.filter(
    (l) =>
      l.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.boundHardwareId && l.boundHardwareId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">RICH X CAM LIVE — Owner & Admin Dashboard</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  OFFLINE & LOCAL LEDGER
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generate Product Keys &bull; Bind & Unbind Hardware IDs &bull; Manage Minute Timers
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

        {/* Auth Gate if not logged in */}
        {!isAuthenticated ? (
          <div className="p-8 max-w-md mx-auto w-full my-auto text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/70 border border-indigo-700/50 mx-auto flex items-center justify-center text-indigo-400">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Enter Master Admin Passcode</h3>
              <p className="text-xs text-slate-400 mt-1">
                Authorized administrator access only. (Default password: <code className="text-indigo-300 font-mono">admin</code>)
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                autoFocus
              />

              {authError && (
                <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-900/60 p-2.5 rounded-lg flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/30"
              >
                Unlock Administrator Control Panel
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard Content */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('licenses')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'licenses'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Product Keys & PC Bindings ({licenses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timer')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'timer'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Timer & Minute Consumption</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('engine')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'engine'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Master Engine Vault</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'security'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Password</span>
              </button>
            </div>

            {/* Notification Banner */}
            {saveSuccessMsg && (
              <div className="bg-emerald-950/60 border-b border-emerald-900/60 px-6 py-2 text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: LICENSES & PC BINDINGS */}
              {activeTab === 'licenses' && (
                <div className="space-y-6">
                  {/* Generator Panel */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-400" />
                        <span>Generate New License Key for Customer</span>
                      </h3>
                      <span className="text-[10px] text-slate-400">Binds to Customer's PC on first entry</span>
                    </div>

                    <form onSubmit={handleGenerateKey} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] text-slate-400 mb-1">Customer Name / Identifier</label>
                        <input
                          type="text"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="e.g. VIP Client Alex"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-slate-400 mb-1">Allocated Call Minutes</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="5"
                            max="100000"
                            step="5"
                            disabled={isUnlimited}
                            value={newAllocatedMinutes}
                            onChange={(e) => setNewAllocatedMinutes(parseInt(e.target.value, 10) || 60)}
                            className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                          <label className="flex items-center gap-1 text-[10px] text-slate-300 whitespace-nowrap cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isUnlimited}
                              onChange={(e) => setIsUnlimited(e.target.checked)}
                              className="rounded accent-indigo-600"
                            />
                            <span>VIP ∞</span>
                          </label>
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-slate-400 mb-1">Notes / Plan</label>
                        <input
                          type="text"
                          value={newNotes}
                          onChange={(e) => setNewNotes(e.target.value)}
                          placeholder="e.g. Monthly Standard"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Generate Key</span>
                        </button>
                      </div>
                    </form>

                    {/* Newly Generated Key Display */}
                    {generatedKeyResult && (
                      <div className="mt-2 bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-xl flex items-center justify-between animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">
                              Product Key Generated Successfully:
                            </span>
                            <span className="text-sm font-mono font-extrabold text-white tracking-wider">
                              {generatedKeyResult}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(generatedKeyResult)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          {copiedKey === generatedKeyResult ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === generatedKeyResult ? 'Copied!' : 'Copy Key'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search key, customer, or PC HWID..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      Showing {filteredLicenses.length} of {licenses.length} keys
                    </span>
                  </div>

                  {/* Licenses Table */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
                            <th className="py-3 px-4">Product Key</th>
                            <th className="py-3 px-3">Customer</th>
                            <th className="py-3 px-3">Bound PC (HWID)</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Minutes (Used / Total)</th>
                            <th className="py-3 px-3">Remaining</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredLicenses.map((lic) => {
                            const isBound = Boolean(lic.boundHardwareId);
                            const isCurrentCopied = copiedKey === lic.key;
                            return (
                              <tr key={lic.key} className="hover:bg-slate-900/50 transition-colors">
                                {/* Key & Copy */}
                                <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span>{lic.key}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(lic.key)}
                                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                                      title="Copy Product Key"
                                    >
                                      {isCurrentCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>

                                {/* Customer */}
                                <td className="py-3 px-3 text-slate-300">
                                  <div className="font-semibold">{lic.clientName}</div>
                                  {lic.notes && <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{lic.notes}</div>}
                                </td>

                                {/* Bound PC */}
                                <td className="py-3 px-3">
                                  {isBound ? (
                                    <div className="space-y-0.5">
                                      <div className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                        <Cpu className="w-3 h-3" />
                                        <span className="truncate max-w-[130px]" title={lic.boundHardwareId!}>
                                          {lic.boundHardwareId}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                        {lic.boundDeviceName || 'Registered PC'}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-amber-400/80 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded-full">
                                      Unbound (Ready)
                                    </span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="py-3 px-3">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      lic.status === 'active'
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                                        : lic.status === 'suspended'
                                        ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                                        : lic.status === 'depleted'
                                        ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                                        : 'bg-slate-800 text-slate-300 border-slate-700'
                                    }`}
                                  >
                                    {lic.status.toUpperCase()}
                                  </span>
                                </td>

                                {/* Minutes Used / Total */}
                                <td className="py-3 px-3 font-mono text-slate-300">
                                  {lic.isUnlimited ? (
                                    <span className="text-indigo-400 font-bold">VIP Unlimited</span>
                                  ) : (
                                    <span>
                                      {lic.usedMinutes.toFixed(1)} / {lic.allocatedMinutes}m
                                    </span>
                                  )}
                                </td>

                                {/* Remaining Minutes */}
                                <td className="py-3 px-3 font-mono font-bold">
                                  {lic.isUnlimited ? (
                                    <span className="text-indigo-400">∞</span>
                                  ) : (
                                    <span className={lic.remainingMinutes > 5 ? 'text-emerald-400' : 'text-rose-400'}>
                                      {lic.remainingMinutes.toFixed(1)}m
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Add Minutes */}
                                    {!lic.isUnlimited && (
                                      <button
                                        type="button"
                                        onClick={() => setTopUpKey(lic.key)}
                                        className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded text-[11px] font-medium transition-colors"
                                        title="Add minutes to key"
                                      >
                                        + Mins
                                      </button>
                                    )}

                                    {/* Unbind PC */}
                                    {isBound && (
                                      <button
                                        type="button"
                                        onClick={() => handleUnbindPC(lic.key)}
                                        className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded text-[11px] font-medium transition-colors"
                                        title="Unbind this PC so the user can transfer to another computer"
                                      >
                                        Unbind PC
                                      </button>
                                    )}

                                    {/* Suspend / Resume */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSuspend(lic.key)}
                                      className={`p-1 rounded transition-colors ${
                                        lic.status === 'suspended'
                                          ? 'text-emerald-400 hover:bg-emerald-950'
                                          : 'text-amber-400 hover:bg-amber-950'
                                      }`}
                                      title={lic.status === 'suspended' ? 'Activate Key' : 'Suspend Key'}
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteKey(lic.key)}
                                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950 transition-colors"
                                      title="Delete key"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TIMER & MINUTE CONSUMPTION ENGINE */}
              {activeTab === 'timer' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Clock className="w-5 h-5" />
                      <span>How Call Minutes Run Down (Timer Consumption Rules)</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Configure how fast users consume minutes during live calls. This gives you full control over your server and GPU budget.
                    </p>

                    <div className="space-y-4 pt-2">
                      {/* Standard Video Multiplier */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-semibold text-slate-200">
                            Standard Video Transformation Burn Rate
                          </label>
                          <span className="font-mono text-indigo-400 font-bold">
                            {timerConfig.videoOnlyRateMultiplier}x (1 real minute = {timerConfig.videoOnlyRateMultiplier} license min)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="3.0"
                          step="0.25"
                          value={timerConfig.videoOnlyRateMultiplier}
                          onChange={(e) =>
                            setTimerConfig({
                              ...timerConfig,
                              videoOnlyRateMultiplier: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Cloned Voice + Video Multiplier */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-semibold text-slate-200">
                            Cloned Voice + Video High-Load Burn Rate
                          </label>
                          <span className="font-mono text-indigo-400 font-bold">
                            {timerConfig.clonedVoiceRateMultiplier}x (1 real minute = {timerConfig.clonedVoiceRateMultiplier} license min)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="4.0"
                          step="0.25"
                          value={timerConfig.clonedVoiceRateMultiplier}
                          onChange={(e) =>
                            setTimerConfig({
                              ...timerConfig,
                              clonedVoiceRateMultiplier: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">
                          Because voice cloning consumes extra compute, you can charge 1.5x or 2x minutes when users enable real-time speech conversion.
                        </p>
                      </div>

                      {/* Warning Threshold */}
                      <div className="space-y-1.5 pt-2">
                        <label className="block text-xs font-semibold text-slate-200">
                          Low Minutes Warning Alert (Minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={timerConfig.warningThresholdMinutes}
                          onChange={(e) =>
                            setTimerConfig({
                              ...timerConfig,
                              warningThresholdMinutes: parseInt(e.target.value, 10) || 5,
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                        />
                        <p className="text-[10px] text-slate-500">
                          The client HUD will pulse yellow/red when remaining minutes fall below this threshold.
                        </p>
                      </div>

                      {/* Strict Cutoff Toggle */}
                      <div className="pt-2">
                        <label className="flex items-start gap-3 cursor-pointer bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                          <input
                            type="checkbox"
                            checked={timerConfig.autoTerminateAtZero}
                            onChange={(e) =>
                              setTimerConfig({
                                ...timerConfig,
                                autoTerminateAtZero: e.target.checked,
                              })
                            }
                            className="mt-0.5 rounded accent-indigo-600"
                          />
                          <div>
                            <div className="text-xs font-semibold text-white">Strict Auto-Termination at 0 Minutes</div>
                            <div className="text-[11px] text-slate-400">
                              Automatically cuts off the video camera and microphone feed as soon as the user's minutes reach zero.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveTimerConfig}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow"
                    >
                      Save Timer Consumption Rules
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: MASTER ENGINE VAULT */}
              {activeTab === 'engine' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Zap className="w-5 h-5" />
                      <span>Master Engine Key Vault (Zero-Configuration for Customers)</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      By entering your Master API Keys here, your customers do <strong>NOT</strong> need to enter or see any keys. The software uses your master keys securely when an activated Product Key is verified.
                    </p>

                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Master Real-Time Video Engine Key:
                        </label>
                        <input
                          type="password"
                          value={adminConfig.masterVideoEngineKey}
                          onChange={(e) =>
                            setAdminConfig({ ...adminConfig, masterVideoEngineKey: e.target.value })
                          }
                          placeholder="Enter master video engine key..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Master Real-Time Voice Engine Key:
                        </label>
                        <input
                          type="password"
                          value={adminConfig.masterVoiceEngineKey}
                          onChange={(e) =>
                            setAdminConfig({ ...adminConfig, masterVoiceEngineKey: e.target.value })
                          }
                          placeholder="Enter master voice engine key..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAdminConfig}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow"
                    >
                      Save Master Keys to Application Vault
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: ADMIN PASSWORD */}
              {activeTab === 'security' && (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Lock className="w-5 h-5" />
                      <span>Change Master Admin Password</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Update the master passcode used to unlock this Owner Control Panel.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          New Master Admin Password:
                        </label>
                        <input
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Enter new admin password..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAdminConfig}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow"
                    >
                      Update Master Admin Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Up Modal Sub-dialog */}
        {topUpKey && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Add Minutes to License</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Key: <strong className="text-white">{topUpKey}</strong>
              </p>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Minutes to Add:</label>
                <input
                  type="number"
                  min="5"
                  max="10000"
                  step="5"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(parseInt(e.target.value, 10) || 15)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTopUpKey(null)}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyTopUp}
                  className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs"
                >
                  Confirm +{topUpAmount}m
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
