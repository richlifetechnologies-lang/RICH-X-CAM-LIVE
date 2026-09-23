export interface LicenseKeyItem {
  key: string;
  clientName: string;
  allocatedMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  isUnlimited: boolean;
  status: 'active' | 'suspended' | 'depleted' | 'unactivated';
  boundHardwareId: string | null;
  boundDeviceName: string | null;
  firstActivatedAt: number | null;
  lastActiveAt: number | null;
  createdAt: number;
  notes: string;
}

export interface TimerConsumptionConfig {
  // Speed at which minutes tick down
  videoOnlyRateMultiplier: number; // e.g. 1.0 = standard 1s per 1s
  clonedVoiceRateMultiplier: number; // e.g. 1.5 = burns 1.5x when using heavy cloud voice clone
  warningThresholdMinutes: number; // warn user when 5 mins remain
  autoTerminateAtZero: boolean; // strictly terminate video and mic when 0 mins remain
}

export interface AdminSecurityConfig {
  masterAdminPassword: string; // Plain/hashed comparison for admin portal
  masterVideoEngineKey: string;
  masterVoiceEngineKey: string;
}

export interface ActivationResult {
  success: boolean;
  message: string;
  license?: LicenseKeyItem;
}
