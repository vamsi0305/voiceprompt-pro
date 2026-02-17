// GET /api/health
// Health check endpoint to verify the backend is running

import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        status: "healthy",
        app: "VoicePrompt Pro",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        endpoints: [
            { method: "POST", path: "/api/structure", description: "Structure raw text into an optimized prompt" },
            { method: "POST", path: "/api/format", description: "Format structured prompt for specific LLMs" },
            { method: "POST", path: "/api/converse", description: "Process conversation with clarifying questions" },
            { method: "GET", path: "/api/health", description: "Health check" },
        ],
    });
}
