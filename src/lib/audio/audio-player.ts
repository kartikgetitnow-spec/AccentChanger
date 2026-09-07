/**
 * AudioPlayer handles real-time audio playback using browser AudioContext,
 * scheduling chunks sequentially to prevent stuttering and gaps.
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime = 0;
  private isPlaying = false;
  private activeSources: AudioBufferSourceNode[] = [];
  private dataArray: Uint8Array<ArrayBuffer> | null = null;

  constructor() {
    // Initialized lazily on first user interaction to satisfy browser autoplay policies
  }

  public ensureContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 24000 });

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Queue raw 16-bit PCM (e.g. from Gemini Live/RVC)
   */
  queuePcmChunk(pcmData: Int16Array | ArrayBuffer, sampleRate = 24000): void {
    const ctx = this.ensureContext();
    const int16Array =
      pcmData instanceof Int16Array ? pcmData : new Int16Array(pcmData);

    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.copyToChannel(float32Array, 0);

    this.playBuffer(audioBuffer);
  }

  /**
   * Queue an encoded audio buffer (e.g., MP3/WAV/WebM)
   */
  async queueEncodedChunk(arrayBuffer: ArrayBuffer): Promise<void> {
    if (!arrayBuffer || arrayBuffer.byteLength < 44) return;
    const ctx = this.ensureContext();
    try {
      const slice = arrayBuffer.slice(0);
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        const p = ctx.decodeAudioData(slice, resolve, reject);
        if (p && typeof p.then === "function") {
          p.then(resolve).catch(reject);
        }
      });
      this.playBuffer(audioBuffer);
    } catch (err) {
      console.warn("Failed to decode audio chunk with decodeAudioData, attempting raw PCM fallback:", err);
      const pcmPayload =
        arrayBuffer.byteLength > 44 &&
        new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 4)) === "RIFF"
          ? arrayBuffer.slice(44)
          : arrayBuffer;
      this.queuePcmChunk(pcmPayload, 16000);
    }
  }

  private playBuffer(audioBuffer: AudioBuffer): void {
    if (!this.audioContext || !this.gainNode) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const currentTime = this.audioContext.currentTime;
    // Low-latency lookahead scheduling (20ms) to prevent underflow while keeping latency minimal
    const startTime = this.nextStartTime < currentTime ? currentTime + 0.02 : this.nextStartTime;
    source.start(startTime);

    this.nextStartTime = startTime + audioBuffer.duration;
    this.isPlaying = true;
    this.activeSources.push(source);

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.isPlaying = false;
        this.nextStartTime = 0;
      }
    };
  }

  /**
   * Adjust playback volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Stop all current playback and clear the schedule queue
   */
  stop(): void {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    });
    this.activeSources = [];
    this.nextStartTime = 0;
    this.isPlaying = false;
  }

  /**
   * Read real-time frequency data for visualizer
   */
  getFrequencyData(): Uint8Array {
    if (this.analyser && this.dataArray && this.isPlaying) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return new Uint8Array(0);
  }

  get active(): boolean {
    return this.isPlaying;
  }
}
