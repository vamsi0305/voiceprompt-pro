from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
import json
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

app = FastAPI(title="VoicePrompt Pro Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter API helper
def call_openrouter(api_key: str, model: str, messages: List[Dict[str, str]], max_tokens: int = 2000, temperature: float = 0.4) -> Dict[str, Any]:
    res = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://voiceprompt-pro.vercel.app",
            "X-Title": "VoicePrompt Pro",
        },
        json={
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        },
    )
    if not res.ok:
        raise HTTPException(status_code=res.status_code, detail=f"OpenRouter error: {res.status}")
    return res.json()

# Pydantic models
class StructureRequest(BaseModel):
    transcript: str
    conversationHistory: Optional[str] = None
    language: Optional[str] = None
    apiKey: Optional[str] = None
    model: Optional[str] = None

class StructureResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

# Intent patterns
INTENT_PATTERNS = {
    "Code Generation": [
        re.compile(r'\b(code|program|function|class|api|script|build|create|develop|implement|debug|fix)\b', re.I),
        re.compile(r'\b(కోడ్|ప్రోగ్రామ్|ఫంక్షన్|స్క్రిప్ట్|బిల్డ్)\b', re.I),
    ],
    "Writing": [
        re.compile(r'\b(write|essay|article|blog|story|email|letter|content|draft)\b', re.I),
        re.compile(r'\b(రాయి|వ్యాసం|ఆర్టికల్|బ్లాగ్|కథ|ఇమెయిల్)\b', re.I),
    ],
    "Analysis": [
        re.compile(r'\b(analyze|review|compare|evaluate|assess|research|explain)\b', re.I),
        re.compile(r'\b(విశ్లేషించు|సమీక్ష|పోల్చు|వివరించు)\b', re.I),
    ],
    "Creative": [
        re.compile(r'\b(design|creative|imagine|brainstorm|idea|concept)\b', re.I),
        re.compile(r'\b(డిజైన్|సృజనాత్మక|ఊహించు|ఆలోచన)\b', re.I),
    ],
    "Data": [
        re.compile(r'\b(data|database|sql|query|csv|json|table|chart)\b', re.I),
        re.compile(r'\b(డేటా|డేటాబేస్|టేబుల్|చార్ట్)\b', re.I),
    ],
}

def detect_intent(text: str) -> str:
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if pattern.search(text):
                return intent
    return "General"

def extract_requirements(text: str) -> List[str]:
    reqs = []
    patterns = [
        re.compile(r'(?:i need|i want|should have|must have|requires?|include)\s+(.+?)(?:\s*\.|\s*,|\s*$)', re.I),
        re.compile(r'(?:నాకు కావాలి|ఉండాలి|కావాలి)\s+(.+?)(?:\s*\.|\s*,|\s*$)', re.I),
    ]
    for pattern in patterns:
        for match in pattern.finditer(text):
            reqs.append(match.group(1).strip())
    if not reqs and len(text) > 10:
        reqs.append(text[:100] if len(text) > 100 else text)
    return reqs

def extract_constraints(text: str) -> List[str]:
    constraints = []
    patterns = [
        re.compile(r'(?:don\'t|do not|avoid|without|no )\s+(.+?)(?:\s*\.|\s*,|\s*$)', re.I),
        re.compile(r'(?:only|must be|should be|limit|restrict)\s+(.+?)(?:\s*\.|\s*,|\s*$)', re.I),
        re.compile(r'(?:వద్దు|లేకుండా)\s+(.+?)(?:\s*\.|\s*,|\s*$)', re.I),
    ]
    for pattern in patterns:
        for match in pattern.finditer(text):
            constraints.append(match.group(1).strip())
    return constraints

def calculate_quality(text: str, reqs: List[str], constraints: List[str], intent: str) -> int:
    score = 20
    if len(text.split()) > 5:
        score += 15
    if len(text.split()) > 20:
        score += 15
    if reqs:
        score += 15
    if len(reqs) > 2:
        score += 10
    if constraints:
        score += 10
    if intent != "General":
        score += 15
    return min(100, score)

