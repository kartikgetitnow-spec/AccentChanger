"use client";

import React from "react";
import { X, Sliders, Volume2, Mic, Cpu, Server } from "lucide-react";

export interface ConversationSettings {
  voice: string;
  pitchShift: number;
  latencyMode: "low-latency" | "high-quality";
  talkMode: "toggle" | "push-to-talk";
  echoCancellation: boolean;
  serverUrl?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversationSettings;
  onUpdateSettings: (newSettings: Partial<ConversationSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Audio & Voice Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Accent & Voice Persona (AI Spoken Output)
          </label>
          <select
            value={
              settings.voice === "UK Accent" ||
              settings.voice.toLowerCase().includes("uk") ||
              settings.voice.toLowerCase().includes("british")
                ? "UK Accent"
                : "USA Accent"
            }
            onChange={(e) => onUpdateSettings({ voice: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-sm rounded-xl px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USA Accent">🇺🇸 USA Accent (American Voice Output)</option>
            <option value="UK Accent">🇬🇧 UK Accent (British Voice Output)</option>
          </select>
          <p className="text-[11px] text-zinc-500">
            Selected accent will be the spoken output voice of the AI in real-time.
          </p>
        </div>

        {/* Pitch Shift Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              Pitch Adjustment
            </label>
            <span className="font-mono text-zinc-300">
              {settings.pitchShift > 0 ? `+${settings.pitchShift}` : settings.pitchShift} st
            </span>
          </div>
          <input
            type="range"
            min="-6"
            max="6"
            step="0.5"
            value={settings.pitchShift}
            onChange={(e) => onUpdateSettings({ pitchShift: parseFloat(e.target.value) })}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Talk Mode Switch */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            Interaction Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ talkMode: "toggle" })}
              className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                settings.talkMode === "toggle"
                  ? "bg-blue-600/20 border-blue-500 text-blue-200 font-semibold"
                  : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Toggle Click
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ talkMode: "push-to-talk" })}
              className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                settings.talkMode === "push-to-talk"
                  ? "bg-blue-600/20 border-blue-500 text-blue-200 font-semibold"
                  : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Push-to-Talk (Hold)
            </button>
          </div>
        </div>

        {/* Latency Optimization Preset */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Buffer & Latency Preset
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ latencyMode: "low-latency" })}
              className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                settings.latencyMode === "low-latency"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold"
                  : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Ultra Low Latency
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ latencyMode: "high-quality" })}
              className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                settings.latencyMode === "high-quality"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold"
                  : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              High Quality Jitter Buffer
            </button>
          </div>
        </div>

        {/* Backend WebSocket Server URL */}
        <div className="space-y-2 pt-1 border-t border-zinc-800">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              Backend Server URL
            </label>
            <span className="text-[10px] text-zinc-500">For Vercel / Netlify</span>
          </div>
          <input
            type="text"
            placeholder="e.g. https://your-backend.onrender.com (or empty for same host)"
            value={settings.serverUrl || ""}
            onChange={(e) => onUpdateSettings({ serverUrl: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 text-xs rounded-xl px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Vercel is serverless and cannot host persistent WebSocket connections. If using Vercel, enter your persistent backend server URL (from Render, Railway, or a local tunnel).
          </p>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
