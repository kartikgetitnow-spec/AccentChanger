import WebSocket from "ws";
import { getPersona } from "./persona-prompts";

export interface GeminiLiveCallbacks {
  onAudioData?: (pcmChunk: Buffer) => void;
  onTranscript?: (text: string) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

const GEMINI_LIVE_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private model: string;
  private personaName: string;
  private callbacks: GeminiLiveCallbacks;
  private isConnected = false;
  private isReady = false;
  private pendingAudioChunks: Buffer[] = [];

  constructor(
    apiKey: string,
    personaName = "USA Accent",
    model?: string,
    callbacks: GeminiLiveCallbacks = {}
  ) {
    this.apiKey = apiKey;
    this.personaName = personaName;
    this.model = model || process.env.GEMINI_MODEL || "models/gemini-2.0-flash-exp";
    if (!this.model.startsWith("models/")) {
      this.model = `models/${this.model}`;
    }
    this.callbacks = callbacks;
  }

  /**
   * Connect to the Gemini Live WebSocket endpoint and wait for session setup confirmation
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${GEMINI_LIVE_URL}?key=${this.apiKey}`;
      this.ws = new WebSocket(url);

      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (this.isConnected) {
            console.warn("[Gemini Live] Setup confirmation timed out, proceeding optimistically");
            resolve();
          } else {
            reject(new Error("Gemini Live connection timed out"));
          }
        }
      }, 7000);

      this.ws.on("open", () => {
        this.isConnected = true;
        this.sendSetup();
      });

      this.ws.on("message", (raw: WebSocket.RawData) => {
        this.handleMessage(raw);
        if (this.isReady && !settled) {
          settled = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      this.ws.on("error", (err: Error) => {
        this.callbacks.onError?.(err);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      this.ws.on("close", (code, reason) => {
        this.isConnected = false;
        this.isReady = false;
        this.pendingAudioChunks = [];
        this.callbacks.onClose?.();
      });
    });
  }

  /**
   * Send the initial setup message containing model, voice, and system persona prompt
   */
  private sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const persona = getPersona(this.personaName);

    const setupMessage = {
      setup: {
        model: this.model,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: persona.voiceName,
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: persona.systemInstruction }],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Stream a raw 16kHz PCM audio chunk to Gemini Live
   */
  sendAudioChunk(pcmChunk: Buffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    if (!this.isReady) {
      this.pendingAudioChunks.push(pcmChunk);
      return;
    }

    const base64Audio = pcmChunk.toString("base64");
    const realtimeInput = {
      realtimeInput: {
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: base64Audio,
        },
      },
    };

    this.ws.send(JSON.stringify(realtimeInput));
  }

  /**
   * Signal to Gemini Live that the user has completed their speech turn
   */
  sendTurnComplete() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isReady) return;

    const turnCompleteMessage = {
      clientContent: {
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(turnCompleteMessage));
    console.log("[Gemini Live] Sent clientContent.turnComplete signal");
  }

  /**
   * Parse incoming messages from Gemini Live
   */
  private handleMessage(raw: WebSocket.RawData) {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.error) {
        console.error("[Gemini Live] API returned error:", msg.error);
        this.callbacks.onError?.(new Error(msg.error.message || JSON.stringify(msg.error)));
        return;
      }

      if (msg.setupComplete) {
        this.isReady = true;
        console.log(`[Gemini Live] Session setup complete with model: ${this.model}`);

        if (this.pendingAudioChunks.length > 0) {
          console.log(`[Gemini Live] Flushing ${this.pendingAudioChunks.length} queued audio chunks`);
          for (const chunk of this.pendingAudioChunks) {
            this.sendAudioChunk(chunk);
          }
          this.pendingAudioChunks = [];
        }
        return;
      }

      const serverContent = msg.serverContent;
      if (serverContent) {
        // Handle interruption (user interrupted Gemini output)
        if (serverContent.interrupted) {
          console.log("[Gemini Live] User interrupted Gemini turn");
          this.callbacks.onInterrupted?.();
        }

        // Handle model generation output
        if (serverContent.modelTurn) {
          const parts = serverContent.modelTurn.parts || [];
          for (const part of parts) {
            // Audio data
            if (part.inlineData && part.inlineData.data) {
              const audioBuffer = Buffer.from(part.inlineData.data, "base64");
              console.log(`[Gemini Live] Received ${audioBuffer.length}B audio chunk from model`);
              this.callbacks.onAudioData?.(audioBuffer);
            }
            // Text transcript
            if (part.text) {
              console.log(`[Gemini Live] Transcript: "${part.text}"`);
              this.callbacks.onTranscript?.(part.text);
            }
          }
        }

        // End of turn
        if (serverContent.turnComplete) {
          console.log("[Gemini Live] Model turn complete");
          this.callbacks.onTurnComplete?.();
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.callbacks.onError?.(error);
    }
  }

  close() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isReady = false;
  }

  get ready(): boolean {
    return this.isConnected && this.isReady;
  }
}
