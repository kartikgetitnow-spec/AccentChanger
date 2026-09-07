"use client";

import React from "react";
import { AlertCircle, RotateCcw, X } from "lucide-react";

interface ErrorAlertProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <div className="w-full max-w-4xl mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between text-red-200 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div className="text-xs">
          <p className="font-semibold text-red-300">Audio Streaming Notice</p>
          <p className="text-red-400/90 mt-0.5">{error}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-medium transition-colors border border-red-500/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-500/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
