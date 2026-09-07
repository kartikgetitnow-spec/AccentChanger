"use client";

import React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceButtonProps {
  isRecording: boolean;
  isPlaying: boolean;
  disabled?: boolean;
  onClick: () => void;
  mode?: "toggle" | "push-to-talk";
  onMouseDown?: () => void;
  onMouseUp?: () => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isRecording,
  isPlaying,
  disabled = false,
  onClick,
  mode = "toggle",
  onMouseDown,
  onMouseUp,
}) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Animated Soundwave Ripple Rings */}
      {isRecording && (
        <>
          <span className="absolute w-40 h-40 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
          <span className="absolute w-48 h-48 rounded-full border border-rose-500/30 animate-pulse pointer-events-none" />
        </>
      )}

      {isPlaying && !isRecording && (
        <>
          <span className="absolute w-36 h-36 rounded-full bg-amber-500/20 animate-ping pointer-events-none" />
          <span className="absolute w-44 h-44 rounded-full border border-amber-500/30 animate-pulse pointer-events-none" />
        </>
      )}

      <button
        onClick={onClick}
        onMouseDown={mode === "push-to-talk" ? onMouseDown : undefined}
        onMouseUp={mode === "push-to-talk" ? onMouseUp : undefined}
        onTouchStart={mode === "push-to-talk" ? onMouseDown : undefined}
        onTouchEnd={mode === "push-to-talk" ? onMouseUp : undefined}
        disabled={disabled}
        className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 select-none cursor-pointer ${
          disabled
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50"
            : isRecording
            ? "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/40 ring-rose-500/30 scale-105"
            : isPlaying
            ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/30 ring-amber-500/30"
            : "bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-blue-500/25 ring-blue-500/20 hover:scale-105"
        }`}
      >
        {disabled ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : isRecording ? (
          <>
            <MicOff className="w-10 h-10" />
            <span className="text-[11px] font-bold uppercase tracking-wider mt-1">
              Stop
            </span>
          </>
        ) : (
          <>
            <Mic className="w-10 h-10" />
            <span className="text-[11px] font-bold uppercase tracking-wider mt-1">
              {mode === "push-to-talk" ? "Hold" : "Talk"}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
