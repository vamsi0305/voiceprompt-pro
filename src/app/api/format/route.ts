// POST /api/format
// Backend API route for multi-LLM prompt formatting
// Serverless function — runs free on Vercel

import { NextRequest, NextResponse } from "next/server";

interface FormatRequest {
    prompt: {
        context: string;
        requirements: string[];
        constraints: string[];
        outputFormat: string;
        intent: string;
    };
    targetLLM?: string; // If empty/null, returns all LLM formats
}

interface FormattedPrompt {
    llmName: string;
    llmIcon: string;
    formattedPrompt: string;
    description: string;
    color: string;
}

function formatForClaude(context: string, requirements: string[], constraints: string[], outputFormat: string): FormattedPrompt {
    const lines: string[] = [];
    lines.push(`<task>`, context, `</task>`, ``);
    if (requirements.length > 0) {
        lines.push(`<requirements>`, ...requirements.map((r) => `- ${r}`), `</requirements>`, ``);
    }
    if (constraints.length > 0) {
        lines.push(`<constraints>`, ...constraints.map((c) => `- ${c}`), `</constraints>`, ``);
    }
    lines.push(`<output_format>`, outputFormat, `</output_format>`, ``);
    lines.push(`<instructions>`, `Please think through this step-by-step before providing your response.`, `Be thorough, follow best practices, and explain your reasoning.`, `If anything is ambiguous, state your assumptions clearly.`, `</instructions>`);

    return { llmName: "Claude", llmIcon: "🟠", formattedPrompt: lines.join("\n"), description: "Optimized with XML tags and structured thinking", color: "#d97706" };
}

function formatForGemini(context: string, requirements: string[], constraints: string[], outputFormat: string): FormattedPrompt {
    const lines: string[] = [];
    lines.push(`**Task:** ${context}`, ``);
    if (requirements.length > 0) {
        lines.push(`**Requirements:**`, ...requirements.map((r, i) => `${i + 1}. ${r}`), ``);
    }
    if (constraints.length > 0) {
        lines.push(`**Constraints:**`, ...constraints.map((c) => `- ${c}`), ``);
    }
    lines.push(`**Expected Output:** ${outputFormat}`, ``);
    lines.push(`**Important:** Provide a comprehensive, well-structured response. Use markdown formatting for clarity.`);

    return { llmName: "Gemini", llmIcon: "🔵", formattedPrompt: lines.join("\n"), description: "Structured with markdown and grounding hints", color: "#3b82f6" };
}

function formatForChatGPT(context: string, requirements: string[], constraints: string[], outputFormat: string, intent: string): FormattedPrompt {
    const lines: string[] = [];
    lines.push(`[System Message]`, `You are an expert assistant specializing in ${intent.toLowerCase()}. Provide detailed, accurate, and well-structured responses.`, ``);
    lines.push(`[User Message]`, context, ``);
    if (requirements.length > 0) {
        lines.push(`Requirements:`, ...requirements.map((r) => `• ${r}`), ``);
    }
    if (constraints.length > 0) {
        lines.push(`Constraints:`, ...constraints.map((c) => `• ${c}`), ``);
    }
    lines.push(`Please provide: ${outputFormat}`);

    return { llmName: "ChatGPT", llmIcon: "🟢", formattedPrompt: lines.join("\n"), description: "System/User message split for GPT models", color: "#10b981" };
}

function formatForDeepSeek(context: string, requirements: string[], constraints: string[], outputFormat: string): FormattedPrompt {
    const lines: string[] = [];
    lines.push(`## Problem Statement`, context, ``);
    if (requirements.length > 0) {
        lines.push(`## Specifications`, ...requirements.map((r) => `- ${r}`), ``);
    }
    if (constraints.length > 0) {
        lines.push(`## Constraints`, ...constraints.map((c) => `- ${c}`), ``);
    }
    lines.push(`## Instructions`, `1. Analyze the problem and break it down`, `2. Think through each sub-problem step by step`, `3. Provide a complete, working solution`, `4. Explain reasoning and trade-offs`, ``);
    lines.push(`## Expected Output`, outputFormat);

    return { llmName: "DeepSeek", llmIcon: "🔮", formattedPrompt: lines.join("\n"), description: "Chain-of-thought with step-by-step reasoning", color: "#8b5cf6" };
}

function formatForGrok(context: string, requirements: string[], constraints: string[], outputFormat: string): FormattedPrompt {
    const lines: string[] = [];
    lines.push(context, ``);
    if (requirements.length > 0) lines.push(`Key requirements: ${requirements.join("; ")}`, ``);
    if (constraints.length > 0) lines.push(`Constraints: ${constraints.join("; ")}`, ``);
    lines.push(`Be direct, thorough, and practical. ${outputFormat}.`);

    return { llmName: "Grok", llmIcon: "⚡", formattedPrompt: lines.join("\n"), description: "Concise, direct, and to-the-point", color: "#ef4444" };
}

export async function POST(request: NextRequest) {
    try {
        const body: FormatRequest = await request.json();
        const { prompt, targetLLM } = body;

        if (!prompt || !prompt.context) {
            return NextResponse.json({ error: "Prompt data is required" }, { status: 400 });
        }

        const { context, requirements = [], constraints = [], outputFormat = "Clear response", intent = "General" } = prompt;

        const allFormats: FormattedPrompt[] = [
            formatForClaude(context, requirements, constraints, outputFormat),
            formatForGemini(context, requirements, constraints, outputFormat),
            formatForChatGPT(context, requirements, constraints, outputFormat, intent),
            formatForDeepSeek(context, requirements, constraints, outputFormat),
            formatForGrok(context, requirements, constraints, outputFormat),
        ];

        if (targetLLM) {
            const match = allFormats.find((f) => f.llmName.toLowerCase() === targetLLM.toLowerCase());
            if (match) {
                return NextResponse.json({ success: true, data: [match] });
            }
            return NextResponse.json({ error: `Unknown LLM: ${targetLLM}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: allFormats });
    } catch (error) {
        console.error("Format API error:", error);
        return NextResponse.json({ error: "Failed to format prompt" }, { status: 500 });
    }
}
