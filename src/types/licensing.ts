export type LicenseFeatureMode = 'full' | 'video_only' | 'voice_only';

export interface ApiKeyVaultItem {
  id: string;
  name: string;
  type: 'video' | 'voice';
  apiKey: string;
  provider?: string;
  notes?: string;
  createdAt: number;
}

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

  // Granular Access & Dedicated API Key Bindings
  featureMode: LicenseFeatureMode; // 'full' | 'video_only' | 'voice_only'
  assignedVideoKeyId?: string | null; // ID from ApiKeyVaultItem or null (uses default)
  assignedVoiceKeyId?: string | null; // ID from ApiKeyVaultItem or null (uses default)
}

export interface TimerConsumptionConfig {
  videoOnlyRateMultiplier: number;
  clonedVoiceRateMultiplier: number;
  warningThresholdMinutes: number;
  autoTerminateAtZero: boolean;
}

export interface AdminSecurityConfig {
  masterAdminPassword: string;
  masterVideoEngineKey: string;
  masterVoiceEngineKey: string;
}

export interface ActivationResult {
  success: boolean;
  message: string;
  license?: LicenseKeyItem;
}
