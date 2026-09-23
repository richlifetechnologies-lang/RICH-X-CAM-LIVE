import {
  LicenseKeyItem,
  TimerConsumptionConfig,
  AdminSecurityConfig,
  ActivationResult,
  ApiKeyVaultItem,
  LicenseFeatureMode,
  SessionFinancials,
} from '../../types/licensing';
import { StudioCallMode } from '../../types/cloudCall';
import { BillingRateEngine } from '../billing/BillingRateEngine';

const STORAGE_LICENSES = 'richx_cam_licenses_registry_v1';
const STORAGE_CURRENT_LICENSE = 'richx_cam_active_client_license_v1';
const STORAGE_HWID = 'richx_cam_machine_hwid_v1';
const STORAGE_TIMER_CONFIG = 'richx_cam_timer_config_v1';
const STORAGE_ADMIN_CONFIG = 'richx_cam_admin_config_v1';
const STORAGE_VAULT_KEYS = 'richx_cam_api_key_vault_v1';

const DEFAULT_TIMER_CONFIG: TimerConsumptionConfig = {
  videoOnlyRateMultiplier: 1.0,
  clonedVoiceRateMultiplier: 1.0,
  warningThresholdMinutes: 5,
  autoTerminateAtZero: true,
};

const DEFAULT_ADMIN_CONFIG: AdminSecurityConfig = {
  masterAdminPassword: '56bV9YA20',
  masterVideoEngineKey: '',
  masterVoiceEngineKey: '',
};

const INITIAL_STARTER_KEY: LicenseKeyItem = {
  key: 'RICHX-DEMO-60MIN-LIVE',
  clientName: 'Demo Starter License (Video + Audio)',
  allocatedMinutes: 60,
  usedMinutes: 0,
  remainingMinutes: 60,
  isUnlimited: false,
  status: 'unactivated',
  boundHardwareId: null,
  boundDeviceName: null,
  firstActivatedAt: null,
  lastActiveAt: null,
  createdAt: Date.now(),
  notes: 'Pre-seeded starter key assigned to Video Call + Audio Call',
  featureMode: 'video_audio',
  assignedVideoKeyId: null,
  assignedVoiceKeyId: null,
};

