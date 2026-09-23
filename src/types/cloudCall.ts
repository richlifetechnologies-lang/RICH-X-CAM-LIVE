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

export interface RichXCallConfig {
  videoEngineApiKey: string;
  voiceEngineApiKey: string;
  
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
  
  // Lip-Sync Latency Alignment
  audioLatencyCompensationMs: number;
  
  // Guardrails
  spendingCapUsd: number;
  maxDurationMinutes: number;
}
