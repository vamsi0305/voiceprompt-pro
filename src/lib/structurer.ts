// Rule-based prompt structuring engine
// 100% free — no LLM API calls needed
// Uses intelligent parsing, intent detection, and prompt engineering templates

export interface StructuredPrompt {
    title: string;
    intent: string;
    context: string;
    requirements: string[];
    constraints: string[];
    outputFormat: string;
    fullPrompt: string;
    qualityScore: number;
}

// Intent categories
const INTENT_PATTERNS: Record<string, string[]> = {
    "Code Generation": [
        "code", "program", "function", "api", "app", "application", "build", "create",
        "develop", "implement", "write code", "script", "website", "web", "database",
        "backend", "frontend", "full stack", "fullstack", "rest api", "endpoint",
        "component", "class", "module", "library", "package", "crud", "authentication",
        "login", "signup", "deploy", "server", "client", "mobile", "react", "next",
        "python", "javascript", "typescript", "java", "node", "express", "django",
        "flask", "html", "css", "sql", "mongodb", "firebase", "docker", "kubernetes",
    ],
    "Writing & Content": [
        "write", "essay", "article", "blog", "post", "email", "letter", "report",
        "documentation", "readme", "story", "poem", "speech", "presentation",
        "proposal", "resume", "cover letter", "content", "copy", "social media",
        "tweet", "caption", "headline", "description", "summary", "translate",
    ],
    "Analysis & Research": [
        "analyze", "analysis", "research", "compare", "evaluate", "review", "assess",
        "investigate", "study", "examine", "explain", "understand", "learn", "teach",
        "data", "statistics", "trend", "insight", "report", "survey",
    ],
    "Problem Solving": [
        "fix", "debug", "error", "issue", "problem", "solve", "help", "why",
        "how to", "troubleshoot", "broken", "not working", "crash", "bug",
        "optimize", "improve", "refactor", "performance",
    ],
    "Creative": [
        "design", "ui", "ux", "logo", "brand", "color", "layout", "mockup",
        "wireframe", "prototype", "animation", "illustration", "image", "video",
        "music", "game", "idea", "brainstorm", "creative", "innovate",
    ],
    "Data & Automation": [
        "automate", "automation", "workflow", "pipeline", "etl", "scrape", "crawl",
        "parse", "extract", "transform", "csv", "json", "xml", "excel", "spreadsheet",
        "dashboard", "chart", "graph", "visualization", "bot", "cron",
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
                score += keyword.split(" ").length; // Multi-word matches score higher
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
    const requirements: string[] = [];
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5);

    for (const sentence of sentences) {
        const lower = sentence.toLowerCase().trim();
        if (
            lower.includes("need") ||
            lower.includes("want") ||
            lower.includes("should") ||
            lower.includes("must") ||
            lower.includes("include") ||
            lower.includes("add") ||
            lower.includes("with") ||
            lower.includes("plus") ||
            lower.includes("also") ||
            lower.includes("and") ||
            lower.includes("feature")
        ) {
            requirements.push(sentence.trim());
        }
    }

    // If no specific requirements found, treat each sentence as a requirement
    if (requirements.length === 0) {
        return sentences.map((s) => s.trim()).filter((s) => s.length > 5);
    }

    return requirements;
}

function extractConstraints(text: string): string[] {
    const constraints: string[] = [];
    const lower = text.toLowerCase();

    if (lower.includes("no ") || lower.includes("don't") || lower.includes("without")) {
        const sentences = text.split(/[.!?]+/);
        for (const s of sentences) {
            if (/\b(no |don'?t|without|avoid|never)\b/i.test(s)) {
                constraints.push(s.trim());
            }
        }
    }

    // Technology-specific constraints
    if (lower.includes("free")) constraints.push("Must use only free/open-source tools");
    if (lower.includes("simple")) constraints.push("Keep the solution simple and straightforward");
    if (lower.includes("fast") || lower.includes("quick")) constraints.push("Optimize for speed and performance");
    if (lower.includes("secure") || lower.includes("security")) constraints.push("Follow security best practices");

    return constraints;
}

function determineOutputFormat(intent: string, text: string): string {
    const lower = text.toLowerCase();

    if (intent === "Code Generation") {
        if (lower.includes("explain")) return "Code with detailed comments and explanation";
        return "Complete, production-ready code with comments";
    }
    if (intent === "Writing & Content") return "Well-structured written content";
    if (intent === "Analysis & Research") return "Detailed analysis with key findings and recommendations";
    if (intent === "Problem Solving") return "Step-by-step solution with explanation";
    if (intent === "Creative") return "Creative output with reasoning behind design choices";
    if (intent === "Data & Automation") return "Implementation with sample data and usage instructions";

    return "Clear, comprehensive response";
}

function calculateQualityScore(prompt: StructuredPrompt): number {
    let score = 40; // Base score

    // Length bonus (detailed prompts are better)
    if (prompt.fullPrompt.length > 200) score += 10;
    if (prompt.fullPrompt.length > 400) score += 10;
    if (prompt.fullPrompt.length > 600) score += 5;

    // Requirements clarity
    if (prompt.requirements.length > 0) score += 10;
    if (prompt.requirements.length > 2) score += 5;
    if (prompt.requirements.length > 4) score += 5;

    // Has constraints (shows thoughtfulness)
    if (prompt.constraints.length > 0) score += 5;

    // Intent detected (not generic)
    if (prompt.intent !== "General") score += 10;

    return Math.min(score, 100);
}

export function structurePrompt(rawText: string, conversationHistory?: string): StructuredPrompt {
    const intent = detectIntent(rawText);
    const requirements = extractRequirements(rawText);
    const constraints = extractConstraints(rawText);
    const outputFormat = determineOutputFormat(intent, rawText);

    // Generate descriptive title
    const words = rawText.split(/\s+/).slice(0, 8).join(" ");
    const title = words.length > 50 ? words.substring(0, 47) + "..." : words;

    // Build context from conversation history
    const context = conversationHistory
        ? `Based on our conversation, the user wants: ${rawText}`
        : rawText;

    // Build the full structured prompt
    const sections: string[] = [];

    sections.push(`## Task\n${context}`);

    if (requirements.length > 0) {
        sections.push(
            `## Requirements\n${requirements.map((r) => `- ${r}`).join("\n")}`
        );
    }

    if (constraints.length > 0) {
        sections.push(
            `## Constraints\n${constraints.map((c) => `- ${c}`).join("\n")}`
        );
    }

    sections.push(`## Expected Output\n${outputFormat}`);

    sections.push(
        `## Guidelines\n- Be thorough and detailed in your response\n- Follow best practices and conventions\n- Provide explanations for important decisions\n- If anything is unclear, state your assumptions`
    );

    const fullPrompt = sections.join("\n\n");

    const result: StructuredPrompt = {
        title,
        intent,
        context,
        requirements,
        constraints,
        outputFormat,
        fullPrompt,
        qualityScore: 0,
    };

    result.qualityScore = calculateQualityScore(result);

    return result;
}