export class LicenseService {
  /**
   * Generates or retrieves a unique persistent Machine Hardware ID (HWID)
   */
  public static getMachineHWID(): string {
    let hwid = localStorage.getItem(STORAGE_HWID);
    if (!hwid) {
      const platformInfo = [
        navigator.userAgent,
        navigator.hardwareConcurrency || 4,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ].join(';');

      let hash = 0;
      for (let i = 0; i < platformInfo.length; i++) {
        const char = platformInfo.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      const randomSeed = Math.random().toString(36).substring(2, 6).toUpperCase();
      hwid = `HWID-WIN-${Math.abs(hash).toString(16).toUpperCase().padStart(6, '0')}-${randomSeed}`;
      localStorage.setItem(STORAGE_HWID, hwid);
    }
    return hwid;
  }

  public static getDeviceName(): string {
    const isMac = navigator.userAgent.includes('Mac');
    const isWin = navigator.userAgent.includes('Windows');
    const os = isWin ? 'Windows PC' : isMac ? 'macOS' : 'Desktop';
    const hwidShort = this.getMachineHWID().split('-').slice(-2).join('-');
    return `${os} (${hwidShort})`;
  }

  // --- API KEY VAULT (POOLS OF VIDEO & VOICE KEYS) ---
  public static getAllVaultKeys(): ApiKeyVaultItem[] {
    try {
      const data = localStorage.getItem(STORAGE_VAULT_KEYS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveAllVaultKeys(keys: ApiKeyVaultItem[]): void {
    localStorage.setItem(STORAGE_VAULT_KEYS, JSON.stringify(keys));
  }

  public static getVaultKeysByType(type: 'video' | 'voice'): ApiKeyVaultItem[] {
    return this.getAllVaultKeys().filter((k) => k.type === type);
  }

  public static getVaultKeyById(id: string | null | undefined): ApiKeyVaultItem | null {
    if (!id) return null;
    const all = this.getAllVaultKeys();
    return all.find((k) => k.id === id) || null;
  }

  public static addVaultKey(
    name: string,
    type: 'video' | 'voice',
    apiKey: string,
    provider = '',
    notes = ''
  ): ApiKeyVaultItem {
    const id = `KEY-${type.toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ApiKeyVaultItem = {
      id,
      name: name.trim() || `${type === 'video' ? 'Video' : 'Voice'} Key #${this.getAllVaultKeys().length + 1}`,
      type,
      apiKey: apiKey.trim(),
      provider: provider.trim() || (type === 'video' ? 'WebRTC Realtime Video Engine' : 'ElevenLabs Speech-to-Speech'),
      notes: notes.trim(),
      createdAt: Date.now(),
    };

    const all = this.getAllVaultKeys();
    this.saveAllVaultKeys([newItem, ...all]);
    return newItem;
  }

  public static updateVaultKey(id: string, updates: Partial<ApiKeyVaultItem>): void {
    const all = this.getAllVaultKeys();
    const idx = all.findIndex((k) => k.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      this.saveAllVaultKeys(all);
    }
  }

  public static deleteVaultKey(id: string): void {
    const all = this.getAllVaultKeys().filter((k) => k.id !== id);
    this.saveAllVaultKeys(all);

    // Also unassign from any licenses pointing to this deleted key
    const licenses = this.getAllLicenses();
    let modified = false;
    licenses.forEach((lic) => {
      if (lic.assignedVideoKeyId === id) {
        lic.assignedVideoKeyId = null;
        modified = true;
      }
      if (lic.assignedVoiceKeyId === id) {
        lic.assignedVoiceKeyId = null;
        modified = true;
      }
    });
    if (modified) {
      this.saveAllLicenses(licenses);
    }
  }

  // --- LICENSES REGISTRY ---
  public static getAllLicenses(): LicenseKeyItem[] {
    try {
      const data = localStorage.getItem(STORAGE_LICENSES);
      if (!data) {
        const initial = [INITIAL_STARTER_KEY];
        localStorage.setItem(STORAGE_LICENSES, JSON.stringify(initial));
        return initial;
      }
      const parsed: LicenseKeyItem[] = JSON.parse(data);
      // Ensure backwards compatibility with featureMode
      return parsed.map((item) => ({
        ...item,
        featureMode: item.featureMode || 'full',
        assignedVideoKeyId: item.assignedVideoKeyId ?? null,
        assignedVoiceKeyId: item.assignedVoiceKeyId ?? null,
      }));
    } catch {
      return [INITIAL_STARTER_KEY];
    }
  }

  public static saveAllLicenses(licenses: LicenseKeyItem[]): void {
    localStorage.setItem(STORAGE_LICENSES, JSON.stringify(licenses));
  }

  public static getAssignedStudioMode(mode: LicenseFeatureMode): 'video_audio' | 'audio_only' | 'video_only' | 'all' {
    if (mode === 'all') return 'all';
    if (mode === 'audio_only' || mode === 'voice_only') return 'audio_only';
    if (mode === 'video_only') return 'video_only';
    return 'video_audio';
  }

  public static isTabAccessible(
    tab: 'video_audio' | 'audio_only' | 'video_only',
    license: LicenseKeyItem | null
  ): boolean {
    if (!license) return false;
    const assigned = this.getAssignedStudioMode(license.featureMode);
    if (assigned === 'all') return true;
    return assigned === tab;
  }

  public static getFeatureModeDisplayName(mode: LicenseFeatureMode): string {
    switch (mode) {
      case 'video_audio':
      case 'full':
        return 'Video Call + Audio Call';
      case 'audio_only':
      case 'voice_only':
        return 'Audio Calls Only';
      case 'video_only':
        return 'Video Calls Only';
      case 'all':
        return 'All 3 Modes (Admin VIP)';
      default:
        return 'Video Call + Audio Call';
    }
  }

  public static generateKey(
    clientName: string,
    minutes: number,
    isUnlimited = false,
    notes = '',
    featureMode: LicenseFeatureMode = 'video_audio',
    assignedVideoKeyId: string | null = null,
    assignedVoiceKeyId: string | null = null,
    clientPriceChargedUsd = 0
  ): LicenseKeyItem {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));

    let prefix = 'VDA';
    if (featureMode === 'audio_only' || featureMode === 'voice_only') prefix = 'AUD';
    else if (featureMode === 'video_only') prefix = 'VDO';
    else if (featureMode === 'all') prefix = 'ALL';
    else prefix = 'VDA';

    const key = `RICHX-${prefix}-${p1}-${p2}`;

    const isAudioOnly = featureMode === 'audio_only' || featureMode === 'voice_only';
    const isVideoOnly = featureMode === 'video_only';

    const safeMinutes = isUnlimited ? 999999 : Math.max(1, Math.round(Number(minutes) || 1));

    const newLicense: LicenseKeyItem = {
      key,
      clientName: clientName.trim() || 'Valued Customer',
      allocatedMinutes: safeMinutes,
      usedMinutes: 0,
      remainingMinutes: safeMinutes,
      isUnlimited,
      status: 'unactivated',
      boundHardwareId: null,
      boundDeviceName: null,
      firstActivatedAt: null,
      lastActiveAt: null,
      createdAt: Date.now(),
      notes: notes.trim(),
      featureMode,
      assignedVideoKeyId: isAudioOnly ? null : assignedVideoKeyId,
      assignedVoiceKeyId: isVideoOnly ? null : assignedVoiceKeyId,
      clientPriceChargedUsd: Math.max(0, clientPriceChargedUsd || 0),
    };

    const all = this.getAllLicenses();
    const updated = [newLicense, ...all];
    this.saveAllLicenses(updated);
    return newLicense;
  }

  public static updateLicensePrice(key: string, price: number): void {
    const all = this.getAllLicenses();
    const license = all.find((l) => l.key === key);
    if (license) {
      license.clientPriceChargedUsd = Math.max(0, price || 0);
      this.saveAllLicenses(all);

      const current = this.getActiveClientLicense();
      if (current && current.key === key) {
        current.clientPriceChargedUsd = license.clientPriceChargedUsd;
        localStorage.setItem(STORAGE_CURRENT_LICENSE, JSON.stringify(current));
      }
    }
  }

  public static updateLicensePermissions(
    key: string,
    featureMode: LicenseFeatureMode,
    assignedVideoKeyId: string | null,
    assignedVoiceKeyId: string | null
  ): void {
    const all = this.getAllLicenses();
    const license = all.find((l) => l.key === key);
    if (license) {
      const isAudioOnly = featureMode === 'audio_only' || featureMode === 'voice_only';
      const isVideoOnly = featureMode === 'video_only';

      license.featureMode = featureMode;
      license.assignedVideoKeyId = isAudioOnly ? null : assignedVideoKeyId;
      license.assignedVoiceKeyId = isVideoOnly ? null : assignedVoiceKeyId;
      this.saveAllLicenses(all);

      const current = this.getActiveClientLicense();
      if (current && current.key === key) {
        localStorage.setItem(STORAGE_CURRENT_LICENSE, JSON.stringify(license));
      }
    }
  }

  // --- RESOLVE EFFECTIVE API KEYS & PERMISSIONS FOR CLIENT CALLS ---
  public static getEffectiveKeysForLicense(license: LicenseKeyItem | null): {
    videoKey: string;
    voiceKey: string;
    featureMode: LicenseFeatureMode;
    isVideoAllowed: boolean;
    isVoiceAllowed: boolean;
    videoKeyLabel: string;
    voiceKeyLabel: string;
  } {
    const adminConfig = this.getAdminConfig();
    if (!license) {
      return {
        videoKey: adminConfig.masterVideoEngineKey || '',
        voiceKey: adminConfig.masterVoiceEngineKey || '',
        featureMode: 'video_audio',
        isVideoAllowed: true,
        isVoiceAllowed: true,
        videoKeyLabel: 'Master Default',
        voiceKeyLabel: 'Master Default',
      };
    }

    const mode = license.featureMode || 'video_audio';
    const assignedMode = this.getAssignedStudioMode(mode);

    let videoKey = '';
    let videoKeyLabel = 'None';
    let voiceKey = '';
    let voiceKeyLabel = 'None';

    const isVideoAllowed = assignedMode === 'video_audio' || assignedMode === 'video_only' || assignedMode === 'all';
    const isVoiceAllowed = assignedMode === 'video_audio' || assignedMode === 'audio_only' || assignedMode === 'all';

    // Resolve Video Key if allowed
    if (isVideoAllowed) {
      if (license.assignedVideoKeyId) {
        const vaultItem = this.getVaultKeyById(license.assignedVideoKeyId);
        if (vaultItem && vaultItem.apiKey) {
          videoKey = vaultItem.apiKey;
          videoKeyLabel = vaultItem.name;
        } else {
          videoKey = adminConfig.masterVideoEngineKey || '';
          videoKeyLabel = 'Master Default';
        }
      } else {
        videoKey = adminConfig.masterVideoEngineKey || '';
        videoKeyLabel = 'Master Default';
      }
    }

    // Resolve Voice Key if allowed
    if (isVoiceAllowed) {
      if (license.assignedVoiceKeyId) {
        const vaultItem = this.getVaultKeyById(license.assignedVoiceKeyId);
        if (vaultItem && vaultItem.apiKey) {
          voiceKey = vaultItem.apiKey;
          voiceKeyLabel = vaultItem.name;
        } else {
          voiceKey = adminConfig.masterVoiceEngineKey || '';
          voiceKeyLabel = 'Master Default';
        }
      } else {
        voiceKey = adminConfig.masterVoiceEngineKey || '';
        voiceKeyLabel = 'Master Default';
      }
    }

    return {
      videoKey,
      voiceKey,
      featureMode: mode,
      isVideoAllowed,
      isVoiceAllowed,
      videoKeyLabel,
      voiceKeyLabel,
    };
  }

  // --- ACTIVATION & HARDWARE ID BINDING ---
  public static activateKey(inputKey: string): ActivationResult {
    const normalizedKey = inputKey.trim().toUpperCase();
    const all = this.getAllLicenses();
    const license = all.find((l) => l.key.toUpperCase() === normalizedKey);

    if (!license) {
      return {
        success: false,
        message: 'Invalid Product Key. Please check the code or contact support to obtain one.',
      };
    }

    if (license.status === 'suspended') {
      return {
        success: false,
        message: 'This Product Key has been suspended by the administrator.',
      };
    }

    if (license.status === 'depleted' || (!license.isUnlimited && license.remainingMinutes <= 0)) {
      return {
        success: false,
        message: 'This Product Key has depleted all allocated call minutes. Please top up.',
      };
    }

    const currentHWID = this.getMachineHWID();
    const currentDeviceName = this.getDeviceName();

    // Check Hardware Binding (Anti-Piracy & Multi-User protection)
    if (license.boundHardwareId && license.boundHardwareId !== currentHWID) {
      return {
        success: false,
        message: `This Product Key is already permanently bound to another computer (${license.boundDeviceName || 'Other Device'}). Contact the admin to unbind and transfer this license.`,
      };
    }

    // Bind to this hardware if not already bound
    license.boundHardwareId = currentHWID;
    license.boundDeviceName = currentDeviceName;
    license.status = 'active';
    if (!license.firstActivatedAt) {
      license.firstActivatedAt = Date.now();
    }
    license.lastActiveAt = Date.now();

    this.saveAllLicenses(all);
    localStorage.setItem(STORAGE_CURRENT_LICENSE, JSON.stringify(license));

    const modeDesc =
      license.featureMode === 'video_only'
        ? ' [Video Only License]'
        : license.featureMode === 'voice_only'
        ? ' [Voice Cloning Only License]'
        : ' [Full Video & Voice Suite]';

    return {
      success: true,
      message: `Product successfully activated for ${license.clientName}!${modeDesc} ${
        license.isUnlimited ? 'Unlimited VIP Minutes' : `${license.remainingMinutes} Call Minutes remaining`
      }.`,
      license,
    };
  }

  public static getActiveClientLicense(): LicenseKeyItem | null {
    try {
      const stored = localStorage.getItem(STORAGE_CURRENT_LICENSE);
      if (!stored) return null;
      const parsed: LicenseKeyItem = JSON.parse(stored);

      // Verify with master list to check if admin modified or revoked it
      const all = this.getAllLicenses();
      const fresh = all.find((l) => l.key === parsed.key);
      if (!fresh) {
        localStorage.removeItem(STORAGE_CURRENT_LICENSE);
        return null;
      }

      // Verify HWID is still intact
      if (fresh.boundHardwareId && fresh.boundHardwareId !== this.getMachineHWID()) {
        localStorage.removeItem(STORAGE_CURRENT_LICENSE);
        return null;
      }

      return fresh;
    } catch {
      return null;
    }
  }

  public static unbindDevice(key: string): void {
    const all = this.getAllLicenses();
    const license = all.find((l) => l.key === key);
    if (license) {
      license.boundHardwareId = null;
      license.boundDeviceName = null;
      license.status = 'unactivated';
      this.saveAllLicenses(all);

      const current = this.getActiveClientLicense();
      if (current && current.key === key) {
        localStorage.removeItem(STORAGE_CURRENT_LICENSE);
      }
    }
  }

  public static addMinutes(key: string, minutesToAdd: number): void {
    const all = this.getAllLicenses();
    const license = all.find((l) => l.key === key);
    const safeAdd = Math.max(1, Math.round(Number(minutesToAdd) || 1));
    if (license && !license.isUnlimited) {
      license.allocatedMinutes += safeAdd;
      license.remainingMinutes += safeAdd;
      if (license.remainingMinutes > 0 && license.status === 'depleted') {
        license.status = license.boundHardwareId ? 'active' : 'unactivated';
      }
      this.saveAllLicenses(all);

      const current = this.getActiveClientLicense();
      if (current && current.key === key) {
        localStorage.setItem(STORAGE_CURRENT_LICENSE, JSON.stringify(license));
      }
    }
  }

  public static toggleSuspend(key: string): void {
    const all = this.getAllLicenses();
    const license = all.find((l) => l.key === key);
    if (license) {
      license.status = license.status === 'suspended' ? (license.boundHardwareId ? 'active' : 'unactivated') : 'suspended';
      this.saveAllLicenses(all);
    }
  }

  public static deleteLicense(key: string): void {
    const all = this.getAllLicenses();
    const filtered = all.filter((l) => l.key !== key);
    this.saveAllLicenses(filtered);

    const current = this.getActiveClientLicense();
    if (current && current.key === key) {
      localStorage.removeItem(STORAGE_CURRENT_LICENSE);
    }
  }

  // --- USAGE DEDUCTION (TICK BY TICK WITH VERIFIED API COSTS) ---
  public static deductUsageSecond(
    secondsSpent = 1,
    isClonedVoice = false,
    mode: StudioCallMode = 'video_audio'
  ): {
    remainingMinutes: number;
    shouldTerminate: boolean;
    financials: SessionFinancials;
  } {
    const financials = BillingRateEngine.calculateSessionFinancials(secondsSpent, mode, isClonedVoice);
    const current = this.getActiveClientLicense();
    if (!current) {
      return { remainingMinutes: 0, shouldTerminate: true, financials };
    }

    if (current.isUnlimited) {
      return { remainingMinutes: 999999, shouldTerminate: false, financials };
    }

    const timerConfig = this.getTimerConfig();
    const dynamicMultiplier = BillingRateEngine.getMinuteConsumptionMultiplier(mode, isClonedVoice, current.featureMode);
    const effectiveSeconds = secondsSpent * dynamicMultiplier;
    const minutesToDeduct = effectiveSeconds / 60;

    const all = this.getAllLicenses();
    const master = all.find((l) => l.key === current.key);
    if (!master) {
      return { remainingMinutes: 0, shouldTerminate: true, financials };
    }

    master.usedMinutes = +(master.usedMinutes + minutesToDeduct).toFixed(2);
    master.remainingMinutes = Math.max(0, +(master.allocatedMinutes - master.usedMinutes).toFixed(2));
    master.lastActiveAt = Date.now();

    let shouldTerminate = false;
    if (master.remainingMinutes <= 0) {
      master.remainingMinutes = 0;
      master.status = 'depleted';
      if (timerConfig.autoTerminateAtZero) {
        shouldTerminate = true;
      }
    }

    this.saveAllLicenses(all);
    localStorage.setItem(STORAGE_CURRENT_LICENSE, JSON.stringify(master));

    return {
      remainingMinutes: master.remainingMinutes,
      shouldTerminate,
      financials,
    };
  }

  // --- TIMER CONFIGURATION ---
  public static getTimerConfig(): TimerConsumptionConfig {
    try {
      const data = localStorage.getItem(STORAGE_TIMER_CONFIG);
      if (!data) return DEFAULT_TIMER_CONFIG;
      return { ...DEFAULT_TIMER_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_TIMER_CONFIG;
    }
  }

  public static saveTimerConfig(cfg: Partial<TimerConsumptionConfig>): TimerConsumptionConfig {
    const current = this.getTimerConfig();
    const merged = { ...current, ...cfg };
    localStorage.setItem(STORAGE_TIMER_CONFIG, JSON.stringify(merged));
    return merged;
  }

  // --- ADMIN SECURITY CONFIGURATION ---
  public static getAdminConfig(): AdminSecurityConfig {
    try {
      const data = localStorage.getItem(STORAGE_ADMIN_CONFIG);
      if (!data) return DEFAULT_ADMIN_CONFIG;
      const parsed = JSON.parse(data);
      if (parsed.masterAdminPassword === 'admin') {
        parsed.masterAdminPassword = '56bV9YA20';
        localStorage.setItem(STORAGE_ADMIN_CONFIG, JSON.stringify(parsed));
      }
      return { ...DEFAULT_ADMIN_CONFIG, ...parsed };
    } catch {
      return DEFAULT_ADMIN_CONFIG;
    }
  }

  public static saveAdminConfig(cfg: Partial<AdminSecurityConfig>): AdminSecurityConfig {
    const current = this.getAdminConfig();
    const merged = { ...current, ...cfg };
    localStorage.setItem(STORAGE_ADMIN_CONFIG, JSON.stringify(merged));
    return merged;
  }

  public static verifyAdminPassword(pass: string): boolean {
    const config = this.getAdminConfig();
    return pass.trim() === config.masterAdminPassword;
  }
}
