"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { AudioRecorder } from "@/lib/audio/audio-recorder";
import { AudioPlayer } from "@/lib/audio/audio-player";
import { ChatMessage } from "@/components/ChatTranscript";
import { ConversationSettings } from "@/components/SettingsModal";

export interface ConversationLog {
  id: string;
  timestamp: string;
  type: "info" | "audio-in" | "audio-out" | "error" | "status";
  message: string;
}

export function useVoiceConversation() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<ConversationSettings>(() => {
    let savedServerUrl = "";
    let savedVoice = "USA Accent";
    if (typeof window !== "undefined") {
      savedServerUrl = localStorage.getItem("accent_changer_server_url") || "";
      if (!savedServerUrl && window.location.hostname.includes("vercel.app")) {
        savedServerUrl = "https://accentchanger.onrender.com";
      }
      const rawVoice = localStorage.getItem("accent_changer_voice");
      if (
        rawVoice === "UK Accent" ||
        rawVoice?.toLowerCase().includes("uk") ||
        rawVoice?.toLowerCase().includes("british")
      ) {
        savedVoice = "UK Accent";
      } else if (rawVoice) {
        savedVoice = "USA Accent";
      }
    }
    return {
      voice: savedVoice,
      pitchShift: 0,
      latencyMode: "low-latency",
      talkMode: "toggle",
      echoCancellation: true,
      serverUrl: savedServerUrl || process.env.NEXT_PUBLIC_SOCKET_URL || "",
    };
  });

  const [volume, setVolumeState] = useState(1.0);
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const [inputFreqData, setInputFreqData] = useState<Uint8Array>(new Uint8Array(0));
  const [outputFreqData, setOutputFreqData] = useState<Uint8Array>(new Uint8Array(0));
  const animationFrameRef = useRef<number | null>(null);

  const addLog = useCallback(
    (type: ConversationLog["type"], message: string) => {
      const newLog: ConversationLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    },
    []
  );

  const addMessage = useCallback(
    (sender: "user" | "assistant", speakerName: string, text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          sender,
          speakerName,
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    },
    []
  );

  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const lastChunkSentTimeRef = useRef<number>(0);

  // Initialize Socket.IO connection
  useEffect(() => {
    recorderRef.current = new AudioRecorder();
    playerRef.current = new AudioPlayer();

    const targetUrl =
      settings.serverUrl?.trim() ||
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
        ? "https://accentchanger.onrender.com"
        : undefined);
    const socket = targetUrl
      ? io(targetUrl, {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 15,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
        })
      : io({
          path: "/socket.io",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 15,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
        });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatusMessage("Connected to Server");
      setErrorMessage(null);
      addLog("info", `Socket connected: ${socket.id}`);
    });

    socket.on("connect_error", (error) => {
      setIsConnected(false);
      const isVercel =
        typeof window !== "undefined" &&
        (window.location.hostname.includes("vercel.app") ||
          window.location.hostname.includes("netlify.app"));
      if (isVercel && !settings.serverUrl?.trim()) {
        setErrorMessage(
          "Vercel is serverless and cannot run persistent WebSockets. Tap ⚙ Configure to enter your backend server URL (e.g. Render / Railway / local tunnel)."
        );
      } else {
        setErrorMessage(`Server connection error: ${error.message}`);
      }
      setStatusMessage("Connection Failed");
      addLog("error", `Connection failed: ${error.message}`);
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      setStatusMessage(`Reconnecting (attempt ${attempt})...`);
      addLog("status", `Reconnection attempt ${attempt}...`);
    });

    socket.io.on("reconnect", () => {
      setIsConnected(true);
      setStatusMessage("Reconnected to Server");
      addLog("info", "Successfully reconnected to server");
    });

    socket.io.on("reconnect_error", (error) => {
      addLog("error", `Reconnection error: ${error.message}`);
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      setIsRecording(false);
      setStatusMessage(`Disconnected (${reason})`);
      addLog("error", `Socket disconnected: ${reason}`);
    });

    socket.on("status", (data: { status: string; message: string; voice?: string }) => {
      setStatusMessage(data.message);
      addLog("status", `Server: ${data.message}`);
    });

    socket.on("error", (err: { message: string }) => {
      setErrorMessage(err.message);
      addLog("error", `Server error: ${err.message}`);
    });

    socket.on("server-audio-received", (data: { bytesReceived: number; timestamp: number }) => {
      addLog("audio-in", `Sent ${data.bytesReceived}B audio frame`);
    });

    // Handle Transcript stream from Gemini Live
    socket.on("transcript", (data: { speaker: string; text: string }) => {
      addLog("info", `${data.speaker}: ${data.text}`);
      addMessage("assistant", data.speaker, data.text);
    });

    // Handle AI voice output received from backend (RVC / Gemini Live)
    socket.on("audio-response", async (audioPayload: ArrayBuffer | string) => {
      if (lastChunkSentTimeRef.current > 0) {
        const measuredLatency = Date.now() - lastChunkSentTimeRef.current;
        setLatencyMs(measuredLatency);
      }

      setIsPlaying(true);
      addLog("audio-out", `Playing converted voice chunk`);

      if (typeof audioPayload === "string") {
        const binaryString = window.atob(audioPayload);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        await playerRef.current?.queueEncodedChunk(bytes.buffer);
      } else {
        await playerRef.current?.queueEncodedChunk(audioPayload);
      }
    });

    // Animation loop for audio visualizers
    const updateVisualizers = () => {
      if (recorderRef.current && recorderRef.current.active) {
        setInputFreqData(new Uint8Array(recorderRef.current.getFrequencyData()));
      } else {
        setInputFreqData(new Uint8Array(0));
      }

      if (playerRef.current && playerRef.current.active) {
        setIsPlaying(true);
        setOutputFreqData(new Uint8Array(playerRef.current.getFrequencyData()));
      } else {
        setIsPlaying(false);
        setOutputFreqData(new Uint8Array(0));
      }

      animationFrameRef.current = requestAnimationFrame(updateVisualizers);
    };
    animationFrameRef.current = requestAnimationFrame(updateVisualizers);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      recorderRef.current?.stop();
      playerRef.current?.stop();
      socket.disconnect();
    };
  }, [addLog, addMessage, settings.serverUrl]);

  // Start Voice Streaming session
  const startConversation = useCallback(async () => {
    if (!recorderRef.current || !socketRef.current) return;

    try {
      setErrorMessage(null);
      addLog("info", `Requesting microphone access...`);

      socketRef.current.emit("start-stream", {
        voice: settings.voice,
        sampleRate: 16000,
        pitchShift: settings.pitchShift,
      });

      // Unlock audio playback context during user click gesture (critical for mobile iOS/Android)
      playerRef.current?.ensureContext();
      playerRef.current?.stop();

      await recorderRef.current.start({
        sampleRate: 16000,
        onPcmChunk: (pcmBuffer: ArrayBuffer) => {
          if (socketRef.current?.connected) {
            lastChunkSentTimeRef.current = Date.now();
            socketRef.current.emit("audio-chunk", pcmBuffer);
          }
        },
        onError: (err) => {
          setErrorMessage(err.message);
          addLog("error", `Recorder error: ${err.message}`);
          setIsRecording(false);
        },
      });

      setIsRecording(true);
      setStatusMessage(`Listening to You (Streaming to ${settings.voice})`);
      addLog("info", "Microphone stream active");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setErrorMessage(`Microphone error: ${error.message}`);
      addLog("error", `Mic failed: ${error.message}`);
      setIsRecording(false);
      setStatusMessage("Mic Access Denied");
    }
  }, [settings, addLog]);

  // Stop Voice Streaming session
  const stopConversation = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
    }
    if (socketRef.current) {
      socketRef.current.emit("stop-stream");
    }
    setIsRecording(false);
    setStatusMessage("Thinking...");
    addLog("info", "Microphone stream stopped, awaiting AI response...");
  }, [addLog]);

  const updateSettings = useCallback((newSettings: Partial<ConversationSettings>) => {
    if (typeof window !== "undefined") {
      if (newSettings.serverUrl !== undefined) {
        localStorage.setItem("accent_changer_server_url", newSettings.serverUrl);
      }
      if (newSettings.voice !== undefined) {
        localStorage.setItem("accent_changer_voice", newSettings.voice);
      }
    }
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    playerRef.current?.setVolume(val);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    isConnected,
    isRecording,
    isPlaying,
    statusMessage,
    errorMessage,
    dismissError: () => setErrorMessage(null),
    settings,
    updateSettings,
    volume,
    setVolume,
    startConversation,
    stopConversation,
    inputFreqData,
    outputFreqData,
    logs,
    clearLogs,
    messages,
    latencyMs,
  };
}
