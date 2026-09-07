"use client";

import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  data: Uint8Array;
  active: boolean;
  barColor?: string;
  activeGlow?: string;
  label?: string;
  mode?: "bars" | "wave";
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  data,
  active,
  barColor = "#3b82f6",
  activeGlow = "rgba(59, 130, 246, 0.4)",
  label,
  mode = "bars",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!active || data.length === 0) {
      // Idle resting wave
      ctx.fillStyle = "#27272a";
      const barCount = 28;
      const barWidth = width / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 2);
        const idleHeight = 3 + Math.sin(i * 0.3) * 2;
        ctx.fillRect(x, (height - idleHeight) / 2, barWidth, idleHeight);
      }
      return;
    }

    if (mode === "wave") {
      // Oscilloscope continuous waveform
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = barColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = activeGlow;

      const sliceWidth = width / data.length;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Dynamic frequency bars with gradients & peaks
    const barCount = 28;
    const barWidth = width / barCount - 2.5;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * data.length);
      const val = data[dataIndex] || 0;
      const percent = val / 255;
      const barHeight = Math.max(3, percent * height * 0.88);
      const x = i * (barWidth + 2.5);
      const y = (height - barHeight) / 2;

      // Gradient bar fill
      const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
      grad.addColorStop(0, barColor);
      grad.addColorStop(1, activeGlow);

      ctx.shadowBlur = 6;
      ctx.shadowColor = activeGlow;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }
  }, [data, active, barColor, activeGlow, mode]);

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      {label && <span className="text-[11px] font-medium text-zinc-400">{label}</span>}
      <canvas
        ref={canvasRef}
        width={300}
        height={52}
        className="w-full h-12 rounded-xl bg-zinc-900/80 border border-zinc-800 shadow-inner"
      />
    </div>
  );
};
