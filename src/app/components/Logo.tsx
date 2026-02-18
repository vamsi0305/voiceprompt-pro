"use client";

import React from "react";

export default function Logo({ size = 32 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
        >
            {/* Background circle with gradient */}
            <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#00e68a" />
                </linearGradient>
                <linearGradient id="mic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e0e0ff" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Outer ring */}
            <circle cx="32" cy="32" r="30" stroke="url(#logo-gradient)" strokeWidth="2" fill="none" opacity="0.6" />

            {/* Inner circle bg */}
            <circle cx="32" cy="32" r="26" fill="url(#logo-gradient)" opacity="0.15" />

            {/* Sound waves (left) */}
            <path d="M16 26 C13 29, 13 35, 16 38" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d="M12 22 C7 27, 7 37, 12 42" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />

            {/* Sound waves (right) */}
            <path d="M48 26 C51 29, 51 35, 48 38" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d="M52 22 C57 27, 57 37, 52 42" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />

            {/* Microphone body */}
            <rect x="27" y="18" width="10" height="18" rx="5" fill="url(#mic-gradient)" filter="url(#glow)" />

            {/* Microphone cradle */}
            <path d="M24 32 C24 40, 40 40, 40 32" stroke="url(#mic-gradient)" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* Microphone stand */}
            <line x1="32" y1="40" x2="32" y2="46" stroke="url(#mic-gradient)" strokeWidth="2" strokeLinecap="round" />
            <line x1="27" y1="46" x2="37" y2="46" stroke="url(#mic-gradient)" strokeWidth="2" strokeLinecap="round" />

            {/* AI sparkle dots */}
            <circle cx="20" cy="20" r="1.5" fill="#8b5cf6" opacity="0.8">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="44" cy="18" r="1" fill="#00e68a" opacity="0.8">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="46" cy="44" r="1.5" fill="#3b82f6" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
}
