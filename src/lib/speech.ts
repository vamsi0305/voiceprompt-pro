// Web Speech API wrapper for speech-to-text
// 100% free, built into Chrome/Edge, no API key needed

export interface SpeechRecognitionResult {
    transcript: string;
    isFinal: boolean;
    confidence: number;
    lang: string;
}

export type SpeechCallback = (result: SpeechRecognitionResult) => void;
export type StatusCallback = (status: "listening" | "stopped" | "error") => void;

// Extend window for SpeechRecognition types
interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResultItem;
    [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultItem {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    }
}

export class SpeechManager {
    private recognition: SpeechRecognitionInstance | null = null;
    private isListening = false;
    private onResult: SpeechCallback | null = null;
    private onStatus: StatusCallback | null = null;
    private currentLang = "en-US";
    private shouldRestart = false;

    constructor() {
        if (typeof window !== "undefined") {
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.setupRecognition();
            }
        }
    }

    private setupRecognition() {
        if (!this.recognition) return;

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.currentLang;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (this.onResult) {
                    this.onResult({
                        transcript: result[0].transcript,
                        isFinal: result.isFinal,
                        confidence: result[0].confidence || 0,
                        lang: this.currentLang,
                    });
                }
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (this.shouldRestart) {
                setTimeout(() => this.start(), 100);
            } else {
                this.onStatus?.("stopped");
            }
        };

        this.recognition.onerror = (event: { error: string }) => {
            if (event.error === "no-speech" || event.error === "aborted") return;
            console.error("Speech recognition error:", event.error);
            this.onStatus?.("error");
        };

        this.recognition.onstart = () => {
            this.isListening = true;
            this.onStatus?.("listening");
        };
    }

    setLanguage(lang: string) {
        this.currentLang = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }

    setCallbacks(onResult: SpeechCallback, onStatus: StatusCallback) {
        this.onResult = onResult;
        this.onStatus = onStatus;
    }

    start() {
        if (!this.recognition) return;
        if (this.isListening) return;

        try {
            this.shouldRestart = true;
            this.recognition.lang = this.currentLang;
            this.recognition.start();
        } catch {
            // Already started
        }
    }

    stop() {
        this.shouldRestart = false;
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    getIsListening() {
        return this.isListening;
    }

    isSupported(): boolean {
        return typeof window !== "undefined" &&
            !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
}

// Supported languages for Web Speech API
export const SUPPORTED_LANGUAGES = [
    { code: "te-IN", name: "Telugu", flag: "🇮🇳" },
    { code: "en-US", name: "English (US)", flag: "🇺🇸" },
    { code: "en-IN", name: "English (India)", flag: "🇮🇳" },
    { code: "hi-IN", name: "Hindi", flag: "🇮🇳" },
    { code: "ta-IN", name: "Tamil", flag: "🇮🇳" },
    { code: "kn-IN", name: "Kannada", flag: "🇮🇳" },
    { code: "ml-IN", name: "Malayalam", flag: "🇮🇳" },
    { code: "mr-IN", name: "Marathi", flag: "🇮🇳" },
    { code: "bn-IN", name: "Bengali", flag: "🇮🇳" },
    { code: "gu-IN", name: "Gujarati", flag: "🇮🇳" },
    { code: "es-ES", name: "Spanish", flag: "🇪🇸" },
    { code: "fr-FR", name: "French", flag: "🇫🇷" },
    { code: "de-DE", name: "German", flag: "🇩🇪" },
    { code: "ja-JP", name: "Japanese", flag: "🇯🇵" },
    { code: "ko-KR", name: "Korean", flag: "🇰🇷" },
    { code: "zh-CN", name: "Chinese", flag: "🇨🇳" },
    { code: "ar-SA", name: "Arabic", flag: "🇸🇦" },
    { code: "pt-BR", name: "Portuguese", flag: "🇧🇷" },
    { code: "ru-RU", name: "Russian", flag: "🇷🇺" },
    { code: "it-IT", name: "Italian", flag: "🇮🇹" },
];
