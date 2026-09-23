import { AudioDeviceOption } from '../../types/voiceEngine';

export class AudioCaptureService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private onAudioChunkCallback: ((chunk: Float32Array) => void) | null = null;
  private onLevelCallback: ((level: number) => void) | null = null;

  private isCapturing = false;
  private vadThreshold = 0.02;

  public async getAudioDevices(): Promise<AudioDeviceOption[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput')
        .map((d) => {
          const isVirtual =
            d.label.toLowerCase().includes('cable') ||
            d.label.toLowerCase().includes('virtual') ||
            d.label.toLowerCase().includes('voicemeeter') ||
            d.label.toLowerCase().includes('vb-audio');
          return {
            deviceId: d.deviceId,
            label: d.label || `${d.kind === 'audioinput' ? 'Microphone' : 'Speaker'} (${d.deviceId.slice(0, 5)})`,
            kind: d.kind as 'audioinput' | 'audiooutput',
            isVirtual,
          };
        });
    } catch (err) {
      console.error('Failed to enumerate audio devices', err);
      return [];
    }
  }

  public async startCapture(
    deviceId: string,
    sampleRate: number,
    vadThreshold: number,
    onChunk: (chunk: Float32Array) => void,
    onLevel: (level: number) => void
  ): Promise<void> {
    if (this.isCapturing) {
      await this.stopCapture();
    }

    this.vadThreshold = vadThreshold;
    this.onAudioChunkCallback = onChunk;
    this.onLevelCallback = onLevel;

    // Build audio context with specific sample rate
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate,
    });

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        echoCancellation: false, // We disable browser echo cancel to preserve clean timbre
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.3;

    // ScriptProcessor (buffer size 1024 or 2048 samples ~40ms to 80ms chunks)
    const bufferSize = 2048;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    const pcmData = new Float32Array(this.analyserNode.fftSize);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isCapturing) return;

      const inputBuffer = e.inputBuffer.getChannelData(0);

      // Measure RMS Level
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      const level = Math.min(100, Math.round(rms * 250));
      this.onLevelCallback?.(level);

      // Voice Activity Detection Check
      if (rms >= this.vadThreshold) {
        // Clone slice to prevent audio worklet reuse race condition
        const chunkToSend = new Float32Array(inputBuffer);
        this.onAudioChunkCallback?.(chunkToSend);
      }
    };

    this.isCapturing = true;
  }

  public async stopCapture(): Promise<void> {
    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
