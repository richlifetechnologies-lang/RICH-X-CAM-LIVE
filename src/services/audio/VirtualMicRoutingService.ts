export class VirtualMicRoutingService {
  private outputAudioContext: AudioContext | null = null;
  private monitorGainNode: GainNode | null = null;
  private virtualCableGainNode: GainNode | null = null;
  private nextPlayTime = 0;
  private isPlaying = false;
  private onOutputLevelCallback: ((level: number) => void) | null = null;

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

    // Connect to primary destination (which routes to the chosen Windows playback endpoint)
    this.virtualCableGainNode.connect(this.outputAudioContext.destination);
    this.monitorGainNode.connect(this.outputAudioContext.destination);

    this.nextPlayTime = this.outputAudioContext.currentTime + 0.05; // 50ms initial jitter buffer
    this.isPlaying = true;
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

  public async stop(): Promise<void> {
    this.isPlaying = false;
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      await this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }
}
