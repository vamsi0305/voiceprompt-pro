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
        body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.4 }),
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    return res.json();
}

// --- Rule-based fallback logic ---
const INTENT_PATTERNS: Record<string, RegExp[]> = {
    "Code Generation": [/\b(code|program|function|class|api|script|build|create|develop|implement|debug|fix)\b/i, /\b(కోడ్|ప్రోగ్రామ్|ఫంక్షన్|స్క్రిప్ట్|బిల్డ్)\b/i],
    "Writing": [/\b(write|essay|article|blog|story|email|letter|content|draft)\b/i, /\b(రాయి|వ్యాసం|ఆర్టికల్|బ్లాగ్|కథ|ఇమెయిల్)\b/i],
    "Analysis": [/\b(analyze|review|compare|evaluate|assess|research|explain)\b/i, /\b(విశ్లేషించు|సమీక్ష|పోల్చు|వివరించు)\b/i],
    "Creative": [/\b(design|creative|imagine|brainstorm|idea|concept)\b/i, /\b(డిజైన్|సృజనాత్మక|ఊహించు|ఆలోచన)\b/i],
    "Data": [/\b(data|database|sql|query|csv|json|table|chart)\b/i, /\b(డేటా|డేటాబేస్|టేబుల్|చార్ట్)\b/i],
};

function detectIntent(text: string): string {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        for (const p of patterns) { if (p.test(text)) return intent; }
    }
    return "General";
}

function extractRequirements(text: string): string[] {
    const reqs: string[] = [];
    const patterns = [
        /(?:i need|i want|should have|must have|requires?|include)\s+(.+?)(?:\.|,|$)/gi,
        /(?:నాకు కావాలి|ఉండాలి|కావాలి)\s+(.+?)(?:\.|,|$)/gi,
    ];
    for (const p of patterns) {
        let m; while ((m = p.exec(text)) !== null) { reqs.push(m[1].trim()); }
    }
    if (reqs.length === 0 && text.length > 10) {
        reqs.push(text.length > 100 ? text.substring(0, 100) : text);
    }
    return reqs;
}

function extractConstraints(text: string): string[] {
    const constraints: string[] = [];
    const patterns = [
        /(?:don't|do not|avoid|without|no |shouldn't)\s+(.+?)(?:\.|,|$)/gi,
        /(?:only|must be|should be|limit|restrict)\s+(.+?)(?:\.|,|$)/gi,
        /(?:వద్దు|లేకుండా|మాత్రమే)\s+(.+?)(?:\.|,|$)/gi,
    ];
    for (const p of patterns) {
        let m; while ((m = p.exec(text)) !== null) { constraints.push(m[1].trim()); }
    }
    return constraints;
}

function calculateQuality(text: string, reqs: string[], constraints: string[], intent: string): number {
    let score = 20;
    if (text.split(/\s+/).length > 5) score += 15;
    if (text.split(/\s+/).length > 20) score += 15;
    if (reqs.length > 0) score += 15;
    if (reqs.length > 2) score += 10;
    if (constraints.length > 0) score += 10;
    if (intent !== "General") score += 15;
    return Math.min(100, score);
}

interface StructureRequest {
    transcript: string;
    conversationHistory?: string;
    language?: string;
    apiKey?: string;
    model?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: StructureRequest = await request.json();
        const { transcript, apiKey, model, language } = body;

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        // If API key provided, use OpenRouter AI to structure the prompt
        if (apiKey && apiKey.trim()) {
            try {
                const langHint = language && !language.startsWith("en")
                    ? `The user's input may be in a non-English language (${language}). Translate and understand it, then create the structured prompt in English.`
                    : "";

                const systemPrompt = `You are an expert prompt engineer. Given a user's raw request (which may be in any language including Telugu), create a perfectly structured prompt.

${langHint}

Return your response in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "title": "short title (max 8 words)",
  "intent": "one of: Code Generation, Writing, Analysis, Creative, Data, General",
  "context": "clear restatement of what the user wants in English",
  "requirements": ["requirement 1", "requirement 2"],
  "constraints": ["constraint 1"],
  "outputFormat": "expected output description",
  "fullPrompt": "the complete structured prompt text with sections",
  "qualityScore": 75
}

Make the fullPrompt detailed with ## sections for Task, Requirements, Constraints, Expected Output, and Guidelines.
qualityScore should be 0-100 based on how clear and complete the request is.`;

                const aiResponse = await callOpenRouter(
                    apiKey,
                    model || "deepseek/deepseek-chat-v3-0324:free",
                    [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: transcript },
                    ]
                );

                const aiText = aiResponse.choices?.[0]?.message?.content || "";

                // Parse JSON from AI response
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return NextResponse.json({
                        success: true,
                        data: {
                            title: parsed.title || "Untitled Prompt",
                            intent: parsed.intent || "General",
                            context: parsed.context || transcript,
                            requirements: parsed.requirements || [],
                            constraints: parsed.constraints || [],
                            outputFormat: parsed.outputFormat || "Clear response",
                            fullPrompt: parsed.fullPrompt || transcript,
                            qualityScore: parsed.qualityScore || 70,
                        },
                    });
                }
            } catch (aiError) {
                console.error("OpenRouter structure error, falling back:", aiError);
            }
        }

        // Fallback: Rule-based structuring
        const intent = detectIntent(transcript);
        const requirements = extractRequirements(transcript);
        const constraints = extractConstraints(transcript);
        const outputFormat = intent === "Code Generation" ? "Working code with comments" :
            intent === "Writing" ? "Well-structured text" :
                intent === "Analysis" ? "Detailed analysis with insights" : "Clear, helpful response";

        const words = transcript.split(/\s+/).slice(0, 8).join(" ");
        const title = words.length > 50 ? words.substring(0, 47) + "..." : words;
        const context = transcript;

        const sections: string[] = [];
        sections.push(`## Task\n${context}`);
        if (requirements.length > 0) sections.push(`## Requirements\n${requirements.map((r) => `- ${r}`).join("\n")}`);
        if (constraints.length > 0) sections.push(`## Constraints\n${constraints.map((c) => `- ${c}`).join("\n")}`);
        sections.push(`## Expected Output\n${outputFormat}`);
        sections.push(`## Guidelines\n- Be thorough and detailed\n- Follow best practices\n- Explain important decisions`);

        const fullPrompt = sections.join("\n\n");
        const qualityScore = calculateQuality(transcript, requirements, constraints, intent);

        return NextResponse.json({
            success: true,
            data: { title, intent, context, requirements, constraints, outputFormat, fullPrompt, qualityScore },
        });
    } catch (error) {
        console.error("Structure API error:", error);
        return NextResponse.json({ error: "Failed to structure prompt" }, { status: 500 });
    }
}
