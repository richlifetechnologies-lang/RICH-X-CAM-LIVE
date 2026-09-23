export type LicenseFeatureMode =
  | 'video_audio' // Video Call + Audio Call only
  | 'audio_only'  // Audio Calls Only
  | 'video_only'  // Video Calls Only
  | 'all'         // All 3 Modes Unrestricted (Admin VIP)
  | 'full'        // Backwards compatibility alias for Video + Audio
  | 'voice_only'; // Backwards compatibility alias for Audio Only

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
  featureMode: LicenseFeatureMode;
  assignedVideoKeyId?: string | null; // ID from ApiKeyVaultItem or null (uses default)
  assignedVoiceKeyId?: string | null; // ID from ApiKeyVaultItem or null (uses default)
}

export interface TimerConsumptionConfig {
  videoOnlyRateMultiplier: number;
  clonedVoiceRateMultiplier: number;
  warningThresholdMinutes: number;
  autoTerminateAtZero: boolean;
}

/**
 * Verified Real-Time Operating Costs & Billing Configuration
 * Built upon:
 * 1. fal.ai LUCY 2.5 Real-Time Video Engine: $0.0400 / second ($2.40 / minute)
 * 2. ElevenLabs Speech-to-Speech (STS) Voice Cloning: $0.0025 / second ($0.1500 / minute)
 * 3. Natural Microphone / WebRTC Relay: $0.0001 / second ($0.0060 / minute)
 */
export interface ApiProviderCostConfig {
  // 1. Video Engine API Costs (fal.ai LUCY 2.5)
  lucy25VideoPerSecCost: number; // $0.0400 / sec = $2.40 / min (official fal.ai rate)
  lucyProviderName: string;      // 'fal.ai (Decart LUCY 2.5)'

  // 2. Voice Cloning API Costs (ElevenLabs STS / fal.ai)
  voiceCloningPerSecCost: number; // $0.0025 / sec = $0.1500 / min (ElevenLabs STS)
  voiceProviderName: string;      // 'ElevenLabs Speech-to-Speech (STS)'

  // 3. Natural Audio / WebRTC bandwidth costs
  naturalAudioPerSecCost: number; // $0.0001 / sec = $0.0060 / min

  // 4. Profit Margin Controls (Guaranteeing no operating loss)
  profitMarginPercent: number;          // Default target profit margin (e.g. 40%)
  minGuaranteedProfitMarginPercent: number; // Safety floor (e.g. 25%)

  // 5. Verification & Metadata
  lastVerifiedAt: string;
  sourceNotes: string;
}

export interface SessionFinancials {
  durationSec: number;
  durationFormatted: string;
  
  // Real raw costs incurred
  rawLucyVideoCostUsd: number;
  rawVoiceCloningCostUsd: number;
  rawNaturalAudioCostUsd: number;
  totalRawApiCostUsd: number;

  // Billed / deducted value to user
  userBilledAmountUsd: number;
  
  // Owner profit
  netOwnerProfitUsd: number;
  profitMarginAchievedPercent: number;

  // Key minute deduction
  normalizedMinutesDeducted: number;
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
  financials?: SessionFinancials;
}
