"use client";

import React, { useState, useEffect } from "react";

export interface AppSettings {
    silenceTimeout: number;       // seconds before auto-processing (1-10)
    ttsSpeed: number;             // speech rate (0.5 - 2.0)
    ttsPitch: number;             // speech pitch (0.5 - 2.0)
    ttsVoice: string;             // selected voice name
    autoStructure: boolean;       // auto-structure after sufficient info
    wakeWordEnabled: boolean;     // enable/disable wake word detection
    wakeWord: string;             // custom wake word
    showQualityScore: boolean;    // show prompt quality score
    defaultLanguage: string;      // default speech language
    theme: "dark" | "purple" | "midnight"; // color theme
    autoSaveHistory: boolean;     // auto save to history
    maxHistoryItems: number;      // max prompts in history
}

export const DEFAULT_SETTINGS: AppSettings = {
    silenceTimeout: 3,
    ttsSpeed: 1.0,
    ttsPitch: 1.0,
    ttsVoice: "",
    autoStructure: true,
    wakeWordEnabled: true,
    wakeWord: "hey listen",
    showQualityScore: true,
    defaultLanguage: "te-IN",
    theme: "dark",
    autoSaveHistory: true,
    maxHistoryItems: 50,
};

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

function loadSettings(): AppSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
        const saved = localStorage.getItem("voiceprompt-settings");
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch { } // eslint-disable-line no-empty
    return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings) {
    try {
        localStorage.setItem("voiceprompt-settings", JSON.stringify(settings));
    } catch { } // eslint-disable-line no-empty
}

export function useSettings(): [AppSettings, (s: AppSettings) => void] {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    const updateSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    return [settings, updateSettings];
}