# Structure endpoint
@app.post("/api/structure", response_model=StructureResponse)
async def structure_prompt(request: StructureRequest):
    transcript = request.transcript
    api_key = request.apiKey or ""  # In real app, use env var
    model = request.model or "deepseek/deepseek-chat-v3-0324:free"
    language = request.language

    if not transcript or not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is required")

    # Try AI first
    if api_key:
        try:
            lang_hint = f"The user's input may be in a non-English language ({language}). Translate and understand it, then create the structured prompt in English." if language and not language.startswith("en") else ""

            system_prompt = f"""You are an expert prompt engineer. Given a user's raw request (which may be in any language including Telugu), create a perfectly structured prompt.

{lang_hint}

Return your response in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{{
  "title": "short title (max 8 words)",
  "intent": "one of: Code Generation, Writing, Analysis, Creative, Data, General",
  "context": "clear restatement of what the user wants in English",
  "requirements": ["requirement 1", "requirement 2"],
  "constraints": ["constraint 1"],
  "outputFormat": "expected output description",
  "fullPrompt": "the complete structured prompt text with sections",
  "qualityScore": 75
}}

Make the fullPrompt detailed with ## sections for Task, Requirements, Constraints, Expected Output, and Guidelines.
qualityScore should be 0-100 based on how clear and complete the request is."""

            ai_response = call_openrouter(api_key, model, [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ])

            ai_text = ai_response.get("choices", [{}])[0].get("message", {}).get("content", "")

            json_match = re.search(r'\{[\s\S]*\}', ai_text)
            if json_match:
                parsed = json.loads(json_match.group(0))
                return StructureResponse(
                    success=True,
                    data={
                        "title": parsed.get("title", "Untitled Prompt"),
                        "intent": parsed.get("intent", "General"),
                        "context": parsed.get("context", transcript),
                        "requirements": parsed.get("requirements", []),
                        "constraints": parsed.get("constraints", []),
                        "outputFormat": parsed.get("outputFormat", "Clear response"),
                        "fullPrompt": parsed.get("fullPrompt", transcript),
                        "qualityScore": parsed.get("qualityScore", 70),
                    }
                )
        except Exception as e:
            print(f"OpenRouter structure error: {e}")

    # Fallback
    intent = detect_intent(transcript)
    requirements = extract_requirements(transcript)
    constraints = extract_constraints(transcript)
    output_format = {
        "Code Generation": "Working code with comments",
        "Writing": "Well-structured text",
        "Analysis": "Detailed analysis with insights",
    }.get(intent, "Clear, helpful response")

    words = transcript.split()[:8]
    title = " ".join(words)
    if len(title) > 50:
        title = title[:47] + "..."
    context = transcript

    sections = [
        f"## Task\n{context}",
    ]
    if requirements:
        sections.append(f"## Requirements\n" + "\n".join(f"- {r}" for r in requirements))
    if constraints:
        sections.append(f"## Constraints\n" + "\n".join(f"- {c}" for c in constraints))
    sections.extend([
        f"## Expected Output\n{output_format}",
        "## Guidelines\n- Be thorough and detailed\n- Follow best practices\n- Explain important decisions"
    ])

    full_prompt = "\n\n".join(sections)
    quality_score = calculate_quality(transcript, requirements, constraints, intent)

    return StructureResponse(
        success=True,
        data={
            "title": title,
            "intent": intent,
            "context": context,
            "requirements": requirements,
            "constraints": constraints,
            "outputFormat": output_format,
            "fullPrompt": full_prompt,
            "qualityScore": quality_score,
        }
    )

class FormatRequest(BaseModel):
    prompt: Dict[str, Any]
    targetLLM: Optional[str] = None
    apiKey: Optional[str] = None
    model: Optional[str] = None

class FormattedPrompt(BaseModel):
    llmName: str
    description: str
    formattedPrompt: str

class FormatResponse(BaseModel):
    success: bool
    data: List[FormattedPrompt]

# Rule-based formatters
def format_for_claude(ctx: str, reqs: List[str], cons: List[str], out: str) -> FormattedPrompt:
    p = f"<task>\n{ctx}\n</task>\n"
    if reqs:
        p += f"\n<requirements>\n" + "\n".join(f"- {r}" for r in reqs) + "\n</requirements>\n"
    if cons:
        p += f"\n<constraints>\n" + "\n".join(f"- {c}" for c in cons) + "\n</constraints>\n"
    p += f"\n<output_format>\n{out}\n</output_format>\n\n<thinking>\nPlease think step by step before responding.\n</thinking>"
    return FormattedPrompt(llmName="Claude", description="XML tags + structured thinking", formattedPrompt=p)

