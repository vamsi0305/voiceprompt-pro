import { NextRequest, NextResponse } from "next/server";

// OpenRouter API helper
async function callOpenRouter(apiKey: string, model: string, messages: { role: string; content: string }[]) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://voiceprompt-pro.vercel.app",
            "X-Title": "VoicePrompt Pro",
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: 1000,
            temperature: 0.7,
        }),
    });
    if (!res.ok) {
        const error = await res.text();
        throw new Error(`OpenRouter error: ${res.status} ${error}`);
    }
    return res.json();
}

// Intent detection patterns (multilingual)
const INTENT_PATTERNS: Record<string, RegExp[]> = {
    "Code Generation": [
        /\b(code|program|function|class|api|script|build|create|develop|implement|write code|debug|fix bug)\b/i,
        /\b(కోడ్|ప్రోగ్రామ్|ఫంక్షన్|స్క్రిప్ట్|బిల్డ్|డెవలప్)\b/i,
    ],
    "Writing": [
        /\b(write|essay|article|blog|story|email|letter|content|copy|draft)\b/i,
        /\b(రాయి|వ్యాసం|ఆర్టికల్|బ్లాగ్|కథ|ఇమెయిల్|లేఖ)\b/i,
    ],
    "Analysis": [
        /\b(analyze|review|compare|evaluate|assess|research|study|explain)\b/i,
        /\b(విశ్లేషించు|సమీక్ష|పోల్చు|అంచనా|పరిశోధన|వివరించు)\b/i,
    ],
    "Creative": [
        /\b(design|creative|imagine|brainstorm|idea|concept|innovate)\b/i,
        /\b(డిజైన్|సృజనాత్మక|ఊహించు|ఆలోచన|కాన్సెప్ట్)\b/i,
    ],
    "Data": [
        /\b(data|database|sql|query|csv|json|spreadsheet|table|chart)\b/i,
        /\b(డేటా|డేటాబేస్|టేబుల్|చార్ట్|స్ప్రెడ్‌షీట్)\b/i,
    ],
};

function detectIntent(text: string): string {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(text)) return intent;
        }
    }
    return "General";
}

// Clarifying question templates (works as fallback when no API key)
const CLARIFYING_TEMPLATES: Record<string, string[]> = {
    "Code Generation": [
        "What programming language should I use?",
        "Can you describe the specific functionality you need?",
        "Are there any frameworks or libraries you prefer?",
    ],
    "Writing": [
        "What's the target audience for this piece?",
        "How long should it be?",
        "What tone are you going for — formal, casual, persuasive?",
    ],
    "Analysis": [
        "What specific aspects should I focus on?",
        "What's the context or background for this analysis?",
        "What format do you want the analysis in?",
    ],
    "Creative": [
        "What style or aesthetic are you going for?",
        "Are there any constraints or requirements to keep in mind?",
        "What's the purpose — is it for a project, personal use, or something else?",
    ],
    "Data": [
        "What type of data are we working with?",
        "What's the expected output format?",
        "Are there any specific tools or platforms involved?",
    ],
    "General": [
        "Can you tell me more about what you're looking for?",
        "What specific outcome do you need?",
        "Are there any constraints I should know about?",
    ],
};

interface ConverseRequest {
    transcript: string;
    conversationHistory?: { role: string; content: string }[];
    apiKey?: string;
    model?: string;
    language?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: ConverseRequest = await request.json();
        const { transcript, conversationHistory = [], apiKey, model, language } = body;

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        // If API key provided, use OpenRouter AI
        if (apiKey && apiKey.trim()) {
            try {
                const langHint = language && language.startsWith("te") ? "The user is speaking in Telugu. Respond in English." : "";

                const systemPrompt = `You are a helpful AI assistant that helps users create structured prompts for LLMs.
Your job is to understand what the user wants and either:
1. Ask a SHORT clarifying question (1 sentence) if you need more details
2. Say "READY_TO_STRUCTURE" followed by a brief summary if you have enough information

${langHint}
Keep responses under 2 sentences. Be conversational and friendly.
If the user gave a clear, detailed request, immediately say READY_TO_STRUCTURE.
If the request is vague or short, ask ONE specific clarifying question.`;

                const messages = [
                    { role: "system", content: systemPrompt },
                    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
                    { role: "user", content: transcript },
                ];

                const aiResponse = await callOpenRouter(apiKey, model || "deepseek/deepseek-chat-v3-0324:free", messages);
                const aiText = aiResponse.choices?.[0]?.message?.content || "";

                const shouldStructure = aiText.includes("READY_TO_STRUCTURE") || conversationHistory.length >= 4;
                const cleanResponse = aiText.replace("READY_TO_STRUCTURE", "").trim() ||
                    "Great! I have enough information. Let me structure that into a prompt for you.";

                return NextResponse.json({
                    success: true,
                    data: {
                        response: cleanResponse,
                        shouldStructure,
                        intent: detectIntent(transcript),
                        isComplete: shouldStructure,
                    },
                });
            } catch (aiError) {
                console.error("OpenRouter error, falling back:", aiError);
                // Fall through to rule-based
            }
        }

        // Fallback: Rule-based conversation (no API key)
        const intent = detectIntent(transcript);
        const userMessages = conversationHistory.filter((m) => m.role === "user");
        const totalWords = [...userMessages.map((m) => m.content), transcript]
            .join(" ")
            .split(/\s+/).length;

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
