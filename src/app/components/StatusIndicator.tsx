"use client";

import React from "react";

interface StatusIndicatorProps {
    status: "idle" | "wake-listening" | "listening" | "processing" | "speaking";
}

const STATUS_CONFIG = {
    idle: {
        label: 'Say "Hey Listen" to start',
        color: "bg-gray-500",
        pulseClass: "",
        dotColor: "#6b7280",
        glow: false,
    },
    "wake-listening": {
        label: "Waiting for wake word...",
        color: "bg-yellow-500",
        pulseClass: "",
        dotColor: "#eab308",
        glow: false,
    },
    listening: {
        label: "Listening...",
        color: "bg-green-500",
        pulseClass: "pulse-green",
        dotColor: "#00e68a",
        glow: true,
    },
    processing: {
        label: "Structuring your prompt...",
        color: "bg-blue-500",
        pulseClass: "pulse-blue",
        dotColor: "#3b82f6",
        glow: true,
    },
    speaking: {
        label: "Speaking...",
        color: "bg-purple-500",
        pulseClass: "pulse-purple",
        dotColor: "#8b5cf6",
        glow: true,
    },
};

export default function StatusIndicator({ status }: StatusIndicatorProps) {
    const config = STATUS_CONFIG[status];

    return (
        <div className="flex items-center gap-3">
            <div className="relative">
                <div
                    className={`w-3 h-3 rounded-full ${config.color} ${config.pulseClass}`}
                    style={
                        config.glow
                            ? {
                                boxShadow: `0 0 10px ${config.dotColor}40, 0 0 20px ${config.dotColor}20`,
                            }
                            : undefined
                    }
                />
            </div>
            <span className="text-sm font-medium" style={{ color: config.dotColor }}>
                {config.label}
            </span>
        </div>
    );
}
