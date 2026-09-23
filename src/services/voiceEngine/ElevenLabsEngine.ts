import { EngineConnectionState, EngineSettings, IVoiceConversionEngine, ProviderType, VoiceProfile } from '../../types/voiceEngine';

/**
 * Concrete adapter for ElevenLabs Speech-to-Speech (STS) streaming API
 * Official Endpoint: wss://api.elevenlabs.io/v1/speech-to-speech/{voice_id}/stream-input
 * Models: eleven_multilingual_sts_v2 or eleven_english_sts_v2
 */
export class ElevenLabsEngine implements IVoiceConversionEngine {
  public readonly provider: ProviderType = 'elevenlabs';
  private settings: EngineSettings | null = null;
  private socket: WebSocket | null = null;
  private connectionState: EngineConnectionState = { status: 'disconnected' };
  private onAudioCallback: ((chunk: ArrayBuffer) => void) | null = null;

  public async init(settings: EngineSettings): Promise<void> {
    this.settings = settings;
    if (!settings.apiKey) {
      this.connectionState = {
        status: 'error',
        errorMessage: 'ElevenLabs API key is missing. Configure in Settings.',
      };
    }
  }

  public getConnectionState(): EngineConnectionState {
    return this.connectionState;
  }

  public async createVoiceProfile(file: File, name: string, consentConfirmed: boolean): Promise<VoiceProfile> {
    if (!this.settings?.apiKey) {
      throw new Error('ElevenLabs API key is required to create a voice profile.');
    }
    if (!consentConfirmed) {
      throw new Error('Biometric voice ownership and authorization confirmation is mandatory.');
    }

    // Call official ElevenLabs Add Voice endpoint: POST https://api.elevenlabs.io/v1/voices/add
    const formData = new FormData();
    formData.append('name', name);
    formData.append('files', file);
    formData.append('description', 'Created via LiveVoice AI Real-Time Desktop Studio');

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': this.settings.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail?.message || err.detail || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    const providerVoiceId = data.voice_id;

    const profile: VoiceProfile = {
      id: `voice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      provider: 'elevenlabs',
      providerVoiceId,
      createdAt: Date.now(),
      sampleFileName: file.name,
      sampleDurationSec: 30, // approximate or extracted via Audio element
      verifiedConsent: true,
      category: 'custom',
      description: 'Custom Instant Voice Clone profile via ElevenLabs API.',
    };

    return profile;
  }

  public async deleteVoiceProfile(providerVoiceId: string): Promise<boolean> {
    if (!this.settings?.apiKey) return false;
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/voices/${providerVoiceId}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': this.settings.apiKey },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async testVoiceSample(providerVoiceId: string): Promise<ArrayBuffer> {
    if (!this.settings?.apiKey) {
      throw new Error('API key required for testing voice sample.');
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${providerVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.settings.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'This is a sample test of your custom voice profile configured for real-time speech conversion.',
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: this.settings.stability,
          similarity_boost: this.settings.similarityBoost,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate sample: ${res.statusText}`);
    }

    return await res.arrayBuffer();
  }

  public async startStreamingSession(
    voiceId: string,
    onAudioChunkReceived: (chunk: ArrayBuffer) => void
  ): Promise<void> {
    if (!this.settings?.apiKey) {
      this.connectionState = { status: 'error', errorMessage: 'ElevenLabs API key missing.' };
      throw new Error('API key missing.');
    }

    this.onAudioCallback = onAudioChunkReceived;
    this.connectionState = { status: 'connecting' };

    // Select model and latency optimization
    const modelId = 'eleven_multilingual_sts_v2';
    const latencyMode = this.settings.latencyOptimization === 'ultra_low' ? 3 : 1; // 0 to 4 in ElevenLabs
    const url = `wss://api.elevenlabs.io/v1/speech-to-speech/${voiceId}/stream-input?model_id=${modelId}&optimize_streaming_latency=${latencyMode}`;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
          this.connectionState = { status: 'converting' };
          // Send initial BOS (Beginning of Stream) handshake with voice settings & auth
          const initPayload = {
            text: ' ',
            voice_settings: {
              stability: this.settings?.stability ?? 0.5,
              similarity_boost: this.settings?.similarityBoost ?? 0.8,
            },
            xi_api_key: this.settings?.apiKey,
            generation_config: {
              chunk_length_schedule: [50, 100, 150, 200],
            },
          };
          this.socket?.send(JSON.stringify(initPayload));
          resolve();
        };

        this.socket.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.audio) {
                // Decode base64 audio chunk to ArrayBuffer
                const binary = atob(parsed.audio);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                this.onAudioCallback?.(bytes.buffer);
              }
              if (parsed.isFinal) {
                // stream finished or flushed
              }
            } catch (err) {
              console.error('Failed to parse ElevenLabs message', err);
            }
          } else if (event.data instanceof ArrayBuffer) {
            this.onAudioCallback?.(event.data);
          }
        };

        this.socket.onerror = (e) => {
          console.error('ElevenLabs WebSocket error', e);
          this.connectionState = { status: 'error', errorMessage: 'WebSocket connection failed.' };
          reject(new Error('WebSocket connection failed.'));
        };

        this.socket.onclose = (e) => {
          this.connectionState = {
            status: 'disconnected',
            errorMessage: e.code !== 1000 ? `Connection closed: ${e.reason || e.code}` : undefined,
          };
        };
      } catch (err: any) {
        this.connectionState = { status: 'error', errorMessage: err.message };
        reject(err);
      }
    });
  }

  public sendAudioChunk(pcmChunk: Int16Array | Float32Array): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    // Convert raw PCM to base64 representation for Elevenlabs input protocol
    let int16Data: Int16Array;
    if (pcmChunk instanceof Float32Array) {
      int16Data = new Int16Array(pcmChunk.length);
      for (let i = 0; i < pcmChunk.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmChunk[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    } else {
      int16Data = pcmChunk;
    }

    const uint8View = new Uint8Array(int16Data.buffer);
    let binary = '';
    const len = uint8View.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8View[i]);
    }
    const base64Audio = btoa(binary);

    const message = {
      user_audio_chunk: base64Audio,
    };
    this.socket.send(JSON.stringify(message));
  }

  public async stopStreamingSession(): Promise<void> {
    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          try {
            this.socket.send(JSON.stringify({ user_audio_chunk: '' }));
          } catch {}
          this.socket.close(1000, 'User stopped session');
        } else if (this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close();
        }
      } catch (err) {
        console.warn('Error closing voice websocket:', err);
      }
      this.socket = null;
    }
    this.connectionState = { status: 'disconnected' };
  }
}
