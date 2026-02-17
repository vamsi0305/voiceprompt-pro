"use client";

import React, { useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/conversation";

interface ConversationChatProps {
    messages: ChatMessage[];
    isTyping: boolean;
    interimTranscript: string;
}

export default function ConversationChat({
    messages,
    isTyping,
    interimTranscript,
}: ConversationChatProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping, interimTranscript]);

    return (
        <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-[400px] min-h-[200px]">
            {messages.length === 0 && !interimTranscript && (
                <div className="flex items-center justify-center h-full py-12 text-center">
                    <div>
                        <div className="text-4xl mb-4">🎙️</div>
                        <p className="text-[var(--text-secondary)] text-sm">
                            Say <span className="text-[var(--accent-green)] font-semibold">&quot;Hey Listen&quot;</span> to wake me up
                        </p>
                        <p className="text-[var(--text-muted)] text-xs mt-2">
                            Then tell me what prompt you need, in any language
                        </p>
                    </div>
                </div>
            )}

            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                    <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                ? "bg-[var(--accent-purple)] bg-opacity-20 text-[var(--text-primary)] rounded-br-md"
                                : "glass-card-sm text-[var(--text-primary)] rounded-bl-md"
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium" style={{ color: msg.role === "user" ? "var(--accent-purple)" : "var(--accent-green)" }}>
                                {msg.role === "user" ? (msg.isVoice ? "🎤 You" : "⌨️ You") : "🤖 VoicePrompt"}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                        {msg.content}
                    </div>
                </div>
            ))}

            {/* Interim transcript (what user is currently saying) */}
            {interimTranscript && (
                <div className="flex justify-end animate-fade-in">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed border border-[var(--accent-purple)] border-opacity-30 text-[var(--text-secondary)]" style={{ borderColor: "rgba(139, 92, 246, 0.3)" }}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium" style={{ color: "var(--accent-purple)" }}>
                                🎤 Speaking...
                            </span>
                        </div>
                        {interimTranscript}
                    </div>
                </div>
            )}

            {/* Typing indicator */}
            {isTyping && (
                <div className="flex justify-start animate-fade-in">
                    <div className="glass-card-sm px-4 py-3 rounded-2xl rounded-bl-md">
                        <div className="flex gap-1.5 items-center">
                            <div className="typing-dot" style={{ animationDelay: "0s" }} />
                            <div className="typing-dot" style={{ animationDelay: "0.2s" }} />
                            <div className="typing-dot" style={{ animationDelay: "0.4s" }} />
                        </div>
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