def format_for_gemini(ctx: str, reqs: List[str], cons: List[str], out: str) -> FormattedPrompt:
    p = f"Context: {ctx}\n\n"
    if reqs:
        p += f"Requirements:\n" + "\n".join(f"- {r}" for r in reqs) + "\n\n"
    if cons:
        p += f"Constraints:\n" + "\n".join(f"- {c}" for c in cons) + "\n\n"
    p += f"Output Format: {out}\n\nPlease provide a comprehensive response."
    return FormattedPrompt(llmName="Gemini", description="Structured sections", formattedPrompt=p)

def format_for_gpt(ctx: str, reqs: List[str], cons: List[str], out: str) -> FormattedPrompt:
    p = f"Task: {ctx}\n\n"
    if reqs:
        p += f"Requirements:\n" + "\n".join(f"- {r}" for r in reqs) + "\n\n"
    if cons:
        p += f"Constraints:\n" + "\n".join(f"- {c}" for c in cons) + "\n\n"
    p += f"Expected Output: {out}\n\nPlease respond helpfully and accurately."
    return FormattedPrompt(llmName="GPT", description="Clear instructions", formattedPrompt=p)

def format_for_ollama(ctx: str, reqs: List[str], cons: List[str], out: str) -> FormattedPrompt:
    p = f"You are a helpful assistant. {ctx}\n\n"
    if reqs:
        p += f"Make sure to include:\n" + "\n".join(f"- {r}" for r in reqs) + "\n\n"
    if cons:
        p += f"Avoid:\n" + "\n".join(f"- {c}" for c in cons) + "\n\n"
    p += f"Format your response as: {out}"
    return FormattedPrompt(llmName="Ollama", description="Instruction-based", formattedPrompt=p)

# Format endpoint
@app.post("/api/format", response_model=FormatResponse)
async def format_prompt(request: FormatRequest):
    prompt_data = request.prompt
    target_llm = request.targetLLM
    api_key = request.apiKey or ""
    model = request.model or "deepseek/deepseek-chat-v3-0324:free"

    ctx = prompt_data.get("context", "")
    reqs = prompt_data.get("requirements", [])
    cons = prompt_data.get("constraints", [])
    out = prompt_data.get("outputFormat", "Clear response")

    formatted_prompts = []

    # If target LLM specified, format only for that
    if target_llm:
        if target_llm.lower() == "claude":
            formatted_prompts.append(format_for_claude(ctx, reqs, cons, out))
        elif target_llm.lower() == "gemini":
            formatted_prompts.append(format_for_gemini(ctx, reqs, cons, out))
        elif target_llm.lower() == "gpt":
            formatted_prompts.append(format_for_gpt(ctx, reqs, cons, out))
        elif target_llm.lower() == "ollama":
            formatted_prompts.append(format_for_ollama(ctx, reqs, cons, out))
        else:
            # Default to Claude
            formatted_prompts.append(format_for_claude(ctx, reqs, cons, out))
    else:
        # Format for all
        formatted_prompts = [
            format_for_claude(ctx, reqs, cons, out),
            format_for_gemini(ctx, reqs, cons, out),
            format_for_gpt(ctx, reqs, cons, out),
            format_for_ollama(ctx, reqs, cons, out),
        ]

    # If API key, try AI formatting
    if api_key:
        try:
            system_prompt = f"""You are an expert at formatting prompts for different LLMs. Given a structured prompt, format it optimally for {target_llm or 'various LLMs'}.

Return a JSON array of formatted prompts in this format:
[{{
  "llmName": "LLM Name",
  "description": "Brief description of the formatting style",
  "formattedPrompt": "The formatted prompt text"
}}]

Make the formattedPrompt optimized for the target LLM's style and capabilities."""

            ai_response = call_openrouter(api_key, model, [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(prompt_data)}
            ], max_tokens=3000, temperature=0.3)

            ai_text = ai_response.get("choices", [{}])[0].get("message", {}).get("content", "")
            json_match = re.search(r'\[[\s\S]*\]', ai_text)
            if json_match:
                ai_formatted = json.loads(json_match.group(0))
                formatted_prompts = [FormattedPrompt(**fp) for fp in ai_formatted]
        except Exception as e:
            print(f"OpenRouter format error: {e}")

class ConverseRequest(BaseModel):
    transcript: str
    conversationHistory: Optional[str] = None
    language: Optional[str] = None
    apiKey: Optional[str] = None
    model: Optional[str] = None

class ConverseResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

