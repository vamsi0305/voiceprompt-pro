// Wake word detection — listens for "Hey Listen"
// Uses Web Speech API in continuous mode, scanning for the keyword
// 100% free, no API key, runs entirely in browser

export type WakeWordCallback = () => void;

export class WakeWordDetector {
    private listening = false;
    private onWake: WakeWordCallback | null = null;
    private recognition: ReturnType<typeof this.createRecognition> | null = null;
    private cooldown = false;

    private createRecognition() {
        if (typeof window === "undefined") return null;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        return new SR();
    }

    start(onWake: WakeWordCallback) {
        if (this.listening) return;
        this.onWake = onWake;

        this.recognition = this.createRecognition();
        if (!this.recognition) return;

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        this.recognition.onresult = (event: unknown) => {
            const e = event as { resultIndex: number; results: { length: number;[key: number]: { [key: number]: { transcript: string } } } };
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const transcript = e.results[i][0].transcript.toLowerCase().trim();
                if (
                    !this.cooldown &&
                    (transcript.includes("hey listen") ||
                        transcript.includes("hey lisen") ||
                        transcript.includes("hey lisn") ||
                        transcript.includes("heyy listen") ||
                        transcript.includes("a listen") ||
                        transcript.includes("hey lesson"))
                ) {
                    this.cooldown = true;
                    this.onWake?.();
                    // Cooldown to prevent double triggers
                    setTimeout(() => {
                        this.cooldown = false;
                    }, 3000);
                }
            }
        };

        this.recognition.onend = () => {
            // Auto-restart for always-on detection
            if (this.listening) {
                setTimeout(() => {
                    try {
                        this.recognition?.start();
                    } catch {
                        // ignore
                    }
                }, 200);
            }
        };

        this.recognition.onerror = () => {
            // Silently restart on errors
            if (this.listening) {
                setTimeout(() => {
                    try {
                        this.recognition?.start();
                    } catch {
                        // ignore
                    }
                }, 1000);
            }
        };

        this.listening = true;
        try {
            this.recognition.start();
        } catch {
            // ignore
        }
    }

    stop() {
        this.listening = false;
        try {
            this.recognition?.stop();
        } catch {
            // ignore
        }
        this.recognition = null;
    }

    isListening() {
        return this.listening;
    }
}
