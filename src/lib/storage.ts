// IndexedDB storage wrapper for prompt history
// 100% free, built into all browsers, no external database needed

export interface SavedPrompt {
    id: string;
    title: string;
    rawTranscript: string;
    structuredPrompt: string;
    intent: string;
    qualityScore: number;
    language: string;
    timestamp: number;
}

const DB_NAME = "voiceprompt-pro";
const DB_VERSION = 1;
const STORE_NAME = "prompts";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
                store.createIndex("timestamp", "timestamp", { unique: false });
                store.createIndex("intent", "intent", { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function savePrompt(prompt: SavedPrompt): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(prompt);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getAllPrompts(): Promise<SavedPrompt[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).index("timestamp").getAll();
        request.onsuccess = () => {
            const results = request.result as SavedPrompt[];
            resolve(results.reverse()); // Newest first
        };
        request.onerror = () => reject(request.error);
    });
}

export async function deletePrompt(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function searchPrompts(query: string): Promise<SavedPrompt[]> {
    const all = await getAllPrompts();
    const lower = query.toLowerCase();
    return all.filter(
        (p) =>
            p.title.toLowerCase().includes(lower) ||
            p.rawTranscript.toLowerCase().includes(lower) ||
            p.intent.toLowerCase().includes(lower)
    );
}
