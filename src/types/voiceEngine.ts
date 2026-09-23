export type ProviderType = 'elevenlabs' | 'rvc_cloud' | 'simulation_local';

export interface VoiceProfile {
  id: string;
  name: string;
  provider: ProviderType;
  providerVoiceId: string;
  createdAt: number;
  sampleFileName: string;
  sampleDurationSec: number;
  audioUrl?: string; // local blob or data URL for preview
  verifiedConsent: boolean;
  category: 'custom' | 'preset';
  description?: string;
  labels?: Record<string, string>;
}

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isVirtual?: boolean;
}

export interface EngineSettings {
  provider: ProviderType;
  apiKey: string;
  customCloudEndpoint?: string; // For RunPod / Modal RVC WebSocket
  selectedInputDeviceId: string;
  selectedOutputDeviceId: string; // Physical speakers or Virtual Cable Input
  monitorOutputDeviceId: string; // Headphones for local sidetone
  enableLocalMonitor: boolean;
  monitorVolume: number;
  
  // Audio tuning
  sampleRate: 16000 | 24000 | 44100 | 48000;
  chunkSizeMs: 40 | 60 | 80 | 100 | 150;
  vadThreshold: number; // 0 to 1 (-60dB to 0dB sensitivity)
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;

  // Voice AI parameters
  stability: number; // 0 to 1
  similarityBoost: number; // 0 to 1
  style: number; // 0 to 1
  latencyOptimization: 'ultra_low' | 'balanced' | 'highest_quality';

  // Cost & Guardrails
  costPerMinute: number; // in USD
  sessionSpendingLimit: number; // in USD
  maxSessionMinutes: number;
}

export interface SessionMetrics {
  isActive: boolean;
  startedAt: number | null;
  durationSeconds: number;
  audioInputLevel: number; // 0 to 100
  audioOutputLevel: number; // 0 to 100
  bytesSent: number;
  bytesReceived: number;
  
  // Latency breakdown
  captureLatencyMs: number;
  networkRttMs: number;
  providerInferenceLatencyMs: number;
  bufferLatencyMs: number;
  totalEstimatedLatencyMs: number;
  
  // Financial tracking
  estimatedCost: number;
  exceededLimit: boolean;
  droppedFrames: number;
}

export interface EngineConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'converting' | 'error';
  errorMessage?: string;
}

export interface IVoiceConversionEngine {
  readonly provider: ProviderType;
  init(settings: EngineSettings): Promise<void>;
  createVoiceProfile(file: File, name: string, consentConfirmed: boolean): Promise<VoiceProfile>;
  deleteVoiceProfile(providerVoiceId: string): Promise<boolean>;
  testVoiceSample(providerVoiceId: string, textOrAudioPrompt?: string): Promise<AudioBuffer | ArrayBuffer>;
  startStreamingSession(voiceId: string, onAudioChunkReceived: (chunk: ArrayBuffer) => void): Promise<void>;
  sendAudioChunk(pcmChunk: Int16Array | Float32Array): void;
  stopStreamingSession(): Promise<void>;
  getConnectionState(): EngineConnectionState;
}
