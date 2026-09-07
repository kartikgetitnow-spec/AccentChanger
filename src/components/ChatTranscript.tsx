"use client";

import React from "react";
import { MessageSquare, Bot, User, Volume2 } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  speakerName: string;
  text: string;
  timestamp: string;
}

interface ChatTranscriptProps {
  messages: ChatMessage[];
  isPlaying: boolean;
  activePersona: string;
}

export const ChatTranscript: React.FC<ChatTranscriptProps> = ({
  messages,
  isPlaying,
  activePersona,
}) => {
  return (
    <div className="flex flex-col h-full bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span>Live Conversation Transcript</span>
        </div>
        {isPlaying && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 animate-pulse">
            <Volume2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{activePersona} Speaking</span>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
            <Bot className="w-8 h-8 mb-2 opacity-40 text-blue-400" />
            <p>Ready to converse.</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Click the microphone button and speak to hear responses from {activePersona}.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-md ${
                  msg.sender === "user"
                    ? "bg-blue-600"
                    : "bg-gradient-to-tr from-amber-500 to-red-500"
                }`}
              >
                {msg.sender === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[80%] rounded-xl p-3 border ${
                  msg.sender === "user"
                    ? "bg-blue-600/20 border-blue-500/30 text-blue-100"
                    : "bg-zinc-800/80 border-zinc-700/80 text-zinc-100 shadow-lg"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-semibold text-[11px] text-zinc-300">
                    {msg.speakerName}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
                <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
