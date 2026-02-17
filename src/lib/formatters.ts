// LLM-specific prompt formatters
// Pure JavaScript — no API calls needed

import { StructuredPrompt } from "./structurer";

export interface FormattedPrompt {
    llmName: string;
    llmIcon: string;
    formattedPrompt: string;
    description: string;
    color: string;
}

// Claude — XML tags, system prompts, thinking blocks
function formatForClaude(prompt: StructuredPrompt): FormattedPrompt {
    const lines: string[] = [];

    lines.push(`<task>`);
    lines.push(prompt.context);
    lines.push(`</task>`);
    lines.push(``);

    if (prompt.requirements.length > 0) {
        lines.push(`<requirements>`);
        prompt.requirements.forEach((r) => lines.push(`- ${r}`));
        lines.push(`</requirements>`);
        lines.push(``);
    }

    if (prompt.constraints.length > 0) {
        lines.push(`<constraints>`);
        prompt.constraints.forEach((c) => lines.push(`- ${c}`));
        lines.push(`</constraints>`);
        lines.push(``);
    }

    lines.push(`<output_format>`);
    lines.push(prompt.outputFormat);
    lines.push(`</output_format>`);
    lines.push(``);

    lines.push(`<instructions>`);
    lines.push(`Please think through this step-by-step before providing your response.`);
    lines.push(`Be thorough, follow best practices, and explain your reasoning.`);
    lines.push(`If anything is ambiguous, state your assumptions clearly.`);
    lines.push(`</instructions>`);

    return {
        llmName: "Claude",
        llmIcon: "🟠",
        formattedPrompt: lines.join("\n"),
        description: "Optimized with XML tags and structured thinking",
        color: "#d97706",
    };
}

// Gemini — clear structure with grounding hints
function formatForGemini(prompt: StructuredPrompt): FormattedPrompt {
    const lines: string[] = [];

    lines.push(`**Task:** ${prompt.context}`);
    lines.push(``);

    if (prompt.requirements.length > 0) {
        lines.push(`**Requirements:**`);
        prompt.requirements.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
        lines.push(``);
    }

    if (prompt.constraints.length > 0) {
        lines.push(`**Constraints:**`);
        prompt.constraints.forEach((c) => lines.push(`- ${c}`));
        lines.push(``);
    }

    lines.push(`**Expected Output:** ${prompt.outputFormat}`);
    lines.push(``);
    lines.push(`**Important:** Provide a comprehensive, well-structured response. Use markdown formatting for clarity. Include code examples if relevant.`);

    return {
        llmName: "Gemini",
        llmIcon: "🔵",
        formattedPrompt: lines.join("\n"),
        description: "Structured with markdown and grounding hints",
        color: "#3b82f6",
    };
}

// ChatGPT — System/User message split
function formatForChatGPT(prompt: StructuredPrompt): FormattedPrompt {
    const lines: string[] = [];

    lines.push(`[System Message]`);
    lines.push(`You are an expert assistant specializing in ${prompt.intent.toLowerCase()}. Provide detailed, accurate, and well-structured responses. Follow best practices and industry standards.`);
    lines.push(``);
    lines.push(`[User Message]`);
    lines.push(prompt.context);
    lines.push(``);

    if (prompt.requirements.length > 0) {
        lines.push(`Requirements:`);
        prompt.requirements.forEach((r) => lines.push(`• ${r}`));
        lines.push(``);
    }

    if (prompt.constraints.length > 0) {
        lines.push(`Constraints:`);
        prompt.constraints.forEach((c) => lines.push(`• ${c}`));
        lines.push(``);
    }

    lines.push(`Please provide: ${prompt.outputFormat}`);

    return {
        llmName: "ChatGPT",
        llmIcon: "🟢",
        formattedPrompt: lines.join("\n"),
        description: "System/User message split for GPT models",
        color: "#10b981",
    };
}

// DeepSeek — Chain-of-thought, code-focused
function formatForDeepSeek(prompt: StructuredPrompt): FormattedPrompt {
    const lines: string[] = [];

    lines.push(`## Problem Statement`);
    lines.push(prompt.context);
    lines.push(``);

    if (prompt.requirements.length > 0) {
        lines.push(`## Specifications`);
        prompt.requirements.forEach((r) => lines.push(`- ${r}`));
        lines.push(``);
    }

    if (prompt.constraints.length > 0) {
        lines.push(`## Constraints`);
        prompt.constraints.forEach((c) => lines.push(`- ${c}`));
        lines.push(``);
    }

    lines.push(`## Instructions`);
    lines.push(`1. First, analyze the problem and break it down into sub-problems`);
    lines.push(`2. Think through each sub-problem step by step`);
    lines.push(`3. Provide a complete, working solution`);
    lines.push(`4. Explain your reasoning and any trade-offs made`);
    lines.push(``);
    lines.push(`## Expected Output`);
    lines.push(prompt.outputFormat);

    return {
        llmName: "DeepSeek",
        llmIcon: "🔮",
        formattedPrompt: lines.join("\n"),
        description: "Chain-of-thought with step-by-step reasoning",
        color: "#8b5cf6",
    };
}

// Grok — Concise, direct style
function formatForGrok(prompt: StructuredPrompt): FormattedPrompt {
    const lines: string[] = [];

    lines.push(prompt.context);
    lines.push(``);

    if (prompt.requirements.length > 0) {
        lines.push(`Key requirements: ${prompt.requirements.join("; ")}`);
        lines.push(``);
    }

    if (prompt.constraints.length > 0) {
        lines.push(`Constraints: ${prompt.constraints.join("; ")}`);
        lines.push(``);
    }

    lines.push(`Be direct, thorough, and practical. ${prompt.outputFormat}.`);

    return {
        llmName: "Grok",
        llmIcon: "⚡",
        formattedPrompt: lines.join("\n"),
        description: "Concise, direct, and to-the-point",
        color: "#ef4444",
    };
}

// Export all formatters
export function formatForAllLLMs(prompt: StructuredPrompt): FormattedPrompt[] {
    return [
        formatForClaude(prompt),
        formatForGemini(prompt),
        formatForChatGPT(prompt),
        formatForDeepSeek(prompt),
        formatForGrok(prompt),
    ];
}

export { formatForClaude, formatForGemini, formatForChatGPT, formatForDeepSeek, formatForGrok };
