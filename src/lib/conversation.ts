// Conversation state manager
// Handles multi-turn conversation, intent completeness detection, and clarifying questions

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    isVoice?: boolean;
}

export interface ConversationState {
    messages: ChatMessage[];
    rawTranscripts: string[];
    combinedIntent: string;
    isComplete: boolean;
    clarifyingQuestion: string | null;
}

// Questions the system might ask to clarify intent
const CLARIFYING_TEMPLATES: Record<string, string[]> = {
    "Code Generation": [
        "What programming language or framework would you like me to use?",
        "Should I include error handling and edge cases?",
        "Do you need tests included with the code?",
        "Any specific architecture pattern you'd like (MVC, microservices, etc.)?",
    ],
    "Writing & Content": [
        "What tone should the writing be — formal, casual, or conversational?",
        "Who is the target audience?",
        "How long should the content be?",
        "Should I include any specific sections or structure?",
    ],
    "Analysis & Research": [
        "What specific aspects should I focus on?",
        "Do you need data sources or citations?",
        "Should I compare multiple options or focus on one?",
        "What level of detail do you need — overview or deep dive?",
    ],
    "Problem Solving": [
        "Can you describe what's happening vs what you expected?",
        "What have you already tried?",
        "Are there any error messages?",
        "What environment or platform are you using?",
    ],
    "General": [
        "Could you tell me a bit more about what you're looking for?",
        "What's the main goal you want to achieve?",
        "Are there any specific requirements or constraints?",
    ],
};

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function isIntentComplete(messages: ChatMessage[]): boolean {
    const userMessages = messages.filter((m) => m.role === "user");
    const totalWords = userMessages.reduce(
        (acc, m) => acc + m.content.split(/\s+/).length,
        0
    );

    // If user has provided enough detail (>15 words across messages), consider it complete
    if (totalWords > 15) return true;

    // If there have been at least 2 exchanges, consider it complete
    if (messages.length >= 4) return true;

    return false;
}

function pickClarifyingQuestion(
    intent: string,
    existingMessages: ChatMessage[]
): string {
    const questions =
        CLARIFYING_TEMPLATES[intent] || CLARIFYING_TEMPLATES["General"];
    const askedQuestions = existingMessages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content);

    // Find a question that hasn't been asked yet
    const unasked = questions.filter((q) => !askedQuestions.includes(q));
    if (unasked.length > 0) {
        return unasked[0];
    }

    // Default fallback
    return "Got it! Let me structure that into a prompt for you.";
}

export class ConversationManager {
    private state: ConversationState;

    constructor() {
        this.state = {
            messages: [],
            rawTranscripts: [],
            combinedIntent: "",
            isComplete: false,
            clarifyingQuestion: null,
        };
    }

    addUserMessage(content: string, isVoice = true): ChatMessage {
        const message: ChatMessage = {
            id: generateId(),
            role: "user",
            content,
            timestamp: Date.now(),
            isVoice,
        };

        this.state.messages.push(message);
        this.state.rawTranscripts.push(content);

        return message;
    }

    addAssistantMessage(content: string): ChatMessage {
        const message: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content,
            timestamp: Date.now(),
        };

        this.state.messages.push(message);
        return message;
    }

    processUserInput(
        transcript: string,
        detectedIntent: string
    ): { response: string; shouldStructure: boolean } {
        this.addUserMessage(transcript);
        this.state.combinedIntent = detectedIntent;

        const complete = isIntentComplete(this.state.messages);
        this.state.isComplete = complete;

        if (complete) {
            const response =
                "Perfect! I have enough information. Let me structure that into an optimized prompt for you.";
            this.addAssistantMessage(response);
            return { response, shouldStructure: true };
        }

        // Need more info — ask a clarifying question
        const question = pickClarifyingQuestion(
            detectedIntent,
            this.state.messages
        );
        this.addAssistantMessage(question);
        this.state.clarifyingQuestion = question;

        return { response: question, shouldStructure: false };
    }

    getCombinedTranscript(): string {
        return this.state.rawTranscripts.join(". ");
    }

    getMessages(): ChatMessage[] {
        return [...this.state.messages];
    }

    getState(): ConversationState {
        return { ...this.state };
    }

    reset() {
        this.state = {
            messages: [],
            rawTranscripts: [],
            combinedIntent: "",
            isComplete: false,
            clarifyingQuestion: null,
        };
    }

    getWelcomeMessage(): string {
        return "I'm listening! Tell me what prompt you'd like me to create, in any language.";
    }
}
