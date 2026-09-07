/**
 * Fast, in-memory PCM audio utilities for real-time streaming with sub-millisecond latency.
 * Eliminates external process spawning overhead for raw audio buffers.
 */

export class PcmUtils {
  /**
   * Resamples 16-bit mono PCM buffer from 24000Hz to 16000Hz using linear interpolation.
   * Runs in pure memory with zero allocations outside the target buffer.
   */
  static resample24kTo16k(pcm24k: Buffer): Buffer {
    const inputSamples = pcm24k.length / 2;
    // Ratio: 16000 / 24000 = 2 / 3
    const outputSamples = Math.floor((inputSamples * 2) / 3);
    const outputBuffer = Buffer.alloc(outputSamples * 2);

    const ratio = 24000 / 16000;

    for (let i = 0; i < outputSamples; i++) {
      const srcIndex = i * ratio;
      const indexFloor = Math.floor(srcIndex);
      const indexCeil = Math.min(indexFloor + 1, inputSamples - 1);
      const fraction = srcIndex - indexFloor;

      const sample0 = pcm24k.readInt16LE(indexFloor * 2);
      const sample1 = pcm24k.readInt16LE(indexCeil * 2);

      // Linear interpolation
      const interpolated = Math.round(sample0 + fraction * (sample1 - sample0));
      const clamped = Math.max(-32768, Math.min(32767, interpolated));

      outputBuffer.writeInt16LE(clamped, i * 2);
    }

    return outputBuffer;
  }

  /**
   * Resamples 16-bit mono PCM buffer from 16000Hz to 24000Hz using linear interpolation.
   */
  static resample16kTo24k(pcm16k: Buffer): Buffer {
    const inputSamples = pcm16k.length / 2;
    // Ratio: 24000 / 16000 = 3 / 2
    const outputSamples = Math.floor((inputSamples * 3) / 2);
    const outputBuffer = Buffer.alloc(outputSamples * 2);

    const ratio = 16000 / 24000;

    for (let i = 0; i < outputSamples; i++) {
      const srcIndex = i * ratio;
      const indexFloor = Math.floor(srcIndex);
      const indexCeil = Math.min(indexFloor + 1, inputSamples - 1);
      const fraction = srcIndex - indexFloor;

      const sample0 = pcm16k.readInt16LE(indexFloor * 2);
      const sample1 = pcm16k.readInt16LE(indexCeil * 2);

      const interpolated = Math.round(sample0 + fraction * (sample1 - sample0));
      const clamped = Math.max(-32768, Math.min(32767, interpolated));

      outputBuffer.writeInt16LE(clamped, i * 2);
    }

    return outputBuffer;
  }

  /**
   * Normalizes audio volume level and prevents clipping.
   */
  static normalizePcm16(pcmBuffer: Buffer, targetPeak = 0.95): Buffer {
    const numSamples = pcmBuffer.length / 2;
    let maxAbs = 0;

    for (let i = 0; i < numSamples; i++) {
      const abs = Math.abs(pcmBuffer.readInt16LE(i * 2));
      if (abs > maxAbs) maxAbs = abs;
    }

    if (maxAbs === 0 || maxAbs >= 32767 * targetPeak) {
      return pcmBuffer; // Already well normalized
    }

    const gain = (32767 * targetPeak) / maxAbs;
    const out = Buffer.alloc(pcmBuffer.length);

    for (let i = 0; i < numSamples; i++) {
      const sample = pcmBuffer.readInt16LE(i * 2);
      const adjusted = Math.round(sample * gain);
      out.writeInt16LE(Math.max(-32768, Math.min(32767, adjusted)), i * 2);
    }

    return out;
  }

  /**
   * Calculate root-mean-square (RMS) energy of a 16-bit PCM buffer (0.0 to 1.0)
   */
  static calculateRms(pcmBuffer: Buffer): number {
    const numSamples = Math.floor(pcmBuffer.length / 2);
    if (numSamples === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < numSamples; i++) {
      if ((i * 2) + 2 <= pcmBuffer.length) {
        const normalized = pcmBuffer.readInt16LE(i * 2) / 32768.0;
        sumSquares += normalized * normalized;
      }
    }

    return Math.sqrt(sumSquares / numSamples);
  }

  /**
   * Applies an adaptive noise gate: suppresses low-energy ambient noise / microphone hiss
   */
  static applyNoiseGate(pcmBuffer: Buffer, thresholdRms = 0.012, attenuation = 0.1): Buffer {
    const numSamples = Math.floor(pcmBuffer.length / 2);
    if (numSamples === 0) return pcmBuffer;

    const rms = this.calculateRms(pcmBuffer);
    if (rms >= thresholdRms) {
      return pcmBuffer; // Speech present: let through untouched
    }

    // Ambient silence / room noise: softly attenuate
    const out = Buffer.alloc(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const sample = pcmBuffer.readInt16LE(i * 2);
      out.writeInt16LE(Math.round(sample * attenuation), i * 2);
    }
    return out;
  }
}
