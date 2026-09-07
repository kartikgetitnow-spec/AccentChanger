import { Socket } from "socket.io";
import { GeminiLiveClient } from "./gemini-live-client";
import { RVCEngine } from "./rvc-engine";
import { AudioConverter } from "./audio-converter";
import { PcmUtils } from "./pcm-utils";

import { AudioBufferQueue } from "./audio-buffer-queue";

export interface UserSession {
  id: string;
  socketId: string;
  voice: string;
  pitchShift: number;
  createdAt: number;
  lastActive: number;
  geminiClient: GeminiLiveClient | null;
  isStreaming: boolean;
  bufferQueue: AudioBufferQueue;
}

export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private maxConcurrentSessions: number;
  private rvcEngine: RVCEngine;
  private apiKey: string;

  constructor(maxConcurrent = 10) {
    this.maxConcurrentSessions = parseInt(
      process.env.MAX_CONCURRENT_SESSIONS || String(maxConcurrent),
      10
    );
    this.rvcEngine = new RVCEngine();
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  }

  /**
   * Check if system can accept a new concurrent session
   */
  canAcceptSession(): boolean {
    return this.sessions.size < this.maxConcurrentSessions;
  }

  /**
   * Initialize a new session for a connected socket
   */
  createSession(socket: Socket, voice = "USA Accent"): UserSession {
    if (!this.canAcceptSession()) {
      throw new Error("Server is at maximum concurrent session capacity. Please try again shortly.");
    }

    const session: UserSession = {
      id: socket.id,
      socketId: socket.id,
      voice,
      pitchShift: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
      geminiClient: null,
      isStreaming: false,
      bufferQueue: new AudioBufferQueue(1280),
    };

    this.sessions.set(socket.id, session);
    return session;
  }

  getSession(socketId: string): UserSession | undefined {
    return this.sessions.get(socketId);
  }

  /**
   * Start audio stream routing for a user session
   */
  async startSessionStream(
    socket: Socket,
    voice?: string,
    pitchShift?: number
  ): Promise<void> {
    const session = this.getSession(socket.id);
    if (!session) {
      throw new Error("Session not found");
    }

    if (voice) {
      session.voice = voice;
    }
    if (pitchShift !== undefined) {
      session.pitchShift = pitchShift;
    }

    // Reuse existing ready client if voice has not changed
    if (session.geminiClient && session.geminiClient.ready && (!voice || session.voice === voice)) {
      session.isStreaming = true;
      session.lastActive = Date.now();
      return;
    }

    // Terminate existing client if present
    if (session.geminiClient) {
      session.geminiClient.close();
      session.geminiClient = null;
    }

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on server.");
    }

    // Instantiate Gemini Live Client for this specific user session
    const gemini = new GeminiLiveClient(
      this.apiKey,
      session.voice,
      process.env.GEMINI_MODEL,
      {
        onAudioData: async (geminiPcm24k: Buffer) => {
          // Ignore dummy/empty chunks
          if (!geminiPcm24k || geminiPcm24k.length < 16) return;

          // Received 24kHz raw PCM from Gemini Live
          socket.emit("status", {
            status: "processing",
            message: `Gemini speaking, converting through ${session.voice} voice pipeline...`,
          });

          try {
            // Process through RVC Voice Conversion Pipeline
            const rvcConvertedWav = await this.rvcEngine.processAudio(
              geminiPcm24k,
              session.voice,
              session.pitchShift
            );

            // Stream converted audio back to client
            socket.emit("audio-response", rvcConvertedWav);
          } catch (err) {
            console.error(`[Session ${socket.id}] RVC Pipeline Error:`, err);
            // Fallback: send original Gemini audio wrapped in WAV
            const fallbackWav = AudioConverter.pcmToWav(geminiPcm24k, 24000);
            socket.emit("audio-response", fallbackWav);
          }
        },

        onTranscript: (text: string) => {
          socket.emit("transcript", {
            speaker: session.voice,
            text,
          });
        },

        onInterrupted: () => {
          socket.emit("status", {
            status: "interrupted",
            message: "User interrupted Gemini turn",
          });
        },

        onTurnComplete: () => {
          socket.emit("status", {
            status: "listening",
            message: "Ready and listening for next speech input",
          });
        },

        onError: (err: Error) => {
          console.error(`[Session ${socket.id}] Gemini Live Error:`, err);
          socket.emit("error", { message: err.message });
        },

        onClose: () => {
          socket.emit("status", {
            status: "closed",
            message: "Gemini Live session connection closed",
          });
        },
      }
    );

    await gemini.connect();
    session.geminiClient = gemini;
    session.isStreaming = true;
    session.lastActive = Date.now();
  }

  /**
   * Route incoming audio chunk from frontend microphone to Gemini Live
   */
  async routeAudioChunk(socketId: string, chunk: ArrayBuffer | Buffer): Promise<void> {
    const session = this.getSession(socketId);
    if (!session || !session.geminiClient || !session.isStreaming) return;

    session.lastActive = Date.now();
    const rawBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    try {
      let pcm16k: Buffer;
      const hasContainerHeader =
        rawBuffer.length >= 4 &&
        (rawBuffer.subarray(0, 4).toString("ascii") === "RIFF" ||
          rawBuffer.subarray(0, 4).toString("hex") === "1a45dfa3");

      if (!hasContainerHeader && rawBuffer.length % 2 === 0) {
        pcm16k = rawBuffer;
      } else {
        pcm16k = await AudioConverter.toPcm16kMono(rawBuffer);
      }

      // Clean background hiss and room noise
      const cleanPcm16k = PcmUtils.applyNoiseGate(pcm16k, 0.008);
      session.bufferQueue.push(cleanPcm16k);

      // Pop aligned frames and stream smoothly
      let frame: Buffer | null;
      while ((frame = session.bufferQueue.popFrame()) !== null) {
        session.geminiClient.sendAudioChunk(frame);
      }
    } catch (err) {
      console.error(`[Session ${socketId}] Error transcoding audio chunk:`, err);
    }
  }

  /**
   * Stop streaming microphone audio for a user session and signal turn completion to Gemini Live
   */
  stopSessionStream(socketId: string): void {
    const session = this.getSession(socketId);
    if (!session) return;

    if (session.geminiClient) {
      const remaining = session.bufferQueue.flush();
      if (remaining.length > 0) {
        session.geminiClient.sendAudioChunk(remaining);
      }
      // Signal Gemini Live that user turn is finished so model responds immediately
      session.geminiClient.sendTurnComplete();
    }
    session.bufferQueue.clear();

    session.isStreaming = false;
    // Note: Do not close session.geminiClient here so the model's audio response streams back to the user
  }

  /**
   * Close and delete user session
   */
  closeSession(socketId: string): void {
    const session = this.getSession(socketId);
    if (session) {
      if (session.geminiClient) {
        session.geminiClient.close();
      }
      this.sessions.delete(socketId);
    }
  }

  getActiveSessionsCount(): number {
    return this.sessions.size;
  }
}
