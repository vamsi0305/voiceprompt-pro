"use client";

import React from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/speech";

interface LanguageSelectorProps {
    currentLang: string;
    onLanguageChange: (lang: string) => void;
}

export default function LanguageSelector({
    currentLang,
    onLanguageChange,
}: LanguageSelectorProps) {
    const current = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang);

    return (
        <div className="relative">
            <select
                value={currentLang}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="appearance-none px-3 py-1.5 pr-8 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors cursor-pointer"
            >
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-[10px]">
                ▼
            </div>
            {current && (
                <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                    {current.flag}
                </span>
            )}
        </div>
    );
}
