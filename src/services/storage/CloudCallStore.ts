import { RichXCallConfig, ClonedVoiceItem } from '../../types/cloudCall';

const STORAGE_SETTINGS = 'richx_cam_live_config_v1';
const STORAGE_VOICES = 'richx_cam_live_voices_v1';

export const INITIAL_PRESET_VOICE: ClonedVoiceItem = {
  id: 'preset_richx_studio',
  name: 'Studio Broadcaster Alpha',
  providerVoiceId: 'pNInz6obpgDQGcFmaJgB',
  sampleFileName: 'studio_broadcaster.wav',
  sampleDurationSec: 35,
  createdAt: Date.now() - 86400000 * 2,
  category: 'preset',
};

export const DEFAULT_CONFIG: RichXCallConfig = {
  videoEngineApiKey: '',
  voiceEngineApiKey: '',
  callMode: 'video_audio',
  videoPrompt: 'Cinematic portrait, photorealistic lighting, sharp detail, 8k resolution',
  referenceImageUrl: '',
  enableVideoTransform: true,
  selectedCameraId: 'default',
  videoOrientation: 'landscape', // 'landscape' (16:9 PC/Webcam) or 'portrait' (9:16 Phone/Mobile)
  
  voiceMode: 'natural_mic', // default to natural mic for realistic starting behavior
  activeVoiceId: 'pNInz6obpgDQGcFmaJgB',
  selectedMicId: 'default',
  selectedOutputId: 'default',
  videoOnlyEnableVoiceCloning: false,
  audioLatencyCompensationMs: 120, // Synchronizes audio delivery with video rendering
  
  spendingCapUsd: 5.0,
  maxDurationMinutes: 20,
};

export class CloudCallStore {
  public static getConfig(): RichXCallConfig {
    try {
      const stored = localStorage.getItem(STORAGE_SETTINGS);
      if (!stored) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  public static saveConfig(cfg: Partial<RichXCallConfig>): RichXCallConfig {
    const current = this.getConfig();
    const merged = { ...current, ...cfg };
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(merged));
    return merged;
  }

  public static getVoices(): ClonedVoiceItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_VOICES);
      if (!stored) return [INITIAL_PRESET_VOICE];
      return JSON.parse(stored);
    } catch {
      return [INITIAL_PRESET_VOICE];
    }
  }

  public static addVoice(item: ClonedVoiceItem): void {
    const current = this.getVoices();
    const updated = [item, ...current.filter((v) => v.id !== item.id)];
    localStorage.setItem(STORAGE_VOICES, JSON.stringify(updated));
  }

  public static removeVoice(id: string): void {
    const current = this.getVoices();
    const updated = current.filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_VOICES, JSON.stringify(updated));
  }
}
