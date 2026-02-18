"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import StatusIndicator from "./components/StatusIndicator";
import ConversationChat from "./components/ConversationChat";
import PromptOutput from "./components/PromptOutput";
import VoiceRecorder from "./components/VoiceRecorder";
import HistorySidebar from "./components/HistorySidebar";
import LanguageSelector from "./components/LanguageSelector";
import SettingsPanel, { useSettings } from "./components/SettingsPanel";
import Logo from "./components/Logo";
import { SpeechManager } from "@/lib/speech";
import { WakeWordDetector } from "@/lib/wake-word";
import { TTSManager } from "@/lib/tts";
import { ConversationManager, ChatMessage } from "@/lib/conversation";
import { structurePrompt } from "@/lib/structurer";
import { formatForAllLLMs, FormattedPrompt } from "@/lib/formatters";
import { SavedPrompt, savePrompt, getAllPrompts, deletePrompt, searchPrompts } from "@/lib/storage";

type AppStatus = "idle" | "wake-listening" | "listening" | "processing" | "speaking";

export default function Home() {
  // Core state
  const [status, setStatus] = useState<AppStatus>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [formattedPrompts, setFormattedPrompts] = useState<FormattedPrompt[]>([]);
  const [qualityScore, setQualityScore] = useState(0);
  const [currentLang, setCurrentLang] = useState("te-IN");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme state
  const [isDark, setIsDark] = useState(true);

  // Settings state
  const [settings, setSettings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for managers (persist across renders)
  const speechRef = useRef<SpeechManager | null>(null);
  const wakeWordRef = useRef<WakeWordDetector | null>(null);
  const ttsRef = useRef<TTSManager | null>(null);
  const conversationRef = useRef<ConversationManager | null>(null);
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      localStorage.setItem("voiceprompt-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  // Initialize managers & theme
  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem("voiceprompt-theme");
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.setAttribute("data-theme", "light");
    }

    speechRef.current = new SpeechManager();
    wakeWordRef.current = new WakeWordDetector();
    ttsRef.current = new TTSManager();
    conversationRef.current = new ConversationManager();

    // Load saved prompts
    getAllPrompts().then(setSavedPrompts).catch(console.error);

    // Auto-start wake word listener
    startWakeWordListening();

    return () => {
      speechRef.current?.stop();
      wakeWordRef.current?.stop();
      ttsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search prompts
  useEffect(() => {
    if (searchQuery) {
      searchPrompts(searchQuery).then(setSavedPrompts).catch(console.error);
    } else {
      getAllPrompts().then(setSavedPrompts).catch(console.error);
    }
  }, [searchQuery]);

  // Show toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Start wake word listening
  const startWakeWordListening = useCallback(() => {
    setStatus("wake-listening");
    wakeWordRef.current?.start(() => {
      // Wake word detected!
      wakeWordRef.current?.stop();
      handleWakeUp();
    });
  }, []);

  // Handle wake-up event
  const handleWakeUp = useCallback(() => {
    // Play a chime-like sound using Web Audio API
    playChime();

    setStatus("listening");
    const conversation = conversationRef.current!;
    const welcomeMsg = conversation.getWelcomeMessage();
    const assistantMsg = conversation.addAssistantMessage(welcomeMsg);
    setMessages((prev) => [...prev, assistantMsg]);

    // Speak the welcome message
    setStatus("speaking");
    ttsRef.current?.speak(welcomeMsg, () => {
      // After speaking, start listening
      startListening();
    });
  }, []);

  // Play a chime sound using Web Audio API
  const playChime = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Silently fail if audio context is not available
    }
  }, []);

  // Start active listening
  const startListening = useCallback(() => {
    if (!speechRef.current) return;
    setStatus("listening");
    finalTranscriptRef.current = "";
    setInterimTranscript("");

    speechRef.current.setLanguage(currentLang);
    speechRef.current.setCallbacks(
      (result) => {
        if (result.isFinal) {
          const text = result.transcript.trim();

          // Check for stop words: "over", "done", "stop" (English) or "చాలు", "ఆపు" (Telugu)
          const stopWords = ["over", "done", "stop", "that's it", "that is it", "చాలు", "ఆపు", "అయిపోయింది", "బస్"];
          const lastWord = text.toLowerCase().trim();
          const hasStopWord = stopWords.some(sw => lastWord.endsWith(sw) || lastWord === sw);

          if (hasStopWord) {
            // Remove the stop word from transcript
            let cleanText = text;
            for (const sw of stopWords) {
              const regex = new RegExp(`\\s*${sw}\\s*$`, "i");
              cleanText = cleanText.replace(regex, "");
            }
            if (cleanText.trim()) {
              finalTranscriptRef.current += cleanText + " ";
            }
            // Immediately process
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            handleUserFinishedSpeaking();
            return;
          }

          finalTranscriptRef.current += result.transcript + " ";
          setInterimTranscript("");

          // Reset silence timer
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            // After 3 seconds of silence, process the input
            if (finalTranscriptRef.current.trim()) {
              handleUserFinishedSpeaking();
            }
          }, 3000);
        } else {
          setInterimTranscript(result.transcript);
        }
      },
      (speechStatus) => {
        if (speechStatus === "error") {
          showToast("Speech recognition error. Please try again.");
        }
      }
    );

    speechRef.current.start();
  }, [currentLang, showToast]);

  // Handle when user finishes speaking — calls backend API routes
  const handleUserFinishedSpeaking = useCallback(async () => {
    speechRef.current?.stop();
    setInterimTranscript("");

    const transcript = finalTranscriptRef.current.trim();
    if (!transcript) {
      startWakeWordListening();
      return;
    }

    setStatus("processing");

    const conversation = conversationRef.current!;

    try {
      // Step 1: Call backend /api/converse to determine if intent is complete
      const converseRes = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          conversationHistory: conversation.getMessages().map((m) => ({
            role: m.role,
            content: m.content,
          })),
          apiKey: settings.openRouterApiKey,
          model: settings.aiModel,
          language: currentLang,
        }),
      });
      const converseData = await converseRes.json();

      // Add user message to conversation
      conversation.addUserMessage(transcript);
      const { response, shouldStructure } = converseData.data ||
        conversation.processUserInput(transcript, structurePrompt(transcript).intent);

      conversation.addAssistantMessage(response);
      setMessages([...conversation.getMessages()]);

      if (shouldStructure) {
        // Step 2: Call backend /api/structure to structure the prompt
        const combined = conversation.getCombinedTranscript();
        const structRes = await fetch("/api/structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: combined,
            language: currentLang,
            apiKey: settings.openRouterApiKey,
            model: settings.aiModel,
          }),
        });
        const structData = await structRes.json();
        const structured = structData.data || structurePrompt(combined);

        // Step 3: Call backend /api/format to get LLM-specific formats
        const formatRes = await fetch("/api/format", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: structured,
            apiKey: settings.openRouterApiKey,
            model: settings.aiModel,
          }),
        });
        const formatData = await formatRes.json();
        const formatted = formatData.data || formatForAllLLMs(structured);

        setFormattedPrompts(formatted);
        setQualityScore(structured.qualityScore);

        // Save to history
        const saved: SavedPrompt = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          title: structured.title,
          rawTranscript: combined,
          structuredPrompt: structured.fullPrompt,
          intent: structured.intent,
          qualityScore: structured.qualityScore,
          language: currentLang,
          timestamp: Date.now(),
        };
        savePrompt(saved).then(() => {
          getAllPrompts().then(setSavedPrompts).catch(console.error);
        });

        // Speak confirmation
        setStatus("speaking");
        ttsRef.current?.speak(response, () => {
          setStatus("idle");
          setTimeout(() => startWakeWordListening(), 1000);
        });
      } else {
        // Need more info — speak the clarifying question
        setStatus("speaking");
        ttsRef.current?.speak(response, () => {
          startListening();
        });
      }
    } catch {
      // Fallback to client-side if backend fails
      console.warn("Backend API failed, falling back to client-side processing");
      const structured = structurePrompt(transcript);
      const { response, shouldStructure } = conversation.processUserInput(transcript, structured.intent);
      setMessages([...conversation.getMessages()]);

      if (shouldStructure) {
        const combined = conversation.getCombinedTranscript();
        const finalStructured = structurePrompt(combined);
        const formatted = formatForAllLLMs(finalStructured);
        setFormattedPrompts(formatted);
        setQualityScore(finalStructured.qualityScore);

        const saved: SavedPrompt = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          title: finalStructured.title,
          rawTranscript: combined,
          structuredPrompt: finalStructured.fullPrompt,
          intent: finalStructured.intent,
          qualityScore: finalStructured.qualityScore,
          language: currentLang,
          timestamp: Date.now(),
        };
        savePrompt(saved).then(() => {
          getAllPrompts().then(setSavedPrompts).catch(console.error);
        });

        setStatus("speaking");
        ttsRef.current?.speak(response, () => {
          setStatus("idle");
          setTimeout(() => startWakeWordListening(), 1000);
        });
      } else {
        setStatus("speaking");
        ttsRef.current?.speak(response, () => {
          startListening();
        });
      }
    }
  }, [currentLang, startWakeWordListening, startListening, showToast]);

  // Toggle manual voice recording
  const handleToggleVoice = useCallback(() => {
    if (status === "listening") {
      // Stop listening and process — capture any interim transcript too
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // If there's interim text that hasn't been finalized, add it
      if (interimTranscript && interimTranscript.trim()) {
        finalTranscriptRef.current += interimTranscript.trim() + " ";
        setInterimTranscript("");
      }

      // If we have ANY text, process it
      if (finalTranscriptRef.current.trim()) {
        handleUserFinishedSpeaking();
      } else {
        // Nothing was said
        speechRef.current?.stop();
        showToast("No speech detected. Try again.");
        setStatus("idle");
        setTimeout(() => startWakeWordListening(), 500);
      }
    } else if (status === "idle" || status === "wake-listening") {
      // Stop wake word listener and start manual listening
      wakeWordRef.current?.stop();
      handleWakeUp();
    }
  }, [status, interimTranscript, handleUserFinishedSpeaking, handleWakeUp, showToast, startWakeWordListening]);

  // Copy to clipboard
  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard! 📋");
      }).catch(() => {
        showToast("Failed to copy");
      });
    },
    [showToast]
  );

  // History actions
  const handleSelectPrompt = useCallback((prompt: SavedPrompt) => {
    const structured = structurePrompt(prompt.rawTranscript);
    const formatted = formatForAllLLMs(structured);
    setFormattedPrompts(formatted);
    setQualityScore(structured.qualityScore);
    setHistoryOpen(false);
    showToast("Loaded prompt from history");
  }, [showToast]);

  const handleDeletePrompt = useCallback(
    (id: string) => {
      deletePrompt(id).then(() => {
        getAllPrompts().then(setSavedPrompts).catch(console.error);
        showToast("Prompt deleted");
      });
    },
    [showToast]
  );

  // New conversation
  const handleNewConversation = useCallback(() => {
    conversationRef.current?.reset();
    setMessages([]);
    setFormattedPrompts([]);
    setQualityScore(0);
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    speechRef.current?.stop();
    ttsRef.current?.stop();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    startWakeWordListening();
  }, [startWakeWordListening]);

  return (
    <div className="relative min-h-screen flex flex-col z-10">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] backdrop-blur-md bg-[var(--bg-primary)]/80 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              VoicePrompt <span className="text-[var(--accent-purple)]">Pro</span>
            </h1>
            <p className="text-[10px] text-[var(--text-muted)]">
              Voice → Structured LLM Prompts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector
            currentLang={currentLang}
            onLanguageChange={(lang) => {
              setCurrentLang(lang);
              speechRef.current?.setLanguage(lang);
            }}
          />
          <button
            onClick={handleNewConversation}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
            title="New conversation"
          >
            ✨ New
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
            title="View history"
          >
            📜 History
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
            title="Settings"
          >
            ⚙️
          </button>
          {/* Theme Toggle — Dark/Light */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-all hover:scale-110"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left panel — Conversation */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusIndicator status={status} />
            <div className="flex items-center gap-2">
              {status === "wake-listening" && (
                <span className="text-[10px] text-[var(--text-muted)] animate-pulse">
                  🔊 Always-on
                </span>
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="glass-card flex-1 flex flex-col">
            <div className="flex-1">
              <ConversationChat
                messages={messages}
                isTyping={status === "processing"}
                interimTranscript={interimTranscript}
              />
            </div>

            {/* Voice controls */}
            <div className="border-t border-[var(--border-color)] p-4 flex items-center justify-center">
              <VoiceRecorder
                isListening={status === "listening"}
                isProcessing={status === "processing"}
                onToggle={handleToggleVoice}
              />
            </div>
          </div>
        </div>

        {/* Right panel — Prompt output */}
        <div className="lg:w-[480px] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              📋 Structured Prompts
            </h2>
            {formattedPrompts.length > 0 && (
              <button
                onClick={() => handleCopy(formattedPrompts[0].formattedPrompt)}
                className="text-[10px] text-[var(--accent-green)] hover:underline"
              >
                Copy active
              </button>
            )}
          </div>

          <PromptOutput
            formattedPrompts={formattedPrompts}
            qualityScore={qualityScore}
            onCopy={handleCopy}
          />

          {/* Keyboard shortcut hint */}
          <div className="text-center">
            <p className="text-[10px] text-[var(--text-muted)]">
              💡 Tip: Say <span className="text-[var(--accent-green)]">&quot;Hey Listen&quot;</span> anytime to start • Tap 🎤 for manual mode
            </p>
          </div>
        </div>
      </main>

      {/* History sidebar */}
      <HistorySidebar
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        prompts={savedPrompts}
        onSelect={handleSelectPrompt}
        onDelete={handleDeletePrompt}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast-enter">
          <div className="glass-card-sm px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-xl">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
