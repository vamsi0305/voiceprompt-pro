"use client";

import React from "react";

interface VoiceRecorderProps {
    isListening: boolean;
    isProcessing: boolean;
    onToggle: () => void;
}

export default function VoiceRecorder({
    isListening,
    isProcessing,
    onToggle,
}: VoiceRecorderProps) {
    return (
        <div className="flex flex-col items-center gap-3">
            {/* Waveform visualization */}
            {isListening && (
                <div className="flex items-center gap-1 h-8">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            className="waveform-bar"
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                animationDuration: `${0.6 + Math.random() * 0.6}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Main mic button */}
            <button
                onClick={onToggle}
                disabled={isProcessing}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${isProcessing
                        ? "bg-blue-500/20 cursor-wait"
                        : isListening
                            ? "bg-red-500/20 hover:bg-red-500/30 pulse-green"
                            : "bg-[var(--accent-green)]/20 hover:bg-[var(--accent-green)]/30 hover:scale-110"
                    }`}
                style={{
                    border: `2px solid ${isProcessing ? "var(--accent-blue)" : isListening ? "var(--accent-red, #ef4444)" : "var(--accent-green)"}`,
                }}
            >
                {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : isListening ? (
                    "⏹️"
                ) : (
                    "🎤"
                )}
            </button>

            <span className="text-[10px] text-[var(--text-muted)]">
                {isProcessing
                    ? "Processing..."
                    : isListening
                        ? "Tap to stop"
                        : "Tap to speak"}
            </span>
        </div>
    );
}
