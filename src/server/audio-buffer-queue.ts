/**
 * AudioBufferQueue provides jitter-buffering and smooth chunk framing for real-time audio streams.
 */
export class AudioBufferQueue {
  private buffer: Buffer = Buffer.alloc(0);
  private frameSize: number; // in bytes

  constructor(frameSize = 1280) {
    // 1280 bytes = 640 samples @ 16kHz 16-bit mono = 40ms frame
    this.frameSize = frameSize;
  }

  /**
   * Push incoming audio chunk into buffer queue
   */
  push(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
  }

  /**
   * Retrieve next complete audio frame if ready
   */
  popFrame(): Buffer | null {
    if (this.buffer.length >= this.frameSize) {
      const frame = this.buffer.subarray(0, this.frameSize);
      this.buffer = this.buffer.subarray(this.frameSize);
      return frame;
    }
    return null;
  }

  /**
   * Flush all remaining data in buffer
   */
  flush(): Buffer {
    const remaining = this.buffer;
    this.buffer = Buffer.alloc(0);
    return remaining;
  }

  get length(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = Buffer.alloc(0);
  }
}
