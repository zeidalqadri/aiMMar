import { GoogleGenAI, type Chat } from "@google/genai"
import type { ImageFile, NoteContext, ChatEntry } from "../types.ts"

const validateApiKey = (apiKey: string): boolean => {
  // Basic validation - Gemini API keys typically start with "AIza" and are 39 characters long
  return apiKey.startsWith("AIza") && apiKey.length === 39
}

// Initialize AI service - will be set when API key is provided
let ai: GoogleGenAI | null = null

const initializeAI = (apiKey: string) => {
  if (!validateApiKey(apiKey)) {
    throw new Error("Invalid API key format. Gemini API keys should start with 'AIza' and be 39 characters long.")
  }
  ai = new GoogleGenAI({ apiKey })
}

const getAI = () => {
  if (!ai) {
    throw new Error("AI service not initialized. Please provide an API key.")
  }
  return ai
}

const createSystemPrompt = (context: NoteContext) => `
You are an AI assistant tasked with creating a "living document". Your purpose is to help a user build a comprehensive, easy-to-revise reference for a class, project, or session.

**User's Goal:**
- **Project/Session Title:** ${context.title}
- **Objective:** ${context.goal}
- **Keywords/Topics:** ${context.keywords}

**Your Core Directives:**
1. **Capture & Clarify:** The user will provide rough notes, bullet points, questions, or images. Engage conversationally to clarify their points.
2. **Consolidate:** After each interaction, you MUST update and regenerate the *entire* living document. Do not just append information. Intelligently integrate the new note into the correct section of the document, re-organizing and re-formatting as needed to maintain a cohesive structure.
3. **Identify Gaps:** If you notice missing information, conflicting points, or areas that need more detail based on the user's goal, explicitly mark them in the living document using a special <GAP> tag. For example: "<GAP>Need to clarify the budget for Q4.</GAP>".
4. **Handle Priority Questions:** If a user's note includes a '#' symbol, treat it as a priority question. Provide a direct answer in your conversational reply and ensure the polished information is integrated into the living document.

**JSON Output Format:**
You MUST respond with a single JSON object. The JSON should be clean, without any markdown fences. The object must have two keys:
- "reply": (string) Your conversational response to the user's latest message.
- "document": (string) The complete, updated, and re-formatted Markdown for the entire living document.

**Initial State:**
When the chat starts, the document is empty. Your first response should be a welcoming message and a request for the first note.
`

const parseJsonResponse = (jsonString: string): { reply: string; document: string } => {
  try {
    let cleanJsonString = jsonString.trim()

    // Remove markdown code fences if present
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s
    const match = cleanJsonString.match(fenceRegex)
    if (match && match[2]) {
      cleanJsonString = match[2].trim()
    }

    console.log("Attempting to parse JSON:", cleanJsonString.substring(0, 200) + "...")

    const parsed = JSON.parse(cleanJsonString)

    if (typeof parsed.reply === "string" && typeof parsed.document === "string") {
      return parsed
    }

    throw new Error("Invalid JSON structure - missing reply or document fields")
  } catch (e) {
    console.error("Failed to parse JSON response:", e)
    console.error("Raw response:", jsonString)

    // Fallback for when the model fails to return valid JSON
    return {
      reply: "I had trouble formatting my response properly. Let me try again with your next message.",
      document: `# ${new Date().toLocaleString()}\n\n**Note:** There was an issue processing the AI response. Please try sending your message again.\n\n---\n\n**Raw Response:**\n${jsonString.substring(0, 500)}${jsonString.length > 500 ? "..." : ""}`,
    }
  }
}

export const testApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const testAI = new GoogleGenAI({ apiKey })
    const testChat = testAI.chats.create({
      model: "gemini-1.5-flash",
      config: {
        responseMimeType: "application/json",
      },
    })

    // Send a simple test message with timeout
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("API test timeout")), 10000))

    const testPromise = testChat.sendMessage({
      message: {
        parts: [{ text: 'Respond with exactly this JSON: {"test": "success"}' }],
      },
    })

    await Promise.race([testPromise, timeoutPromise])
    return true
  } catch (error) {
    console.error("API key test failed:", error)
    return false
  }
}

export const chatService = {
  initializeAI,
  startChat: (context: NoteContext): Chat => {
    return getAI().chats.create({
      model: "gemini-1.5-flash",
      config: {
        systemInstruction: createSystemPrompt(context),
        responseMimeType: "application/json",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      },
    })
  },

  sendMessage: async (
    chat: Chat,
    text: string,
    image: ImageFile | null,
  ): Promise<{ reply: string; document: string }> => {
    const parts = []
    if (image) {
      parts.push({
        inlineData: { mimeType: image.type, data: image.base64 },
      })
    }
    parts.push({ text })

    console.log("Sending message to AI:", text.substring(0, 100) + "...")

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI response timeout after 30 seconds")), 30000),
    )

    const messagePromise = chat.sendMessage({ message: { parts } })

    const response = await Promise.race([messagePromise, timeoutPromise])
    console.log("Received AI response:", response.text.substring(0, 200) + "...")

    return parseJsonResponse(response.text)
  },

  regenerateDocumentFromHistory: async (
    history: ChatEntry[],
    context: NoteContext,
  ): Promise<{ reply: string; document: string }> => {
    const chat = getAI().chats.create({
      model: "gemini-1.5-flash",
      config: {
        systemInstruction: createSystemPrompt(context),
        responseMimeType: "application/json",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      },
      history: history.map((entry) => ({
        role: entry.role,
        parts: [{ text: entry.text }], // Note: This simplified history doesn't re-send images
      })),
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI response timeout after 30 seconds")), 30000),
    )

    const messagePromise = chat.sendMessage({
      message: "Please regenerate the living document based on the history provided.",
    })

    const response = await Promise.race([messagePromise, timeoutPromise])
    return parseJsonResponse(response.text)
  },
}
