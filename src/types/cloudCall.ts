export interface ClonedVoiceItem {
  id: string;
  name: string;
  providerVoiceId: string;
  sampleFileName: string;
  sampleDurationSec: number;
  audioBlobUrl?: string;
  createdAt: number;
  category: 'custom_cloned' | 'preset';
}

export type VideoOrientation = 'landscape' | 'portrait';

export type StudioCallMode = 'video_audio' | 'audio_only' | 'video_only';

export interface LipSyncMetrics {
  mouthOpenness: number;   // 0 to 100 (%)
  mouthWidth: number;      // -50 to +50 (pucker vs smile)
  jawDrop: number;         // 0 to 100 (%)
  vocalEnergy: number;     // 0 to 100 (%)
  isSpeaking: boolean;
  phoneme: string;         // 'A' | 'E' | 'I' | 'O' | 'U' | 'M' | 'Rest'
  rawRms: number;
  sourceType: 'natural_mic' | 'cloned_voice' | 'standby';
  deviceName?: string;
  autoAdjustedDelayMs?: number; // Automatically calculated latency delay
  isAutoCalibrated?: boolean;
}

export interface RichXCallConfig {
  videoEngineApiKey: string;
  voiceEngineApiKey: string;
  
  // Studio Call Mode
  callMode: StudioCallMode;
  
  // Real-Time Video
  videoPrompt: string;
  referenceImageUrl: string;
  enableVideoTransform: boolean;
  selectedCameraId: string;
  videoOrientation: VideoOrientation; // 'landscape' (16:9 PC/Webcam) or 'portrait' (9:16 Phone/Mobile)
  
  // Audio Mode: 'cloned_voice' or 'natural_mic'
  voiceMode: 'cloned_voice' | 'natural_mic';
  activeVoiceId: string;
  selectedMicId: string;
  selectedOutputId: string;
  
  // Video Only mode toggle for optional voice cloning
  videoOnlyEnableVoiceCloning?: boolean;

  // Lip-Sync Latency Alignment & Auto Adjustment
  autoLipSyncCalibration: boolean; // Automatically adjust audio lip sync to match video when speaking
  audioLatencyCompensationMs: number; // Manual override or current applied latency
  
  // Guardrails
  spendingCapUsd: number;
  maxDurationMinutes: number;
}
