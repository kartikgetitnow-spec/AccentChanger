import { spawn } from "child_process";
import { PcmUtils } from "./pcm-utils";

// Locate ffmpeg static binary
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegStaticPath: string = require("ffmpeg-static");

export class AudioConverter {
  /**
   * Convert incoming audio buffer (WebM/Opus or other browser formats) into raw 16kHz mono 16-bit PCM
   */
  static async toPcm16kMono(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegStaticPath, [
        "-i", "pipe:0",           // Input from stdin
        "-f", "s16le",            // Format: signed 16-bit little-endian PCM
        "-acodec", "pcm_s16le",   // Codec: PCM 16-bit
        "-ac", "1",               // Mono channel
        "-ar", "16000",           // 16kHz sample rate
        "pipe:1",                 // Output to stdout
      ]);

      const chunks: Buffer[] = [];
      let errorData = "";

      ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr.on("data", (data: Buffer) => (errorData += data.toString()));

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          // If ffmpeg failed on partial small header, return raw input fallback
          resolve(inputBuffer);
        }
      });

      ffmpeg.on("error", (err) => reject(err));

      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    });
  }

  /**
   * Resample PCM audio from one sample rate to another with sub-millisecond latency
   */
  static async resamplePcm(
    inputPcm: Buffer,
    fromSampleRate = 24000,
    toSampleRate = 16000
  ): Promise<Buffer> {
    // Ultra-fast in-memory path for standard Gemini Live (24k) -> RVC (16k)
    if (fromSampleRate === 24000 && toSampleRate === 16000) {
      return PcmUtils.resample24kTo16k(inputPcm);
    }
    if (fromSampleRate === 16000 && toSampleRate === 24000) {
      return PcmUtils.resample16kTo24k(inputPcm);
    }
    if (fromSampleRate === toSampleRate) {
      return inputPcm;
    }

    // Fallback to FFmpeg for arbitrary formats
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegStaticPath, [
        "-f", "s16le",
        "-ar", fromSampleRate.toString(),
        "-ac", "1",
        "-i", "pipe:0",
        "-f", "s16le",
        "-ar", toSampleRate.toString(),
        "-ac", "1",
        "pipe:1",
      ]);

      const chunks: Buffer[] = [];
      ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve(Buffer.concat(chunks));
        else resolve(inputPcm);
      });
      ffmpeg.on("error", (err) => reject(err));

      ffmpeg.stdin.write(inputPcm);
      ffmpeg.stdin.end();
    });
  }

  /**
   * Add a RIFF WAV header to raw PCM audio for simple playback in frontend or external tools
   */
  static pcmToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
    const header = Buffer.alloc(44);
    const dataLength = pcmData.length;
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;

    // RIFF chunk descriptor
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write("WAVE", 8);

    // "fmt " sub-chunk
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
    header.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);

    // "data" sub-chunk
    header.write("data", 36);
    header.writeUInt32LE(dataLength, 40);

    return Buffer.concat([header, pcmData]);
  }
}
