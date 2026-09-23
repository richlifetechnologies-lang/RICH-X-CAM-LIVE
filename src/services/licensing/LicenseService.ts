import { LicenseKeyItem, TimerConsumptionConfig, AdminSecurityConfig, ActivationResult } from '../../types/licensing';

const STORAGE_LICENSES = 'richx_cam_licenses_registry_v1';
const STORAGE_CURRENT_LICENSE = 'richx_cam_active_client_license_v1';
const STORAGE_HWID = 'richx_cam_machine_hwid_v1';
const STORAGE_TIMER_CONFIG = 'richx_cam_timer_config_v1';
const STORAGE_ADMIN_CONFIG = 'richx_cam_admin_config_v1';

const DEFAULT_TIMER_CONFIG: TimerConsumptionConfig = {
  videoOnlyRateMultiplier: 1.0,
  clonedVoiceRateMultiplier: 1.0,
  warningThresholdMinutes: 5,
  autoTerminateAtZero: true,
};

const DEFAULT_ADMIN_CONFIG: AdminSecurityConfig = {
  masterAdminPassword: 'admin', // Default initial master admin password
  masterVideoEngineKey: '',
  masterVoiceEngineKey: '',
};

const INITIAL_STARTER_KEY: LicenseKeyItem = {
  key: 'RICHX-DEMO-60MIN-LIVE',
  clientName: 'Demo Starter License',
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
  notes: 'Pre-seeded starter key for testing installation',
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

  // --- LICENSES REGISTRY ---
  public static getAllLicenses(): LicenseKeyItem[] {
    try {
      const data = localStorage.getItem(STORAGE_LICENSES);
      if (!data) {
        const initial = [INITIAL_STARTER_KEY];
        localStorage.setItem(STORAGE_LICENSES, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return [INITIAL_STARTER_KEY];
    }
  }

  public static saveAllLicenses(licenses: LicenseKeyItem[]): void {
    localStorage.setItem(STORAGE_LICENSES, JSON.stringify(licenses));
  }

  public static generateKey(
    clientName: string,
    minutes: number,
    isUnlimited = false,
    notes = ''
  ): LicenseKeyItem {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    
    const key = `RICHX-${p1}-${p2}-LIVE`;

    const newLicense: LicenseKeyItem = {
      key,
      clientName: clientName.trim() || 'Valued Customer',
      allocatedMinutes: isUnlimited ? 999999 : minutes,
      usedMinutes: 0,
      remainingMinutes: isUnlimited ? 999999 : minutes,
      isUnlimited,
      status: 'unactivated',
      boundHardwareId: null,
      boundDeviceName: null,
      firstActivatedAt: null,
      lastActiveAt: null,
      createdAt: Date.now(),
      notes: notes.trim(),
    };

    const all = this.getAllLicenses();
    const updated = [newLicense, ...all];
    this.saveAllLicenses(updated);
    return newLicense;
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

    return {
      success: true,
      message: `Product successfully activated for ${license.clientName}! ${
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

      // If active on this machine, clear it
      const current = this.getActiveClientLicense();
      if (current && current.key === key) {
        localStorage.removeItem(STORAGE_CURRENT_LICENSE);
      }
    }
  }

  public static addMinutes(key: string, minutesToAdd: number): void {
    const all = this.getAllLicenses();
    const license = all.find((l) => l.key === key);
    if (license && !license.isUnlimited) {
      license.allocatedMinutes += minutesToAdd;
      license.remainingMinutes += minutesToAdd;
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

  // --- USAGE DEDUCTION (TICK BY TICK) ---
  public static deductUsageSecond(secondsSpent = 1, isClonedVoice = false): { remainingMinutes: number; shouldTerminate: boolean } {
    const current = this.getActiveClientLicense();
    if (!current) {
      return { remainingMinutes: 0, shouldTerminate: true };
    }

    if (current.isUnlimited) {
      return { remainingMinutes: 999999, shouldTerminate: false };
    }

    const timerConfig = this.getTimerConfig();
    const multiplier = isClonedVoice ? timerConfig.clonedVoiceRateMultiplier : timerConfig.videoOnlyRateMultiplier;
    const effectiveSeconds = secondsSpent * multiplier;
    const minutesToDeduct = effectiveSeconds / 60;

    const all = this.getAllLicenses();
    const master = all.find((l) => l.key === current.key);
    if (!master) {
      return { remainingMinutes: 0, shouldTerminate: true };
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
      return { ...DEFAULT_ADMIN_CONFIG, ...JSON.parse(data) };
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