# Intent patterns for converse
CONVERSE_INTENT_PATTERNS = {
    "Code Generation": [
        re.compile(r'\b(code|program|function|class|api|script|build|create|develop|implement|write code|debug|fix bug)\b', re.I),
        re.compile(r'\b(కోడ్|ప్రోగ్రామ్|ఫంక్షన్|స్క్రిప్ట్|బిల్డ్|డెవలప్)\b', re.I),
    ],
    "Writing": [
        re.compile(r'\b(write|essay|article|blog|story|email|letter|content|copy|draft)\b', re.I),
        re.compile(r'\b(రాయి|వ్యాసం|ఆర్టికల్|బ్లాగ్|కథ|ఇమెయిల్|లేఖ)\b', re.I),
    ],
    "Analysis": [
        re.compile(r'\b(analyze|review|compare|evaluate|assess|research|study|explain)\b', re.I),
        re.compile(r'\b(విశ్లేషించు|సమీక్ష|పోల్చు|అంచనా|పరిశోధన|వివరించు)\b', re.I),
    ],
    "Creative": [
        re.compile(r'\b(design|creative|imagine|brainstorm|idea|concept|innovate)\b', re.I),
        re.compile(r'\b(డిజైన్|సృజనాత్మక|ఊహించు|ఆలోచన|కాన్సెప్ట్)\b', re.I),
    ],
    "Data": [
        re.compile(r'\b(data|database|sql|query|csv|json|spreadsheet|table|chart)\b', re.I),
        re.compile(r'\b(డేటా|డేటాబేస్|టేబుల్|చార్ట్|స్ప్రెడ్‌షీట్)\b', re.I),
    ],
}

def detect_converse_intent(text: str) -> str:
    for intent, patterns in CONVERSE_INTENT_PATTERNS.items():
        for pattern in patterns:
            if pattern.search(text):
                return intent
    return "General"

# Converse endpoint
@app.post("/api/converse", response_model=ConverseResponse)
async def converse(request: ConverseRequest):
    transcript = request.transcript
    conversation_history = request.conversationHistory or ""
    language = request.language
    api_key = request.apiKey or ""
    model = request.model or "deepseek/deepseek-chat-v3-0324:free"

    if not transcript or not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is required")

    intent = detect_converse_intent(transcript)

    # Try AI converse
    if api_key:
        try:
            lang_hint = f" The user may be speaking in {language}." if language else ""

            system_prompt = f"""You are a helpful AI assistant processing voice input for prompt engineering.{lang_hint}

The user said: "{transcript}"

Conversation history: {conversation_history}

Your task is to:
1. Understand the user's request
2. If the request is unclear or needs clarification, ask 1-2 specific questions
3. If clear, provide a brief confirmation

Return JSON in this format:
{{
  "needsClarification": true/false,
  "questions": ["question1", "question2"] (only if needsClarification is true),
  "confirmation": "brief confirmation message" (only if needsClarification is false),
  "intent": "{intent}"
}}"""

            ai_response = call_openrouter(api_key, model, [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ], max_tokens=1000, temperature=0.7)

            ai_text = ai_response.get("choices", [{}])[0].get("message", {}).get("content", "")
            json_match = re.search(r'\{[\s\S]*\}', ai_text)
            if json_match:
                parsed = json.loads(json_match.group(0))
                return ConverseResponse(success=True, data=parsed)
        except Exception as e:
            print(f"OpenRouter converse error: {e}")

    # Fallback
    needs_clarification = len(transcript.split()) < 5 or "?" in transcript
    if needs_clarification:
        questions = ["Can you provide more details about what you need?", "What specific outcome are you looking for?"]
        return ConverseResponse(success=True, data={
            "needsClarification": True,
            "questions": questions[:2],
            "intent": intent
        })
    else:
        return ConverseResponse(success=True, data={
            "needsClarification": False,
            "confirmation": f"I understand you want help with {intent.lower()}. Let's proceed.",
            "intent": intent
        })

# Health endpoint
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "app": "VoicePrompt Pro",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "endpoints": [
            {"method": "POST", "path": "/api/structure", "description": "Structure raw text into an optimized prompt"},
            {"method": "POST", "path": "/api/format", "description": "Format structured prompt for specific LLMs"},
            {"method": "POST", "path": "/api/converse", "description": "Process conversation with clarifying questions"},
            {"method": "GET", "path": "/api/health", "description": "Health check"},
        ],
    }