/**
 * AudioRecorder handles browser microphone access via getUserMedia,
 * cleans audio with highpass/lowpass filters, calculates frequency data
 * for real-time visualization, and streams raw 16kHz 16-bit linear PCM directly.
 */

export interface AudioRecorderOptions {
  sampleRate?: number;
  timeslice?: number;
  onPcmChunk?: (pcmBuffer: ArrayBuffer) => void;
  onError?: (error: Error) => void;
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private isRecording = false;

  /**
   * Request microphone access and begin capturing audio
   */
  async start(options: AudioRecorderOptions = {}): Promise<void> {
    if (this.isRecording) return;

    const sampleRate = options.sampleRate || 16000;

    try {
      // 1. Verify Secure Context (HTTPS required by mobile browsers for microphone access)
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error(
          `Microphone requires HTTPS on mobile devices. Please open https://${window.location.host} in your mobile browser.`
        );
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Microphone API (getUserMedia) is blocked or not available in this browser context."
        );
      }

      // Request microphone access with native noise cancellation and auto-gain
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Initialize AudioContext and DSP Noise Reduction Filters
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate });

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Highpass filter to eliminate microphone desk rumble (< 80 Hz)
      const highpass = this.audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;

      // Lowpass filter to eliminate harsh high-frequency noise (> 7500 Hz)
      const lowpass = this.audioContext.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 7500;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(this.analyser);

      // 3. Setup linear PCM streaming: 2048 samples = 128ms per chunk at 16kHz
      const bufferSize = 2048;
      const contextSampleRate = this.audioContext.sampleRate;
      this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);

        let pcm16: Int16Array;
        if (contextSampleRate === 16000) {
          pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        } else {
          // Downsample hardware rate (e.g. 44.1kHz or 48kHz on mobile devices) to 16kHz
          const targetLength = Math.floor((inputData.length * 16000) / contextSampleRate);
          pcm16 = new Int16Array(targetLength);
          const ratio = contextSampleRate / 16000;
          for (let i = 0; i < targetLength; i++) {
            const srcIdx = i * ratio;
            const idxFloor = Math.floor(srcIdx);
            const idxCeil = Math.min(idxFloor + 1, inputData.length - 1);
            const frac = srcIdx - idxFloor;
            const interp = inputData[idxFloor] + frac * (inputData[idxCeil] - inputData[idxFloor]);
            const s = Math.max(-1, Math.min(1, interp));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        }

        if (options.onPcmChunk && pcm16.length > 0) {
          options.onPcmChunk(pcm16.buffer as ArrayBuffer);
        }
      };

      lowpass.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  /**
   * Read real-time frequency data for audio visualization
   */
  getFrequencyData(): Uint8Array {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return new Uint8Array(0);
  }

  /**
   * Read time-domain (waveform) data
   */
  getWaveformData(): Uint8Array {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteTimeDomainData(this.dataArray);
      return this.dataArray;
    }
    return new Uint8Array(0);
  }

  /**
   * Stop audio capture and release microphone and context
   */
  stop(): void {
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
        this.processorNode.onaudioprocess = null;
      } catch {}
      this.processorNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.isRecording = false;
  }

  get active(): boolean {
    return this.isRecording;
  }
}
