"use client";

import React, { useState } from "react";
import { useVoiceConversation } from "@/hooks/useVoiceConversation";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { VoiceButton } from "@/components/VoiceButton";
import { ChatTranscript } from "@/components/ChatTranscript";
import { SettingsModal } from "@/components/SettingsModal";
import { ErrorAlert } from "@/components/ErrorAlert";
import {
  Sliders,
  Volume2,
  Terminal,
  Activity,
  Trash2,
  Sparkles,
  Globe,
} from "lucide-react";

const ACCENT_PRESETS = [
  {
    id: "USA Accent",
    label: "🇺🇸 USA Accent",
    tagline: "American Voice Output",
    desc: "AI speaks in an authentic General American (USA) accent",
  },
  {
    id: "UK Accent",
    label: "🇬🇧 UK Accent",
    tagline: "British Voice Output",
    desc: "AI speaks in a refined British (UK) accent",
  },
];

export default function HomePage() {
  const {
    isConnected,
    isRecording,
    isPlaying,
    statusMessage,
    errorMessage,
    dismissError,
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
  } = useVoiceConversation();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-3 sm:p-6 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-3 border-b border-zinc-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              AccentChanger
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 max-w-[160px] truncate">
                {settings.voice === "UK Accent" ||
                settings.voice.includes("UK") ||
                settings.voice.includes("British")
                  ? "🇬🇧 UK Accent"
                  : "🇺🇸 USA Accent"}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Real-time conversational voice & accent converter
            </p>
          </div>
        </div>

        {/* Right Header: Connection Badge & Settings Trigger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ConnectionBadge
            isConnected={isConnected}
            statusMessage={statusMessage}
            latencyMs={latencyMs}
            serverUrl={settings.serverUrl}
          />
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors shadow-sm"
            title="Audio & Voice Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Error Alert Display */}
      <ErrorAlert
        error={errorMessage}
        onRetry={startConversation}
        onDismiss={dismissError}
      />

      {/* Main Grid: Controls & Conversation */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Voice Activation & Visualizers (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Voice Activation Card */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-900/80 border border-zinc-800/90 p-6 flex flex-col items-center backdrop-blur-md shadow-2xl">
            {/* Dynamic Ambient Aura */}
            <div
              className={`absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
                isRecording
                  ? "bg-rose-500/20 opacity-100"
                  : isPlaying
                  ? "bg-amber-500/20 opacity-100"
                  : "bg-blue-600/10 opacity-40"
              }`}
            />

            {/* Accent Mode Selector Header */}
            <div className="w-full flex flex-col gap-2.5 mb-5 z-10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Accent & Voice Persona
                </span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  Configure
                  <span className="text-[10px] text-zinc-500">⚙</span>
                </button>
              </div>

              {/* Quick-Switch Accent Selector: USA vs UK */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                {ACCENT_PRESETS.map((opt) => {
                  const isSelected =
                    settings.voice === opt.id ||
                    (opt.id === "USA Accent" &&
                      (settings.voice.includes("USA") || settings.voice.includes("American"))) ||
                    (opt.id === "UK Accent" &&
                      (settings.voice.includes("UK") || settings.voice.includes("British")));

                  return (
                    <button
                      key={opt.id}
                      onClick={() => updateSettings({ voice: opt.id })}
                      className={`py-3 px-3 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 border shadow-sm cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500/70 text-amber-300 font-bold shadow-amber-500/10 ring-1 ring-amber-500/40"
                          : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/90"
                      }`}
                      title={opt.desc}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span>{opt.label}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] tracking-wide ${
                          isSelected ? "text-amber-400/90 font-medium" : "text-zinc-500"
                        }`}
                      >
                        {opt.tagline}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                <span>AI Spoken Output:</span>
                <span className="font-semibold text-amber-400">
                  {settings.voice === "UK Accent" ||
                  settings.voice.includes("UK") ||
                  settings.voice.includes("British")
                    ? "🇬🇧 UK British Accent"
                    : "🇺🇸 USA American Accent"}
                </span>
              </div>
            </div>

            {/* Tactile Voice Activation Button */}
            <div className="my-3">
              <VoiceButton
                isRecording={isRecording}
                isPlaying={isPlaying}
                disabled={!isConnected}
                mode={settings.talkMode}
                onClick={isRecording ? stopConversation : startConversation}
                onMouseDown={startConversation}
                onMouseUp={stopConversation}
              />
            </div>

            {/* Status Text & Instruction */}
            <div className="text-center mt-3">
              <p className="text-sm font-semibold text-zinc-100">{statusMessage}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isRecording
                  ? "Microphone streaming in real-time"
                  : isPlaying
                  ? `${settings.voice} is responding...`
                  : settings.talkMode === "push-to-talk"
                  ? "Press and hold to talk"
                  : "Click to start live conversation"}
              </p>
            </div>

            {/* Dual Live Audio Visualizers */}
            <div className="w-full grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-zinc-800/80">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 mb-1.5">
                  <Activity className="w-3 h-3 text-rose-400" />
                  <span>Mic Stream</span>
                </div>
                <AudioVisualizer
                  data={inputFreqData}
                  active={isRecording}
                  barColor="#f43f5e"
                  activeGlow="rgba(244, 63, 94, 0.5)"
                />
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 mb-1.5">
                  <Activity className="w-3 h-3 text-amber-400" />
                  <span>AI Voice</span>
                </div>
                <AudioVisualizer
                  data={outputFreqData}
                  active={isPlaying}
                  barColor="#f59e0b"
                  activeGlow="rgba(245, 158, 11, 0.5)"
                />
              </div>
            </div>

            {/* Volume Control Bar */}
            <div className="w-full flex items-center justify-between mt-5 pt-3 border-t border-zinc-800/60">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                <span>Volume</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-32 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          {/* Quick Info & Latency Pipeline Card */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
                Real-Time Flow Status
              </span>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <Terminal className="w-3 h-3" />
                {showLogs ? "Hide Console" : "Show Console"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Input</span>
                <span className="font-mono text-zinc-300 font-semibold">16kHz PCM</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Intelligence</span>
                <span className="font-mono text-zinc-300 font-semibold">Gemini Live</span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Voice Model</span>
                <span className="font-mono text-zinc-300 font-semibold">RVC Cloned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Chat Transcript & Diagnostics (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-[580px]">
          {/* Main Chat Interface */}
          <div className="flex-1 min-h-0">
            <ChatTranscript
              messages={messages}
              isPlaying={isPlaying}
              activePersona={settings.voice}
            />
          </div>

          {/* Collapsible Console Log Panel */}
          {showLogs && (
            <div className="h-44 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 p-4 flex flex-col font-mono text-[11px] shadow-xl animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Streaming Packet Log</span>
                </div>
                <button
                  onClick={clearLogs}
                  className="p-1 hover:text-zinc-200 transition-colors"
                  title="Clear logs"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1">
                {logs.length === 0 ? (
                  <p className="text-zinc-600 italic">No packet events yet.</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`px-2 py-1 rounded text-[10px] ${
                        log.type === "error"
                          ? "bg-red-500/10 text-red-300 border border-red-500/20"
                          : log.type === "audio-in"
                          ? "bg-blue-500/10 text-blue-300"
                          : log.type === "audio-out"
                          ? "bg-amber-500/10 text-amber-300"
                          : "text-zinc-400"
                      }`}
                    >
                      <span className="text-zinc-500 mr-2">[{log.timestamp}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </main>
  );
}
