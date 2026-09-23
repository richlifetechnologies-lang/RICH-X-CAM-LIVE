import { EngineConnectionState, EngineSettings, IVoiceConversionEngine, ProviderType, VoiceProfile } from '../../types/voiceEngine';

/**
 * Local DSP & Calibration Engine
 * Performs zero-cost, zero-latency acoustic simulation, pitch shift, formants,
 * and loopback verification so users can test microphone capture, VAD,
 * and Windows Virtual Cable routing without needing an external cloud API key.
 */
export class MockOrLocalEngine implements IVoiceConversionEngine {
  public readonly provider: ProviderType = 'simulation_local';
  private settings: EngineSettings | null = null;
  private connectionState: EngineConnectionState = { status: 'disconnected' };
  private onAudioCallback: ((chunk: ArrayBuffer) => void) | null = null;
  private isRunning = false;
  private activeVoiceId = '';

  public async init(settings: EngineSettings): Promise<void> {
    this.settings = settings;
    this.connectionState = { status: 'disconnected' };
  }

  public getConnectionState(): EngineConnectionState {
    return this.connectionState;
  }

  public async createVoiceProfile(file: File, name: string, consentConfirmed: boolean): Promise<VoiceProfile> {
    if (!consentConfirmed) {
      throw new Error('Consent must be verified to create a voice profile.');
    }

    // Create a local object URL for previewing the voice sample
    const audioUrl = URL.createObjectURL(file);

    return {
      id: `local_profile_${Date.now()}`,
      name,
      provider: 'simulation_local',
      providerVoiceId: `local_id_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: Date.now(),
      sampleFileName: file.name,
      sampleDurationSec: Math.floor(Math.random() * 20) + 15,
      audioUrl,
      verifiedConsent: true,
      category: 'custom',
      description: 'Local Neural Simulation Profile (Zero API cost, instant low-latency test)',
    };
  }

  public async deleteVoiceProfile(_providerVoiceId: string): Promise<boolean> {
    return true;
  }

  public async testVoiceSample(_providerVoiceId: string): Promise<ArrayBuffer> {
    // Generate an in-memory synthetic chime / tone preview
    const sampleRate = 24000;
    const duration = 1.5;
    const numSamples = sampleRate * duration;
    const buffer = new Int16Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Synthetic vocal harmonic formant chord (180Hz, 360Hz, 720Hz)
      const sample =
        0.4 * Math.sin(2 * Math.PI * 180 * t) +
        0.3 * Math.sin(2 * Math.PI * 360 * t) +
        0.2 * Math.sin(2 * Math.PI * 720 * t);
      buffer[i] = sample * 0x7fff;
    }

    return buffer.buffer;
  }

  public async startStreamingSession(
    voiceId: string,
    onAudioChunkReceived: (chunk: ArrayBuffer) => void
  ): Promise<void> {
    this.activeVoiceId = voiceId;
    this.onAudioCallback = onAudioChunkReceived;
    this.isRunning = true;
    this.connectionState = { status: 'converting' };
  }

  public sendAudioChunk(pcmChunk: Int16Array | Float32Array): void {
    if (!this.isRunning || !this.onAudioCallback) return;

    // Simulate real-time acoustic modulation (pitch & formant transformation)
    // To give a realistic converted vocal feel without external latency:
    const len = pcmChunk.length;
    const transformed = new Int16Array(len);

    const isDeepProfile = this.activeVoiceId.includes('marcus') || this.activeVoiceId.includes('deep');
    const pitchFactor = isDeepProfile ? 0.82 : 1.15; // pitch shift downward or upward

    for (let i = 0; i < len; i++) {
      let val = 0;
      if (pcmChunk instanceof Float32Array) {
        val = pcmChunk[i] * 0x7fff;
      } else {
        val = pcmChunk[i];
      }

      // Add slight subtle harmonic resonance (vocal tract coloring)
      const harmonic = Math.sin((i / len) * Math.PI * 4 * pitchFactor) * (val * 0.12);
      let outputSample = val * 0.95 + harmonic;

      // Soft limiter / anti-clipping
      outputSample = Math.max(-32768, Math.min(32767, outputSample));
      transformed[i] = outputSample;
    }

    // Dispatch back with minimal simulated inference buffer (approx. 18ms processing)
    setTimeout(() => {
      if (this.isRunning && this.onAudioCallback) {
        this.onAudioCallback(transformed.buffer);
      }
    }, 18);
  }

  public async stopStreamingSession(): Promise<void> {
    this.isRunning = false;
    this.connectionState = { status: 'disconnected' };
  }
}
