"use client";

import React, { useState } from "react";
import { FormattedPrompt } from "@/lib/formatters";

interface PromptOutputProps {
    formattedPrompts: FormattedPrompt[];
    qualityScore: number;
    onCopy: (text: string) => void;
}

export default function PromptOutput({
    formattedPrompts,
    qualityScore,
    onCopy,
}: PromptOutputProps) {
    const [activeTab, setActiveTab] = useState(0);

    if (formattedPrompts.length === 0) {
        return (
            <div className="glass-card p-6 text-center">
                <div className="text-3xl mb-3">📋</div>
                <p className="text-[var(--text-secondary)] text-sm">
                    Your structured prompts will appear here
                </p>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                    Optimized for Claude, Gemini, ChatGPT, DeepSeek & Grok
                </p>
            </div>
        );
    }

    const activePrompt = formattedPrompts[activeTab];

    return (
        <div className="glass-card overflow-hidden animate-slide-up">
            {/* Quality Score Bar */}
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">Prompt Quality</span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${qualityScore}%`,
                                    background:
                                        qualityScore >= 80
                                            ? "var(--accent-green)"
                                            : qualityScore >= 50
                                                ? "var(--accent-orange)"
                                                : "var(--accent-red)",
                                }}
                            />
                        </div>
                        <span
                            className="text-xs font-bold"
                            style={{
                                color:
                                    qualityScore >= 80
                                        ? "var(--accent-green)"
                                        : qualityScore >= 50
                                            ? "var(--accent-orange)"
                                            : "var(--accent-red)",
                            }}
                        >
                            {qualityScore}/100
                        </span>
                    </div>
                </div>
            </div>

            {/* LLM Tabs */}
            <div className="flex border-b border-[var(--border-color)] overflow-x-auto">
                {formattedPrompts.map((fp, idx) => (
                    <button
                        key={fp.llmName}
                        onClick={() => setActiveTab(idx)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all ${idx === activeTab ? "tab-active" : "tab-inactive"
                            }`}
                    >
                        <span>{fp.llmIcon}</span>
                        <span>{fp.llmName}</span>
                    </button>
                ))}
            </div>

            {/* Active prompt content */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[var(--text-muted)]">
                        {activePrompt.description}
                    </span>
                    <button
                        onClick={() => onCopy(activePrompt.formattedPrompt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:scale-105"
                        style={{
                            background: `${activePrompt.color}20`,
                            color: activePrompt.color,
                            border: `1px solid ${activePrompt.color}30`,
                        }}
                    >
                        📋 Copy
                    </button>
                </div>

                <pre className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-primary)] bg-[var(--bg-secondary)] rounded-xl p-4 max-h-[400px] overflow-y-auto font-mono">
                    {activePrompt.formattedPrompt}
                </pre>
            </div>
        </div>
    );
}
