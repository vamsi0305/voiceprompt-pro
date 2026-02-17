// Text-to-Speech wrapper using Web Speech Synthesis API
// 100% free, built into all modern browsers

export class TTSManager {
    private synth: SpeechSynthesis | null = null;
    private preferredVoice: SpeechSynthesisVoice | null = null;

    constructor() {
        if (typeof window !== "undefined") {
            this.synth = window.speechSynthesis;
            this.loadVoice();
        }
    }

    private loadVoice() {
        if (!this.synth) return;

        const setVoice = () => {
            const voices = this.synth!.getVoices();
            // Prefer a natural-sounding English voice
            this.preferredVoice =
                voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
                voices.find((v) => v.lang.startsWith("en-US")) ||
                voices.find((v) => v.lang.startsWith("en")) ||
                voices[0] ||
                null;
        };

        setVoice();
        this.synth.onvoiceschanged = setVoice;
    }

    speak(text: string, onEnd?: () => void): void {
        if (!this.synth) return;

        // Cancel any ongoing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;

        if (this.preferredVoice) {
            utterance.voice = this.preferredVoice;
        }

        utterance.onend = () => onEnd?.();
        utterance.onerror = () => onEnd?.();

        this.synth.speak(utterance);
    }

    stop(): void {
        this.synth?.cancel();
    }

    isSpeaking(): boolean {
        return this.synth?.speaking || false;
    }
}
