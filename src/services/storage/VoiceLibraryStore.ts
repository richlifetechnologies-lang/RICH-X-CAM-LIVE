import { EngineSettings, VoiceProfile } from '../types/voiceEngine';

const STORAGE_KEY_PROFILES = 'livevoice_profiles_v1';
const STORAGE_KEY_SETTINGS = 'livevoice_settings_v1';

export const DEFAULT_PRESET_VOICES: VoiceProfile[] = [
  {
    id: 'preset_studio_narrator',
    name: 'Marcus - Deep Broadcast Studio',
    provider: 'elevenlabs',
    providerVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam ID from Elevenlabs default library
    createdAt: Date.now() - 86400000 * 5,
    sampleFileName: 'marcus_broadcast_48k.wav',
    sampleDurationSec: 42,
    verifiedConsent: true,
    category: 'preset',
    description: 'Rich baritone resonant profile for professional broadcasting & podcast calls.',
  },
  {
    id: 'preset_clarity_female',
    name: 'Elena - Warm Conversationalist',
    provider: 'elevenlabs',
    providerVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel ID
    createdAt: Date.now() - 86400000 * 3,
    sampleFileName: 'elena_warm_sample.wav',
    sampleDurationSec: 35,
    verifiedConsent: true,
    category: 'preset',
    description: 'Clear, engaging, articulate tone with dynamic inflection for team meetings.',
  },
  {
    id: 'preset_low_latency_neutral',
    name: 'Jordan - Neutral Fast Dialogue',
    provider: 'simulation_local',
    providerVoiceId: 'local_fast_neutral_01',
    createdAt: Date.now() - 86400000 * 1,
    sampleFileName: 'jordan_speech_30s.wav',
    sampleDurationSec: 28,
    verifiedConsent: true,
    category: 'preset',
    description: 'Optimized acoustic features for sub-150ms test loopback & gaming comms.',
  },
];

export const DEFAULT_SETTINGS: EngineSettings = {
  provider: 'simulation_local', // Safe default with instant zero-cost testing
  apiKey: '',
  customCloudEndpoint: 'wss://api.runpod.ai/v2/rvc-streaming/stream',
  selectedInputDeviceId: 'default',
  selectedOutputDeviceId: 'default',
  monitorOutputDeviceId: 'default',
  enableLocalMonitor: false,
  monitorVolume: 0.8,
  
  sampleRate: 24000,
  chunkSizeMs: 60,
  vadThreshold: 0.03, // approx -30dB
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,

  stability: 0.5,
  similarityBoost: 0.8,
  style: 0.15,
  latencyOptimization: 'ultra_low',

  costPerMinute: 0.18, // ~$0.18/min Elevenlabs STS estimate
  sessionSpendingLimit: 5.0, // $5.00 safety cap
  maxSessionMinutes: 30, // 30 min safety cutoff
};

export class VoiceLibraryStore {
  public static getProfiles(): VoiceProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_PRESET_VOICES));
        return DEFAULT_PRESET_VOICES;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_PRESET_VOICES;
    }
  }

  public static saveProfile(profile: VoiceProfile): void {
    const profiles = this.getProfiles();
    const updated = [profile, ...profiles.filter((p) => p.id !== profile.id)];
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
  }

  public static deleteProfile(id: string): void {
    const profiles = this.getProfiles();
    const updated = profiles.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
  }

  public static getSettings(): EngineSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!stored) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: Partial<EngineSettings>): EngineSettings {
    const current = this.getSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
    return merged;
  }
}
