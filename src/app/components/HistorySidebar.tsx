"use client";

import React from "react";
import { SavedPrompt } from "@/lib/storage";

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    prompts: SavedPrompt[];
    onSelect: (prompt: SavedPrompt) => void;
    onDelete: (id: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export default function HistorySidebar({
    isOpen,
    onClose,
    prompts,
    onSelect,
    onDelete,
    searchQuery,
    onSearchChange,
}: HistorySidebarProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div className="fixed top-0 right-0 h-full w-80 z-50 glass-card rounded-l-2xl flex flex-col animate-slide-in-right"
                style={{
                    animation: "slideInRight 0.3s ease-out forwards",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        📜 Prompt History
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all text-xs"
                    >
                        ✕
                    </button>
                </div>

                {/* Search */}
                <div className="p-3">
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
                    />
                </div>

                {/* Prompt list */}
                <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-2">
                    {prompts.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-2xl mb-2">📝</div>
                            <p className="text-xs text-[var(--text-muted)]">
                                {searchQuery ? "No matching prompts" : "No saved prompts yet"}
                            </p>
                        </div>
                    ) : (
                        prompts.map((prompt) => (
                            <div
                                key={prompt.id}
                                className="glass-card-sm p-3 cursor-pointer hover:bg-[var(--bg-card-hover)] transition-all group"
                                onClick={() => onSelect(prompt)}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs font-medium text-[var(--text-primary)] truncate">
                                            {prompt.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    background: "var(--accent-purple)20",
                                                    color: "var(--accent-purple)",
                                                }}
                                            >
                                                {prompt.intent}
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)]">
                                                {new Date(prompt.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(prompt.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-all text-[10px]"
                                    >
                                        🗑️
                                    </button>
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] truncate mt-1">
                                    {prompt.rawTranscript}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
        </>
    );
}