export default function SettingsPanel({
    isOpen,
    onClose,
    settings,
    onSettingsChange,
}: SettingsPanelProps) {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const loadVoices = () => {
            const v = window.speechSynthesis?.getVoices() || [];
            setVoices(v);
        };
        loadVoices();
        window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
        return () => {
            window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
        };
    }, []);

    if (!isOpen) return null;

    const update = (partial: Partial<AppSettings>) => {
        onSettingsChange({ ...settings, ...partial });
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
                <div
                    className="pointer-events-auto w-[480px] max-w-[95vw] max-h-[85vh] glass-card rounded-2xl flex flex-col overflow-hidden"
                    style={{ animation: "fadeScaleIn 0.25s ease-out forwards" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⚙️</span>
                            <h2 className="text-sm font-bold text-[var(--text-primary)]">Settings</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all text-xs"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">

                        {/* Voice Recognition */}
                        <section>
                            <h3 className="text-xs font-semibold text-[var(--accent-purple)] uppercase tracking-wider mb-3">
                                🎤 Voice Recognition
                            </h3>

                            <div className="space-y-3">
                                {/* Wake Word Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Wake Word Detection</label>
                                        <p className="text-[10px] text-[var(--text-muted)]">Say the wake word to activate</p>
                                    </div>
                                    <button
                                        onClick={() => update({ wakeWordEnabled: !settings.wakeWordEnabled })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${settings.wakeWordEnabled ? "bg-[var(--accent-green)]" : "bg-[var(--bg-secondary)]"
                                            }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${settings.wakeWordEnabled ? "left-5" : "left-0.5"
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Custom Wake Word */}
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-primary)] block mb-1">Wake Word</label>
                                    <input
                                        type="text"
                                        value={settings.wakeWord}
                                        onChange={(e) => update({ wakeWord: e.target.value.toLowerCase() })}
                                        className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
                                        placeholder="hey listen"
                                    />
                                </div>

                                {/* Silence Timeout */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Silence Timeout</label>
                                        <span className="text-[10px] text-[var(--accent-green)]">{settings.silenceTimeout}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="0.5"
                                        value={settings.silenceTimeout}
                                        onChange={(e) => update({ silenceTimeout: parseFloat(e.target.value) })}
                                        className="w-full accent-[var(--accent-purple)] h-1"
                                    />
                                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                                        <span>1s (fast)</span>
                                        <span>10s (patient)</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <hr className="border-[var(--border-color)]" />

                        {/* Text-to-Speech */}
                        <section>
                            <h3 className="text-xs font-semibold text-[var(--accent-purple)] uppercase tracking-wider mb-3">
                                🔊 Text-to-Speech
                            </h3>

                            <div className="space-y-3">
                                {/* TTS Voice */}
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-primary)] block mb-1">Voice</label>
                                    <select
                                        value={settings.ttsVoice}
                                        onChange={(e) => update({ ttsVoice: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
                                    >
                                        <option value="">System Default</option>
                                        {voices.map((v, i) => (
                                            <option key={i} value={v.name}>
                                                {v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Speed */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Speed</label>
                                        <span className="text-[10px] text-[var(--accent-green)]">{settings.ttsSpeed.toFixed(1)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={settings.ttsSpeed}
                                        onChange={(e) => update({ ttsSpeed: parseFloat(e.target.value) })}
                                        className="w-full accent-[var(--accent-purple)] h-1"
                                    />
                                </div>

                                {/* Pitch */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Pitch</label>
                                        <span className="text-[10px] text-[var(--accent-green)]">{settings.ttsPitch.toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={settings.ttsPitch}
                                        onChange={(e) => update({ ttsPitch: parseFloat(e.target.value) })}
                                        className="w-full accent-[var(--accent-purple)] h-1"
                                    />
                                </div>
                            </div>
                        </section>

                        <hr className="border-[var(--border-color)]" />

                        {/* Prompt Settings */}
                        <section>
                            <h3 className="text-xs font-semibold text-[var(--accent-purple)] uppercase tracking-wider mb-3">
                                📝 Prompt Settings
                            </h3>

                            <div className="space-y-3">
                                {/* Auto Structure */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Auto-Structure</label>
                                        <p className="text-[10px] text-[var(--text-muted)]">Automatically structure when ready</p>
                                    </div>
                                    <button
                                        onClick={() => update({ autoStructure: !settings.autoStructure })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${settings.autoStructure ? "bg-[var(--accent-green)]" : "bg-[var(--bg-secondary)]"
                                            }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${settings.autoStructure ? "left-5" : "left-0.5"
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Show Quality Score */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Show Quality Score</label>
                                        <p className="text-[10px] text-[var(--text-muted)]">Display prompt quality rating</p>
                                    </div>
                                    <button
                                        onClick={() => update({ showQualityScore: !settings.showQualityScore })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${settings.showQualityScore ? "bg-[var(--accent-green)]" : "bg-[var(--bg-secondary)]"
                                            }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${settings.showQualityScore ? "left-5" : "left-0.5"
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </section>

                        <hr className="border-[var(--border-color)]" />

                        {/* History & Storage */}
                        <section>
                            <h3 className="text-xs font-semibold text-[var(--accent-purple)] uppercase tracking-wider mb-3">
                                💾 History & Storage
                            </h3>

                            <div className="space-y-3">
                                {/* Auto Save */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Auto-Save History</label>
                                        <p className="text-[10px] text-[var(--text-muted)]">Save prompts automatically</p>
                                    </div>
                                    <button
                                        onClick={() => update({ autoSaveHistory: !settings.autoSaveHistory })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${settings.autoSaveHistory ? "bg-[var(--accent-green)]" : "bg-[var(--bg-secondary)]"
                                            }`}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${settings.autoSaveHistory ? "left-5" : "left-0.5"
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Max History Items */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-medium text-[var(--text-primary)]">Max History Items</label>
                                        <span className="text-[10px] text-[var(--accent-green)]">{settings.maxHistoryItems}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="200"
                                        step="10"
                                        value={settings.maxHistoryItems}
                                        onChange={(e) => update({ maxHistoryItems: parseInt(e.target.value) })}
                                        className="w-full accent-[var(--accent-purple)] h-1"
                                    />
                                </div>
                            </div>
                        </section>

                        <hr className="border-[var(--border-color)]" />

                        {/* Theme */}
                        <section>
                            <h3 className="text-xs font-semibold text-[var(--accent-purple)] uppercase tracking-wider mb-3">
                                🎨 Appearance
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(["dark", "purple", "midnight"] as const).map((theme) => (
                                    <button
                                        key={theme}
                                        onClick={() => update({ theme })}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${settings.theme === theme
                                            ? "bg-[var(--accent-purple)] text-white"
                                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                                            }`}
                                    >
                                        {theme === "dark" ? "🌑 Dark" : theme === "purple" ? "💜 Purple" : "🌌 Midnight"}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between">
                        <button
                            onClick={() => onSettingsChange(DEFAULT_SETTINGS)}
                            className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-all"
                        >
                            Reset to Default
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-purple)] text-white hover:opacity-90 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </>
    );
}
