import express, { Request, Response } from "express";
import http from "http";
import https from "https";
import fs from "fs";
import { Server as SocketIOServer, Socket } from "socket.io";
import next from "next";
import dotenv from "dotenv";
import { SessionManager } from "./src/server/session-manager";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || process.env.WEBSOCKET_PORT || "3000", 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

async function bootstrap() {
  await nextApp.prepare();

  const app = express();

  // Configure HTTP or HTTPS server based on SSL certificates
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCrtPath = process.env.SSL_CRT_PATH;
  const isSslEnabled = Boolean(
    sslKeyPath &&
      sslCrtPath &&
      fs.existsSync(sslKeyPath) &&
      fs.existsSync(sslCrtPath)
  );

  const server = isSslEnabled
    ? https.createServer(
        {
          key: fs.readFileSync(sslKeyPath!),
          cert: fs.readFileSync(sslCrtPath!),
        },
        app
      )
    : http.createServer(app);

  const protocol = isSslEnabled ? "https" : "http";
  const wsProtocol = isSslEnabled ? "wss" : "ws";

  // Initialize Session Manager with concurrency controls
  const sessionManager = new SessionManager();

  // Setup Socket.IO server
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e7, // 10MB buffer for audio chunks
  });

  // Socket.IO event handling for real-time audio pipeline
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id} (Active Sessions: ${sessionManager.getActiveSessionsCount() + 1})`);

    try {
      sessionManager.createSession(socket);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      socket.emit("error", { message: error.message });
      socket.disconnect();
      return;
    }

    socket.emit("status", {
      status: "connected",
      message: "Connected to real-time audio server",
      socketId: socket.id,
    });

    // Client starts microphone streaming session with persona
    socket.on("start-stream", async (data?: { voice?: string; sampleRate?: number; pitchShift?: number }) => {
      const selectedVoice = data?.voice || "Donald Trump";
      console.log(`[Socket.IO] Stream started for ${socket.id}. Voice: ${selectedVoice}, Pitch: ${data?.pitchShift ?? 0}`);

      try {
        await sessionManager.startSessionStream(socket, selectedVoice, data?.pitchShift);
        socket.emit("status", {
          status: "streaming",
          voice: selectedVoice,
          message: `Live session active with ${selectedVoice}`,
        });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`[Socket.IO] Error starting stream for ${socket.id}:`, error);
        socket.emit("error", { message: error.message });
      }
    });

    // Client sends audio chunk from microphone
    socket.on("audio-chunk", async (chunk: ArrayBuffer | Buffer | string) => {
      let buffer: Buffer;
      if (chunk instanceof ArrayBuffer) {
        buffer = Buffer.from(chunk);
      } else if (Buffer.isBuffer(chunk)) {
        buffer = chunk;
      } else if (typeof chunk === "string") {
        buffer = Buffer.from(chunk, "base64");
      } else {
        return;
      }

      // Inform client of receipt
      socket.emit("server-audio-received", {
        bytesReceived: buffer.length,
        timestamp: Date.now(),
      });

      // Route audio chunk into pipeline (AudioConverter -> Gemini Live -> RVCEngine)
      await sessionManager.routeAudioChunk(socket.id, buffer);
    });

    // Client stops streaming
    socket.on("stop-stream", () => {
      console.log(`[Socket.IO] Stream stopped for ${socket.id}`);
      sessionManager.stopSessionStream(socket.id);
      socket.emit("status", {
        status: "processing",
        message: "Thinking...",
      });
    });

    // Client disconnects
    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
      sessionManager.closeSession(socket.id);
    });
  });

  // Health endpoint for session status and server health
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      activeSessions: sessionManager.getActiveSessionsCount(),
      timestamp: new Date().toISOString(),
    });
  });

  // Performance metrics and monitoring endpoint
  app.get("/api/metrics", (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    res.json({
      status: "ok",
      activeSessions: sessionManager.getActiveSessionsCount(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      },
      environment: process.env.NODE_ENV || "development",
      protocol,
      wsProtocol,
      sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE || "16000", 10),
      timestamp: new Date().toISOString(),
    });
  });

  // Next.js request handler
  app.all("/{*path}", (req: Request, res: Response) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Ready on ${protocol}://${hostname}:${port}`);
    console.log(`> Real-time WebSocket server listening via ${wsProtocol.toUpperCase()}`);
    console.log(`> Audio Sample Rate: ${process.env.AUDIO_SAMPLE_RATE || "16000"}Hz`);
  });
}

bootstrap().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
