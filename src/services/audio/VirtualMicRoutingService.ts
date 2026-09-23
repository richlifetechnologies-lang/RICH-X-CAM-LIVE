import { LipSyncMetrics } from '../../types/cloudCall';

export class VirtualMicRoutingService {
  private outputAudioContext: AudioContext | null = null;
  private monitorGainNode: GainNode | null = null;
  private virtualCableGainNode: GainNode | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private isPlaying = false;
  private onOutputLevelCallback: ((level: number) => void) | null = null;
  private onLipSyncCallback: ((metrics: LipSyncMetrics) => void) | null = null;
  private animationFrameId: number | null = null;
  private currentSourceType: 'natural_mic' | 'cloned_voice' | 'standby' = 'standby';
  private currentDeviceName: string = 'Default Microphone';

  public async init(
    sampleRate: number,
    enableLocalMonitor: boolean,
    monitorVolume: number,
    onOutputLevel: (level: number) => void,
    outputDeviceId?: string
  ): Promise<void> {
    this.onOutputLevelCallback = onOutputLevel;

    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate,
    });

    // If browser supports setSinkId on AudioContext, direct it to the chosen output device
    if (outputDeviceId && outputDeviceId !== 'default' && (this.outputAudioContext as any).setSinkId) {
      try {
        await (this.outputAudioContext as any).setSinkId(outputDeviceId);
      } catch (err) {
        console.warn('Could not setSinkId on audio context directly', err);
      }
    }

    // Create Gain Nodes
    this.virtualCableGainNode = this.outputAudioContext.createGain();
    this.virtualCableGainNode.gain.value = 1.0;

    this.monitorGainNode = this.outputAudioContext.createGain();
    this.monitorGainNode.gain.value = enableLocalMonitor ? monitorVolume : 0.0;

    // Connect to primary destination (playback endpoint)
    this.virtualCableGainNode.connect(this.outputAudioContext.destination);
    this.monitorGainNode.connect(this.outputAudioContext.destination);

    // Create MediaStream destination for outgoing audio track (WebRTC / avatar lip-sync pipeline)
    this.mediaStreamDestination = this.outputAudioContext.createMediaStreamDestination();
    this.virtualCableGainNode.connect(this.mediaStreamDestination);

    // Create AnalyserNode for high-fidelity lip-sync and phoneme analysis
    this.analyserNode = this.outputAudioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.35;
    this.virtualCableGainNode.connect(this.analyserNode);

    this.nextPlayTime = this.outputAudioContext.currentTime + 0.05; // 50ms jitter buffer
    this.isPlaying = true;

    // Start lip-sync analysis loop
    this.startLipSyncAnalysisLoop();
  }

  public setAudioSourceContext(
    sourceType: 'natural_mic' | 'cloned_voice' | 'standby',
    deviceName?: string
  ): void {
    this.currentSourceType = sourceType;
    if (deviceName) {
      this.currentDeviceName = deviceName;
    }
  }

  public onLipSyncMetrics(callback: (metrics: LipSyncMetrics) => void): void {
    this.onLipSyncCallback = callback;
  }

  public getOutgoingMediaStream(): MediaStream | null {
    return this.mediaStreamDestination ? this.mediaStreamDestination.stream : null;
  }

  public getOutgoingAudioTrack(): MediaStreamTrack | null {
    const stream = this.getOutgoingMediaStream();
    return stream && stream.getAudioTracks().length > 0 ? stream.getAudioTracks()[0] : null;
  }

  public setMonitorSettings(enable: boolean, volume: number): void {
    if (this.monitorGainNode && this.outputAudioContext) {
      this.monitorGainNode.gain.setValueAtTime(
        enable ? volume : 0.0,
        this.outputAudioContext.currentTime
      );
    }
  }

  public playFloat32Chunk(floatChunk: Float32Array): void {
    if (!this.outputAudioContext || !this.isPlaying) return;

    try {
      const audioBuffer = this.outputAudioContext.createBuffer(
        1,
        floatChunk.length,
        this.outputAudioContext.sampleRate
      );
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(floatChunk);

      let sum = 0;
      for (let i = 0; i < floatChunk.length; i++) {
        sum += floatChunk[i] * floatChunk[i];
      }
      const rms = Math.sqrt(sum / floatChunk.length);
      const level = Math.min(100, Math.round(rms * 280));
      this.onOutputLevelCallback?.(level);

      const sourceNode = this.outputAudioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.virtualCableGainNode!);
      sourceNode.connect(this.monitorGainNode!);

      const now = this.outputAudioContext.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now + 0.01;
      }
      sourceNode.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch (err) {
      console.error('Error playing float chunk', err);
    }
  }

  public playChunk(rawAudioBuffer: ArrayBuffer): void {
    if (!this.outputAudioContext || !this.isPlaying) return;

    try {
      const pcm16 = new Int16Array(rawAudioBuffer);
      const audioBuffer = this.outputAudioContext.createBuffer(
        1,
        pcm16.length,
        this.outputAudioContext.sampleRate
      );
      const channelData = audioBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < pcm16.length; i++) {
        const floatVal = pcm16[i] / 32768.0;
        channelData[i] = floatVal;
        sum += floatVal * floatVal;
      }

      // Output level calculation
      const rms = Math.sqrt(sum / pcm16.length);
      const level = Math.min(100, Math.round(rms * 280));
      this.onOutputLevelCallback?.(level);

      const sourceNode = this.outputAudioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;

      sourceNode.connect(this.virtualCableGainNode!);
      sourceNode.connect(this.monitorGainNode!);

      const now = this.outputAudioContext.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now + 0.01; // catch up to avoid gap
      }

      sourceNode.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch (err) {
      console.error('Error queuing converted audio chunk', err);
    }
  }

  private startLipSyncAnalysisLoop(): void {
    if (!this.analyserNode || !this.outputAudioContext) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const timeDomainData = new Uint8Array(bufferLength);
    const freqDomainData = new Uint8Array(bufferLength);

    const update = () => {
      if (!this.isPlaying || !this.analyserNode) {
        return;
      }

      this.analyserNode.getByteTimeDomainData(timeDomainData);
      this.analyserNode.getByteFrequencyData(freqDomainData);

      // 1. Calculate time-domain RMS
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (timeDomainData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // 2. Frequency band analysis (Speech formants: F1 200-800Hz, F2 800-2400Hz, F3 2400-5000Hz)
      const sampleRate = this.outputAudioContext?.sampleRate || 24000;
      const binWidth = (sampleRate / 2) / bufferLength;

      let lowEnergy = 0; // F1: Jaw drop / vowel openness
      let midEnergy = 0; // F2: Tongue & lip shape (smile vs round)
      let highEnergy = 0; // F3: Sibilants / fricatives

      let lowCount = 0;
      let midCount = 0;
      let highCount = 0;

      for (let i = 0; i < bufferLength; i++) {
        const freq = i * binWidth;
        const val = freqDomainData[i] / 255;
        if (freq >= 200 && freq < 800) {
          lowEnergy += val;
          lowCount++;
        } else if (freq >= 800 && freq < 2400) {
          midEnergy += val;
          midCount++;
        } else if (freq >= 2400 && freq < 5500) {
          highEnergy += val;
          highCount++;
        }
      }

      const avgLow = lowCount > 0 ? lowEnergy / lowCount : 0;
      const avgMid = midCount > 0 ? midEnergy / midCount : 0;
      const avgHigh = highCount > 0 ? highEnergy / highCount : 0;

      const isSpeaking = rms > 0.008;

      // 3. Normalized parameters (0-100)
      // Mouth openness is heavily weighted by vocal energy and low formant resonance
      const mouthOpenness = isSpeaking
        ? Math.min(100, Math.round((rms * 320 * 0.6 + avgLow * 100 * 0.4)))
        : 0;

      const jawDrop = isSpeaking
        ? Math.min(100, Math.round(mouthOpenness * 0.85 + avgLow * 15))
        : 0;

      // Mouth width: positive for wide vowels (E, I), negative for rounded (O, U)
      let mouthWidth = 0;
      if (isSpeaking) {
        if (avgMid > avgLow * 1.2) {
          mouthWidth = Math.min(50, Math.round((avgMid - avgLow) * 60)); // Smile/wide
        } else if (avgLow > avgMid * 1.2) {
          mouthWidth = -Math.min(50, Math.round((avgLow - avgMid) * 60)); // Round 'O'
        }
      }

      // Phoneme estimation
      let phoneme = 'Rest';
      if (isSpeaking) {
        if (mouthOpenness > 55) {
          phoneme = 'A';
        } else if (mouthWidth > 20) {
          phoneme = 'E';
        } else if (mouthWidth < -20) {
          phoneme = 'O';
        } else if (avgHigh > 0.3) {
          phoneme = 'S';
        } else if (mouthOpenness < 15) {
          phoneme = 'M';
        } else {
          phoneme = 'U';
        }
      }

      const vocalEnergy = Math.min(100, Math.round(rms * 300));

      const metrics: LipSyncMetrics = {
        mouthOpenness,
        mouthWidth,
        jawDrop,
        vocalEnergy,
        isSpeaking,
        phoneme,
        rawRms: rms,
        sourceType: this.currentSourceType,
        deviceName: this.currentDeviceName,
      };

      this.onLipSyncCallback?.(metrics);

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  public async stop(): Promise<void> {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      await this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    this.mediaStreamDestination = null;
    this.analyserNode = null;
  }
}
