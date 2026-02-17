// POST /api/structure
// Backend API route for prompt structuring
// Serverless function — runs free on Vercel

import { NextRequest, NextResponse } from "next/server";

interface StructureRequest {
    transcript: string;
    conversationHistory?: string;
    language?: string;
}

// Intent categories
const INTENT_PATTERNS: Record<string, string[]> = {
    "Code Generation": [
        "code", "program", "function", "api", "app", "application", "build", "create",
        "develop", "implement", "write code", "script", "website", "web", "database",
        "backend", "frontend", "full stack", "rest api", "endpoint", "component",
        "class", "module", "library", "crud", "authentication", "login", "deploy",
        "react", "next", "python", "javascript", "typescript", "node", "express",
        "html", "css", "sql", "mongodb", "docker",
    ],
    "Writing & Content": [
        "write", "essay", "article", "blog", "email", "letter", "report",
        "documentation", "story", "speech", "presentation", "proposal", "resume",
        "content", "social media", "summary", "translate",
    ],
    "Analysis & Research": [
        "analyze", "analysis", "research", "compare", "evaluate", "review",
        "investigate", "explain", "understand", "data", "statistics", "trend",
    ],
    "Problem Solving": [
        "fix", "debug", "error", "issue", "problem", "solve", "help",
        "troubleshoot", "broken", "not working", "crash", "bug", "optimize",
        "improve", "refactor",
    ],
    "Creative": [
        "design", "ui", "ux", "logo", "brand", "layout", "mockup", "animation",
        "game", "idea", "brainstorm", "creative",
    ],
    "Data & Automation": [
        "automate", "automation", "workflow", "pipeline", "scrape", "parse",
        "extract", "csv", "json", "excel", "dashboard", "chart", "bot",
    ],
};

function detectIntent(text: string): string {
    const lower = text.toLowerCase();
    let bestMatch = "General";
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                score += keyword.split(" ").length;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = intent;
        }
    }
    return bestMatch;
}

function extractRequirements(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
    const requirements: string[] = [];

    for (const sentence of sentences) {
        const lower = sentence.toLowerCase().trim();
        if (/\b(need|want|should|must|include|add|with|plus|also|feature)\b/.test(lower)) {
            requirements.push(sentence.trim());
        }
    }

    return requirements.length > 0
        ? requirements
        : sentences.map((s) => s.trim()).filter((s) => s.length > 5);
}

function extractConstraints(text: string): string[] {
    const constraints: string[] = [];
    const lower = text.toLowerCase();
    const sentences = text.split(/[.!?]+/);

    for (const s of sentences) {
        if (/\b(no |don'?t|without|avoid|never)\b/i.test(s) && s.trim().length > 5) {
            constraints.push(s.trim());
        }
    }

    if (lower.includes("free")) constraints.push("Must use only free/open-source tools");
    if (lower.includes("simple")) constraints.push("Keep the solution simple and straightforward");
    if (lower.includes("fast") || lower.includes("quick")) constraints.push("Optimize for speed and performance");
    if (lower.includes("secure")) constraints.push("Follow security best practices");

    return constraints;
}

function getOutputFormat(intent: string): string {
    const formats: Record<string, string> = {
        "Code Generation": "Complete, production-ready code with comments",
        "Writing & Content": "Well-structured written content",
        "Analysis & Research": "Detailed analysis with key findings and recommendations",
        "Problem Solving": "Step-by-step solution with explanation",
        "Creative": "Creative output with reasoning behind design choices",
        "Data & Automation": "Implementation with sample data and usage instructions",
    };
    return formats[intent] || "Clear, comprehensive response";
}

function calculateQuality(text: string, requirements: string[], constraints: string[], intent: string): number {
    let score = 40;
    if (text.length > 200) score += 10;
    if (text.length > 400) score += 10;
    if (text.length > 600) score += 5;
    if (requirements.length > 0) score += 10;
    if (requirements.length > 2) score += 5;
    if (requirements.length > 4) score += 5;
    if (constraints.length > 0) score += 5;
    if (intent !== "General") score += 10;
    return Math.min(score, 100);
}

export async function POST(request: NextRequest) {
    try {
        const body: StructureRequest = await request.json();
        const { transcript, conversationHistory } = body;

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json(
                { error: "Transcript is required" },
                { status: 400 }
            );
        }

        const intent = detectIntent(transcript);
        const requirements = extractRequirements(transcript);
        const constraints = extractConstraints(transcript);
        const outputFormat = getOutputFormat(intent);

        const words = transcript.split(/\s+/).slice(0, 8).join(" ");
        const title = words.length > 50 ? words.substring(0, 47) + "..." : words;

        const context = conversationHistory
            ? `Based on our conversation, the user wants: ${transcript}`
            : transcript;

        // Build structured prompt
        const sections: string[] = [];
        sections.push(`## Task\n${context}`);
        if (requirements.length > 0) {
            sections.push(`## Requirements\n${requirements.map((r) => `- ${r}`).join("\n")}`);
        }
        if (constraints.length > 0) {
            sections.push(`## Constraints\n${constraints.map((c) => `- ${c}`).join("\n")}`);
        }
        sections.push(`## Expected Output\n${outputFormat}`);
        sections.push(`## Guidelines\n- Be thorough and detailed\n- Follow best practices\n- Explain important decisions\n- State assumptions if unclear`);

        const fullPrompt = sections.join("\n\n");
        const qualityScore = calculateQuality(transcript, requirements, constraints, intent);

        return NextResponse.json({
            success: true,
            data: {
                title,
                intent,
                context,
                requirements,
                constraints,
                outputFormat,
                fullPrompt,
                qualityScore,
            },
        });
    } catch (error) {
        console.error("Structure API error:", error);
        return NextResponse.json(
            { error: "Failed to structure prompt" },
            { status: 500 }
        );
    }
}
