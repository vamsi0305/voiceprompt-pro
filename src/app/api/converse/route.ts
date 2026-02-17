// POST /api/converse
// Backend API route for conversational AI processing
// Handles multi-turn conversation, intent detection, and clarifying questions
// Serverless function — runs free on Vercel

import { NextRequest, NextResponse } from "next/server";

interface ConverseRequest {
    transcript: string;
    conversationHistory: { role: "user" | "assistant"; content: string }[];
}

const CLARIFYING_TEMPLATES: Record<string, string[]> = {
    "Code Generation": [
        "Got it! What programming language or framework would you like me to use?",
        "Should I include error handling, tests, and edge cases?",
        "Any specific architecture pattern you'd like (MVC, microservices, etc.)?",
    ],
    "Writing & Content": [
        "Sure! What tone should the writing be — formal, casual, or conversational?",
        "Who is the target audience for this content?",
        "How long should the content be?",
    ],
    "Analysis & Research": [
        "Interesting! What specific aspects should I focus on?",
        "Should I compare multiple options or focus on one?",
        "What level of detail do you need — overview or deep dive?",
    ],
    "Problem Solving": [
        "I see! Can you describe what's happening vs what you expected?",
        "What have you already tried so far?",
        "Are there any error messages or logs?",
    ],
    "General": [
        "Could you tell me a bit more about what you're looking for?",
        "What's the main goal you want to achieve?",
        "Are there any specific requirements or constraints I should know about?",
    ],
};

const INTENT_PATTERNS: Record<string, string[]> = {
    "Code Generation": ["code", "program", "api", "app", "build", "create", "develop", "website", "database", "function", "react", "python", "javascript"],
    "Writing & Content": ["write", "essay", "article", "blog", "email", "report", "documentation", "content", "translate"],
    "Analysis & Research": ["analyze", "research", "compare", "evaluate", "explain", "data", "statistics"],
    "Problem Solving": ["fix", "debug", "error", "problem", "solve", "help", "troubleshoot", "broken", "bug"],
    "Creative": ["design", "ui", "ux", "logo", "brand", "game", "idea", "brainstorm"],
};

function detectIntent(text: string): string {
    const lower = text.toLowerCase();
    let best = "General";
    let bestScore = 0;
    for (const [intent, kws] of Object.entries(INTENT_PATTERNS)) {
        let score = 0;
        for (const kw of kws) { if (lower.includes(kw)) score++; }
        if (score > bestScore) { bestScore = score; best = intent; }
    }
    return best;
}

export async function POST(request: NextRequest) {
    try {
        const body: ConverseRequest = await request.json();
        const { transcript, conversationHistory = [] } = body;

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        const intent = detectIntent(transcript);
        const userMessages = conversationHistory.filter((m) => m.role === "user");
        const totalWords = [...userMessages.map((m) => m.content), transcript]
            .join(" ")
            .split(/\s+/).length;

        // Determine if we have enough info
        const isComplete = totalWords > 15 || conversationHistory.length >= 4;

        if (isComplete) {
            return NextResponse.json({
                success: true,
                data: {
                    response: "Perfect! I have enough information. Let me structure that into an optimized prompt for you.",
                    shouldStructure: true,
                    intent,
                    isComplete: true,
                },
            });
        }

        // Need more info — return a clarifying question
        const questions = CLARIFYING_TEMPLATES[intent] || CLARIFYING_TEMPLATES["General"];
        const askedQuestions = conversationHistory
            .filter((m) => m.role === "assistant")
            .map((m) => m.content);
        const unasked = questions.filter((q) => !askedQuestions.includes(q));
        const question = unasked.length > 0 ? unasked[0] : "Got it! Let me structure that into a prompt for you.";

        return NextResponse.json({
            success: true,
            data: {
                response: question,
                shouldStructure: unasked.length === 0,
                intent,
                isComplete: false,
            },
        });
    } catch (error) {
        console.error("Converse API error:", error);
        return NextResponse.json({ error: "Failed to process conversation" }, { status: 500 });
    }
}
