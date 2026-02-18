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
        body: JSON.stringify({ model, messages, max_tokens: 3000, temperature: 0.3 }),
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    return res.json();
}

interface FormattedPrompt {
    llmName: string;
    description: string;
    formattedPrompt: string;
}

interface PromptData {
    context: string;
    requirements?: string[];
    constraints?: string[];
    outputFormat?: string;
    intent?: string;
    fullPrompt?: string;
}

interface FormatRequest {
    prompt: PromptData;
    targetLLM?: string;
    apiKey?: string;
    model?: string;
}

// --- Rule-based formatters (fallback) ---
function formatForClaude(ctx: string, reqs: string[], cons: string[], out: string): FormattedPrompt {
    let p = `<task>\n${ctx}\n</task>\n`;
    if (reqs.length) p += `\n<requirements>\n${reqs.map(r => `- ${r}`).join("\n")}\n</requirements>\n`;
    if (cons.length) p += `\n<constraints>\n${cons.map(c => `- ${c}`).join("\n")}\n</constraints>\n`;
    p += `\n<output_format>\n${out}\n</output_format>\n\n<thinking>\nPlease think step by step before responding.\n</thinking>`;
    return { llmName: "Claude", description: "XML tags + structured thinking", formattedPrompt: p };
}

function formatForGemini(ctx: string, reqs: string[], cons: string[], out: string): FormattedPrompt {
    let p = `# Task\n${ctx}\n`;
    if (reqs.length) p += `\n## Requirements\n${reqs.map(r => `* ${r}`).join("\n")}\n`;
    if (cons.length) p += `\n## Constraints\n${cons.map(c => `* ${c}`).join("\n")}\n`;
    p += `\n## Expected Output\n${out}\n\n---\n*Please provide a thorough, well-organized response.*`;
    return { llmName: "Gemini", description: "Markdown with grounding", formattedPrompt: p };
}

function formatForChatGPT(ctx: string, reqs: string[], cons: string[], out: string, intent: string): FormattedPrompt {
    const system = `You are an expert ${intent.toLowerCase()} assistant. Follow the user's instructions precisely.`;
    let user = ctx;
    if (reqs.length) user += `\n\nRequirements:\n${reqs.map(r => `- ${r}`).join("\n")}`;
    if (cons.length) user += `\n\nConstraints:\n${cons.map(c => `- ${c}`).join("\n")}`;
    user += `\n\nExpected output: ${out}`;
    return { llmName: "ChatGPT", description: "System/User message split", formattedPrompt: `[System]\n${system}\n\n[User]\n${user}` };
}

function formatForDeepSeek(ctx: string, reqs: string[], cons: string[], out: string): FormattedPrompt {
    let p = `Let me think about this step by step.\n\n**Task:** ${ctx}\n`;
    if (reqs.length) p += `\n**Requirements:**\n${reqs.map(r => `- ${r}`).join("\n")}\n`;
    if (cons.length) p += `\n**Constraints:**\n${cons.map(c => `- ${c}`).join("\n")}\n`;
    p += `\n**Expected Output:** ${out}\n\nPlease reason through this carefully, showing your thought process before providing the final answer.`;
    return { llmName: "DeepSeek", description: "Chain-of-thought reasoning", formattedPrompt: p };
}

function formatForGrok(ctx: string, reqs: string[], cons: string[], out: string): FormattedPrompt {
    let p = `${ctx}`;
    if (reqs.length) p += ` Requirements: ${reqs.join(", ")}.`;
    if (cons.length) p += ` Avoid: ${cons.join(", ")}.`;
    p += ` Output: ${out}. Be direct and concise.`;
    return { llmName: "Grok", description: "Concise & direct", formattedPrompt: p };
}

export async function POST(request: NextRequest) {
    try {
        const body: FormatRequest = await request.json();
        const { prompt, targetLLM, apiKey, model } = body;

        if (!prompt || !prompt.context) {
            return NextResponse.json({ error: "Prompt data is required" }, { status: 400 });
        }

        const { context, requirements = [], constraints = [], outputFormat = "Clear response", intent = "General" } = prompt;

        // If API key, use AI to generate optimized formats
        if (apiKey && apiKey.trim()) {
            try {
                const systemPrompt = `You are an expert prompt engineer. Given a structured prompt, create 5 optimized versions for different LLMs.

Return ONLY raw JSON (no markdown, no code blocks) in this format:
[
  {"llmName": "Claude", "description": "XML tags + thinking", "formattedPrompt": "..."},
  {"llmName": "Gemini", "description": "Markdown + grounding", "formattedPrompt": "..."},
  {"llmName": "ChatGPT", "description": "System/User split", "formattedPrompt": "..."},
  {"llmName": "DeepSeek", "description": "Chain-of-thought", "formattedPrompt": "..."},
  {"llmName": "Grok", "description": "Concise & direct", "formattedPrompt": "..."}
]

Rules for each format:
- Claude: Use XML tags (<task>, <requirements>, <thinking>)
- Gemini: Use markdown headers and bullet points
- ChatGPT: Split into [System] and [User] messages
- DeepSeek: Include "think step by step" reasoning prompts
- Grok: Keep it concise and direct

Make each prompt detailed and optimized for that specific LLM.`;

                const userMsg = `Structured prompt to format:\n\nContext: ${context}\nRequirements: ${requirements.join(", ") || "None"}\nConstraints: ${constraints.join(", ") || "None"}\nOutput Format: ${outputFormat}\nIntent: ${intent}`;

                const aiResponse = await callOpenRouter(
                    apiKey,
                    model || "deepseek/deepseek-chat-v3-0324:free",
                    [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }]
                );

                const aiText = aiResponse.choices?.[0]?.message?.content || "";
                const jsonMatch = aiText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        if (targetLLM) {
                            const match = parsed.find((f: FormattedPrompt) => f.llmName.toLowerCase() === targetLLM.toLowerCase());
                            if (match) return NextResponse.json({ success: true, data: [match] });
                        }
                        return NextResponse.json({ success: true, data: parsed });
                    }
                }
            } catch (aiError) {
                console.error("OpenRouter format error, falling back:", aiError);
            }
        }

        // Fallback: Rule-based formatting
        const allFormats: FormattedPrompt[] = [
            formatForClaude(context, requirements, constraints, outputFormat),
            formatForGemini(context, requirements, constraints, outputFormat),
            formatForChatGPT(context, requirements, constraints, outputFormat, intent),
            formatForDeepSeek(context, requirements, constraints, outputFormat),
            formatForGrok(context, requirements, constraints, outputFormat),
        ];

        if (targetLLM) {
            const match = allFormats.find((f) => f.llmName.toLowerCase() === targetLLM.toLowerCase());
            if (match) return NextResponse.json({ success: true, data: [match] });
            return NextResponse.json({ error: `Unknown LLM: ${targetLLM}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: allFormats });
    } catch (error) {
        console.error("Format API error:", error);
        return NextResponse.json({ error: "Failed to format prompt" }, { status: 500 });
    }
}
