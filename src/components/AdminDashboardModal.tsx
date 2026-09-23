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
  Video,
  Mic,
  Settings,
  Layers,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { LicenseService } from '../services/licensing/LicenseService';
import {
  LicenseKeyItem,
  TimerConsumptionConfig,
  AdminSecurityConfig,
  ApiKeyVaultItem,
  LicenseFeatureMode,
} from '../types/licensing';

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

  // Tabs: 'licenses' | 'vault' | 'timer' | 'engine' | 'security'
  const [activeTab, setActiveTab] = useState<'licenses' | 'vault' | 'timer' | 'engine' | 'security'>('licenses');

  // Licenses state
  const [licenses, setLicenses] = useState<LicenseKeyItem[]>(LicenseService.getAllLicenses());
  const [vaultKeys, setVaultKeys] = useState<ApiKeyVaultItem[]>(LicenseService.getAllVaultKeys());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Generator form
  const [newClientName, setNewClientName] = useState('');
  const [newAllocatedMinutes, setNewAllocatedMinutes] = useState<number>(60);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [newFeatureMode, setNewFeatureMode] = useState<LicenseFeatureMode>('full');
  const [newAssignedVideoKeyId, setNewAssignedVideoKeyId] = useState<string>('');
  const [newAssignedVoiceKeyId, setNewAssignedVoiceKeyId] = useState<string>('');
  const [generatedKeyResult, setGeneratedKeyResult] = useState<string | null>(null);

  // Edit / Assign Keys Modal for Existing License
  const [assigningLicense, setAssigningLicense] = useState<LicenseKeyItem | null>(null);
  const [editFeatureMode, setEditFeatureMode] = useState<LicenseFeatureMode>('full');
  const [editAssignedVideoKeyId, setEditAssignedVideoKeyId] = useState<string>('');
  const [editAssignedVoiceKeyId, setEditAssignedVoiceKeyId] = useState<string>('');

  // Minute Top-Up Modal/Prompt state
  const [topUpKey, setTopUpKey] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(30);

  // New Vault Key Form State
  const [newVaultKeyName, setNewVaultKeyName] = useState('');
  const [newVaultKeyType, setNewVaultKeyType] = useState<'video' | 'voice'>('video');
  const [newVaultApiKey, setNewVaultApiKey] = useState('');
  const [newVaultProvider, setNewVaultProvider] = useState('');
  const [newVaultNotes, setNewVaultNotes] = useState('');

  // Timer & Security configs
  const [timerConfig, setTimerConfig] = useState<TimerConsumptionConfig>(LicenseService.getTimerConfig());
  const [adminConfig, setAdminConfig] = useState<AdminSecurityConfig>(LicenseService.getAdminConfig());
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const refreshAll = () => {
    setLicenses(LicenseService.getAllLicenses());
    setVaultKeys(LicenseService.getAllVaultKeys());
    if (onLicenseChanged) onLicenseChanged();
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (LicenseService.verifyAdminPassword(adminPasswordInput)) {
      setIsAuthenticated(true);
      setAuthError(null);
      refreshAll();
    } else {
      setAuthError('Access Denied. Incorrect Master Admin Password.');
    }
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const created = LicenseService.generateKey(
      newClientName,
      newAllocatedMinutes,
      isUnlimited,
      newNotes,
      newFeatureMode,
      newAssignedVideoKeyId || null,
      newAssignedVoiceKeyId || null
    );
    setGeneratedKeyResult(created.key);
    setNewClientName('');
    setNewNotes('');
    refreshAll();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleUnbindPC = (key: string) => {
    if (confirm(`Unbind Hardware ID from key ${key}? This will allow the customer to activate on a different PC.`)) {
      LicenseService.unbindDevice(key);
      refreshAll();
    }
  };

  const handleToggleSuspend = (key: string) => {
    LicenseService.toggleSuspend(key);
    refreshAll();
  };

  const handleDeleteKey = (key: string) => {
    if (confirm(`Permanently delete license ${key}?`)) {
      LicenseService.deleteLicense(key);
      refreshAll();
    }
  };

  const handleApplyTopUp = () => {
    if (topUpKey && topUpAmount > 0) {
      LicenseService.addMinutes(topUpKey, topUpAmount);
      setTopUpKey(null);
      refreshAll();
    }
  };

  // Assign / Edit Permissions for existing license
  const openAssignModal = (lic: LicenseKeyItem) => {
    setAssigningLicense(lic);
    setEditFeatureMode(lic.featureMode || 'full');
    setEditAssignedVideoKeyId(lic.assignedVideoKeyId || '');
    setEditAssignedVoiceKeyId(lic.assignedVoiceKeyId || '');
  };

  const handleSaveLicensePermissions = () => {
    if (assigningLicense) {
      LicenseService.updateLicensePermissions(
        assigningLicense.key,
        editFeatureMode,
        editAssignedVideoKeyId || null,
        editAssignedVoiceKeyId || null
      );
      setAssigningLicense(null);
      refreshAll();
      setSaveSuccessMsg(`License ${assigningLicense.key} configuration updated!`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  // API Key Vault Handlers
  const handleAddVaultKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultApiKey.trim()) {
      alert('Please enter an API Key value');
      return;
    }
    LicenseService.addVaultKey(
      newVaultKeyName,
      newVaultKeyType,
      newVaultApiKey,
      newVaultProvider,
      newVaultNotes
    );
    setNewVaultKeyName('');
    setNewVaultApiKey('');
    setNewVaultNotes('');
    refreshAll();
    setSaveSuccessMsg(`New ${newVaultKeyType.toUpperCase()} API Key successfully added to vault!`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  const handleDeleteVaultKey = (id: string, name: string) => {
    if (confirm(`Delete key "${name}" from vault? Any licenses assigned to this key will revert to master default.`)) {
      LicenseService.deleteVaultKey(id);
      refreshAll();
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

  const videoVaultKeys = vaultKeys.filter((k) => k.type === 'video');
  const voiceVaultKeys = vaultKeys.filter((k) => k.type === 'voice');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
                Key Vault &bull; Video/Voice Key Assignment &bull; HWID Binding &bull; Minute Consumption Rules
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
                Authorized administrator access only. Enter your private master key to manage licenses and API pools.
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
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('licenses')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'licenses'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Product Keys & Access ({licenses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vault')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'vault'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>API Key Vault & Pools ({vaultKeys.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('timer')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'timer'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Timer & Minute Rules</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('engine')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  activeTab === 'engine'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Master Default Keys</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2.5 font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
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
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-400" />
                        <span>Generate Product Key with Custom Mode & Dedicated API Key</span>
                      </h3>
                      <span className="text-[10px] text-slate-400">Configures Video/Voice feature limits & hardware binding</span>
                    </div>

                    <form onSubmit={handleGenerateKey} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
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
                          <label className="block text-[11px] text-slate-400 mb-1">Plan Notes</label>
                          <input
                            type="text"
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            placeholder="e.g. Standard Audio Only"
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
                      </div>

                      {/* Feature Mode & API Key Assignments Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
                        {/* Feature Mode Selector */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Call Mode Permissions:
                          </label>
                          <select
                            value={newFeatureMode}
                            onChange={(e) => setNewFeatureMode(e.target.value as LicenseFeatureMode)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="full">Full Suite (Video Transformation + Cloned Voice)</option>
                            <option value="video_only">Video Only (Normal Mic Only, Voice Clone Locked)</option>
                            <option value="voice_only">Voice Only (Cloned Voice Calls, Video Locked)</option>
                          </select>
                        </div>

                        {/* Dedicated Video Key Assignment */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                            <Video className="w-3 h-3 text-purple-400" />
                            <span>Assigned Video API Key:</span>
                          </label>
                          <select
                            value={newAssignedVideoKeyId}
                            onChange={(e) => setNewAssignedVideoKeyId(e.target.value)}
                            disabled={newFeatureMode === 'voice_only'}
                            className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Default (Master Video Engine Key)</option>
                            {videoVaultKeys.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.name} ({k.provider || 'WebRTC Video'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Dedicated Voice Key Assignment */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                            <Mic className="w-3 h-3 text-sky-400" />
                            <span>Assigned Voice API Key:</span>
                          </label>
                          <select
                            value={newAssignedVoiceKeyId}
                            onChange={(e) => setNewAssignedVoiceKeyId(e.target.value)}
                            disabled={newFeatureMode === 'video_only'}
                            className="w-full bg-slate-900 border border-slate-700 disabled:opacity-40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Default (Master Voice Engine Key)</option>
                            {voiceVaultKeys.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.name} ({k.provider || 'Speech Engine'})
                              </option>
                            ))}
                          </select>
                        </div>
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
                            <th className="py-3 px-3">Allowed Mode</th>
                            <th className="py-3 px-3">Assigned API Keys</th>
                            <th className="py-3 px-3">Bound PC (HWID)</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3">Minutes Left</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredLicenses.map((lic) => {
                            const isBound = Boolean(lic.boundHardwareId);
                            const isCurrentCopied = copiedKey === lic.key;
                            const videoKeyItem = LicenseService.getVaultKeyById(lic.assignedVideoKeyId);
                            const voiceKeyItem = LicenseService.getVaultKeyById(lic.assignedVoiceKeyId);

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

                                {/* Allowed Mode */}
                                <td className="py-3 px-3">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      lic.featureMode === 'video_only'
                                        ? 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                                        : lic.featureMode === 'voice_only'
                                        ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                                        : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60'
                                    }`}
                                  >
                                    {lic.featureMode === 'video_only'
                                      ? 'VIDEO ONLY'
                                      : lic.featureMode === 'voice_only'
                                      ? 'VOICE ONLY'
                                      : 'FULL (VDO+VOC)'}
                                  </span>
                                </td>

                                {/* Assigned API Keys */}
                                <td className="py-3 px-3 text-[10px] space-y-0.5 font-mono">
                                  {lic.featureMode !== 'voice_only' && (
                                    <div className="text-purple-300 flex items-center gap-1">
                                      <Video className="w-3 h-3" />
                                      <span className="truncate max-w-[110px]" title={videoKeyItem?.name || 'Master Video Key'}>
                                        {videoKeyItem ? videoKeyItem.name : 'Master Default'}
                                      </span>
                                    </div>
                                  )}
                                  {lic.featureMode !== 'video_only' && (
                                    <div className="text-sky-300 flex items-center gap-1">
                                      <Mic className="w-3 h-3" />
                                      <span className="truncate max-w-[110px]" title={voiceKeyItem?.name || 'Master Voice Key'}>
                                        {voiceKeyItem ? voiceKeyItem.name : 'Master Default'}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Bound PC */}
                                <td className="py-3 px-3">
                                  {isBound ? (
                                    <div className="space-y-0.5">
                                      <div className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                                        <Cpu className="w-3 h-3" />
                                        <span className="truncate max-w-[120px]" title={lic.boundHardwareId!}>
                                          {lic.boundHardwareId}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
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
                                    {/* Assign Keys / Mode */}
                                    <button
                                      type="button"
                                      onClick={() => openAssignModal(lic)}
                                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition-colors flex items-center gap-1"
                                      title="Assign or change Video/Voice API keys and feature modes"
                                    >
                                      <Sliders className="w-3 h-3 text-indigo-400" />
                                      <span>Assign</span>
                                    </button>

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
                                        Unbind
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

              {/* TAB 2: API KEY VAULT & POOLS (ENTER MORE VIDEO & VOICE API KEYS) */}
              {activeTab === 'vault' && (
                <div className="space-y-6">
                  {/* Top Intro */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-400" />
                        <span>API Key Vault & Dedicated Pools</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Add and manage multiple Video API Keys and Voice API Keys. Assign distinct keys to clients to segment usage and enforce video-only or voice-only plans.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
                        {videoVaultKeys.length} Video Keys
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800/60 font-semibold">
                        {voiceVaultKeys.length} Voice Keys
                      </span>
                    </div>
                  </div>

                  {/* Add New Vault Key Form */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Add New API Key to Vault</span>
                    </h4>

                    <form onSubmit={handleAddVaultKey} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-slate-400 mb-1">Key Type / Category</label>
                        <select
                          value={newVaultKeyType}
                          onChange={(e) => setNewVaultKeyType(e.target.value as 'video' | 'voice')}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                        >
                          <option value="video">VIDEO API KEY (WebRTC/Realtime Camera)</option>
                          <option value="voice">VOICE API KEY (ElevenLabs Speech Clone)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-slate-400 mb-1">Key Label / Friendly Name</label>
                        <input
                          type="text"
                          value={newVaultKeyName}
                          onChange={(e) => setNewVaultKeyName(e.target.value)}
                          placeholder="e.g. VIP Video Pool #1"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] text-slate-400 mb-1">API Key Secret Value</label>
                        <input
                          type="password"
                          value={newVaultApiKey}
                          onChange={(e) => setNewVaultApiKey(e.target.value)}
                          placeholder="Enter secret key string..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Save to Vault</span>
                        </button>
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[11px] text-slate-400 mb-1">Provider (Optional)</label>
                        <input
                          type="text"
                          value={newVaultProvider}
                          onChange={(e) => setNewVaultProvider(e.target.value)}
                          placeholder="e.g. ElevenLabs Tier 3, Runway WebRTC, Livepeer"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-6">
                        <label className="block text-[11px] text-slate-400 mb-1">Internal Notes (Optional)</label>
                        <input
                          type="text"
                          value={newVaultNotes}
                          onChange={(e) => setNewVaultNotes(e.target.value)}
                          placeholder="e.g. Dedicated for high-paying corporate accounts"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </form>
                  </div>

                  {/* Vault Keys Listing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* VIDEO KEYS COLUMN */}
                    <div className="bg-slate-950/70 border border-purple-900/40 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                          <Video className="w-4 h-4" />
                          <span>Video Engine API Keys ({videoVaultKeys.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">For live camera transformation</span>
                      </div>

                      {videoVaultKeys.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          No dedicated Video API keys in vault yet. The default Master Video Key will be used.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {videoVaultKeys.map((k) => {
                            const assignedCount = licenses.filter((l) => l.assignedVideoKeyId === k.id).length;
                            return (
                              <div
                                key={k.id}
                                className="bg-slate-900/80 border border-slate-800 hover:border-purple-800/60 p-3 rounded-xl space-y-1.5 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                                    <span>{k.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50 font-mono">
                                      {assignedCount} license{assignedCount === 1 ? '' : 's'} assigned
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(k.apiKey)}
                                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                                      title="Copy Secret API Key"
                                    >
                                      {copiedKey === k.apiKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVaultKey(k.id, k.name)}
                                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                                      title="Delete key"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                                  <span>Key: &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;{k.apiKey.slice(-6)}</span>
                                  <span className="text-slate-500 text-[10px]">{k.provider}</span>
                                </div>
                                {k.notes && <div className="text-[10px] text-slate-500 truncate">{k.notes}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* VOICE KEYS COLUMN */}
                    <div className="bg-slate-950/70 border border-sky-900/40 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                          <Mic className="w-4 h-4" />
                          <span>Voice Engine API Keys ({voiceVaultKeys.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">For ElevenLabs speech cloning</span>
                      </div>

                      {voiceVaultKeys.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          No dedicated Voice API keys in vault yet. The default Master Voice Key will be used.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {voiceVaultKeys.map((k) => {
                            const assignedCount = licenses.filter((l) => l.assignedVoiceKeyId === k.id).length;
                            return (
                              <div
                                key={k.id}
                                className="bg-slate-900/80 border border-slate-800 hover:border-sky-800/60 p-3 rounded-xl space-y-1.5 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                                    <span>{k.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800/50 font-mono">
                                      {assignedCount} license{assignedCount === 1 ? '' : 's'} assigned
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(k.apiKey)}
                                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                                      title="Copy Secret API Key"
                                    >
                                      {copiedKey === k.apiKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVaultKey(k.id, k.name)}
                                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                                      title="Delete key"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                                  <span>Key: &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;{k.apiKey.slice(-6)}</span>
                                  <span className="text-slate-500 text-[10px]">{k.provider}</span>
                                </div>
                                {k.notes && <div className="text-[10px] text-slate-500 truncate">{k.notes}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TIMER & MINUTE CONSUMPTION ENGINE */}
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

              {/* TAB 4: MASTER ENGINE VAULT (FALLBACK DEFAULT KEYS) */}
              {activeTab === 'engine' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Zap className="w-5 h-5" />
                      <span>Master Fallback Keys (Zero-Configuration for Customers)</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      These are the global fallback keys. When a license does not have an individually assigned key from the Vault, the application automatically uses these master keys.
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
                      Save Master Keys
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: ADMIN PASSWORD */}
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

        {/* ASSIGN / EDIT PERMISSIONS MODAL DIALOG */}
        {assigningLicense && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Assign API Keys & Mode Permissions</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customer: <strong className="text-white">{assigningLicense.clientName}</strong> ({assigningLicense.key})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigningLicense(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Feature Mode Permissions:
                </label>
                <select
                  value={editFeatureMode}
                  onChange={(e) => setEditFeatureMode(e.target.value as LicenseFeatureMode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="full">Full Suite (Both Video & Voice Clone Allowed)</option>
                  <option value="video_only">Video Only (Normal Mic Only, Voice Clone Locked)</option>
                  <option value="voice_only">Voice Only (Cloned Voice Calls, Video Locked)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  {editFeatureMode === 'video_only' &&
                    'Customer can only use live video with normal microphone; voice cloning is disabled in UI.'}
                  {editFeatureMode === 'voice_only' &&
                    'Customer can only use voice cloning for calls; video transformation engine is disabled.'}
                  {editFeatureMode === 'full' && 'Customer can use both live video transformation and voice cloning.'}
                </p>
              </div>

              {/* Video Key Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-purple-400" />
                  <span>Assigned Video API Key:</span>
                </label>
                <select
                  value={editAssignedVideoKeyId}
                  onChange={(e) => setEditAssignedVideoKeyId(e.target.value)}
                  disabled={editFeatureMode === 'voice_only'}
                  className="w-full bg-slate-950 border border-slate-700 disabled:opacity-40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Default (Master Video Engine Key)</option>
                  {videoVaultKeys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.provider || 'Video Engine'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Key Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-sky-400" />
                  <span>Assigned Voice API Key:</span>
                </label>
                <select
                  value={editAssignedVoiceKeyId}
                  onChange={(e) => setEditAssignedVoiceKeyId(e.target.value)}
                  disabled={editFeatureMode === 'video_only'}
                  className="w-full bg-slate-950 border border-slate-700 disabled:opacity-40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Default (Master Voice Engine Key)</option>
                  {voiceVaultKeys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.provider || 'Speech Engine'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssigningLicense(null)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLicensePermissions}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shadow"
                >
                  Save Key Assignments
                </button>
              </div>
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
