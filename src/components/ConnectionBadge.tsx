"use client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionBadgeProps {
  isConnected: boolean;
  statusMessage: string;
  latencyMs?: number | null;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  isConnected,
  statusMessage,
  latencyMs,
}) => {
  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setPing(null);
      return;
    }

    const interval = setInterval(async () => {
      const start = performance.now();
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const latency = Math.round(performance.now() - start);
          setPing(latency);
        }
      } catch {
        // ignore ping error
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const displayLatency = latencyMs || ping;

  return (
    <div className="flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-full shadow-inner">
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
        )}
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          }`}
        />
      </div>

      <span className="text-xs font-medium text-zinc-300 max-w-[130px] truncate">
        {statusMessage}
      </span>

      {isConnected && displayLatency !== null && (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            displayLatency < 350
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : displayLatency < 500
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}
          title={latencyMs ? "Round-Trip Voice Latency" : "HTTP Ping"}
        >
          {displayLatency}ms
        </span>
      )}
    </div>
  );
};
