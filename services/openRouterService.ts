import type { ImageFile, NoteContext, ChatEntry } from "../types.ts"

// Default API key for beta testing - this should be a limited key with usage caps
const DEFAULT_API_KEY = "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" // Replace with your actual default key

// Initialize AI service - will be set when API key is provided
let apiKey: string | null = null
let isUsingDefaultKey = false

const initializeAI = (key?: string) => {
  if (key) {
    apiKey = key
    isUsingDefaultKey = false
  } else {
    apiKey = DEFAULT_API_KEY
    isUsingDefaultKey = true
  }
}

const getApiKey = () => {
  if (!apiKey) {
    // Fallback to default key if none provided
    initializeAI()
  }
  return apiKey!
}

const isUsingDefault = () => isUsingDefaultKey

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

const detectAdvancedTask = (text: string): boolean => {
  const advancedKeywords = [
    "analyze",
    "compare",
    "explain why",
    "how does",
    "what if",
    "reasoning",
    "logic",
    "calculate",
    "solve",
    "prove",
    "evaluate",
    "critique",
    "synthesize",
    "deduce",
    "infer",
    "conclude",
    "justify",
    "argue",
    "debate",
    "philosophical",
    "ethical",
    "complex",
    "intricate",
    "sophisticated",
    "nuanced",
    "multifaceted",
  ]

  const priorityMarker = text.includes("#")
  const hasAdvancedKeywords = advancedKeywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
  const isLongComplex = text.length > 200 && (text.includes("?") || text.includes("because"))

  return priorityMarker || hasAdvancedKeywords || isLongComplex
}

const selectModel = (text: string): string => {
  return detectAdvancedTask(text) ? "openrouter/cypher-alpha:free" : "deepseek/deepseek-r1-0528:free"
}

const makeOpenRouterRequest = async (messages: any[], text?: string) => {
  const currentApiKey = getApiKey()
  const model = text ? selectModel(text) : "deepseek/deepseek-r1-0528:free"

  console.log(`Using model: ${model} for request`)

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${currentApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "iAmmr - Note Taking Assistant",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))

    // If using default key and hit rate limit, suggest user gets their own key
    if (isUsingDefault() && (response.status === 429 || response.status === 402)) {
      throw new Error(
        "Beta usage limit reached. Please get your own free OpenRouter API key to continue using iAmmr without limits.",
      )
    }

    throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

export const testApiKey = async (key: string): Promise<boolean> => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "iAmmr - API Key Test",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "user",
            content: 'Respond with exactly this JSON: {"test": "success"}',
          },
        ],
        max_tokens: 50,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      console.error("API key test failed:", response.status, response.statusText)
      return false
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    try {
      const parsed = JSON.parse(content)
      return parsed.test === "success"
    } catch {
      return false
    }
  } catch (error) {
    console.error("API key test failed:", error)
    return false
  }
}

interface ChatSession {
  messages: any[]
  context: NoteContext
}

const getCurrentModel = (text: string): { name: string; isAdvanced: boolean } => {
  const isAdvanced = detectAdvancedTask(text)
  return {
    name: isAdvanced ? "Cypher Alpha" : "DeepSeek R1",
    isAdvanced,
  }
}

export const chatService = {
  initializeAI,
  isUsingDefault,
  getCurrentModel,

  startChat: (context: NoteContext): ChatSession => {
    return {
      messages: [
        {
          role: "system",
          content: createSystemPrompt(context),
        },
      ],
      context,
    }
  },

  sendMessage: async (
    chat: ChatSession,
    text: string,
    image: ImageFile | null,
  ): Promise<{ reply: string; document: string }> => {
    console.log("Sending message to OpenRouter:", text.substring(0, 100) + "...")

    // Prepare message content
    const content = []
    if (image) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${image.type};base64,${image.base64}`,
        },
      })
    }
    content.push({
      type: "text",
      text,
    })

    const userMessage = {
      role: "user",
      content: content.length === 1 ? text : content,
    }

    // Add user message to chat history
    chat.messages.push(userMessage)

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI response timeout after 30 seconds")), 30000),
    )

    const messagePromise = makeOpenRouterRequest(chat.messages, text)

    const responseContent = await Promise.race([messagePromise, timeoutPromise])
    console.log("Received OpenRouter response:", responseContent.substring(0, 200) + "...")

    // Add assistant response to chat history
    chat.messages.push({
      role: "assistant",
      content: responseContent,
    })

    return parseJsonResponse(responseContent)
  },

  regenerateDocumentFromHistory: async (
    history: ChatEntry[],
    context: NoteContext,
  ): Promise<{ reply: string; document: string }> => {
    const messages = [
      {
        role: "system",
        content: createSystemPrompt(context),
      },
    ]

    // Add user messages from history
    history.forEach((entry) => {
      if (entry.role === "user") {
        messages.push({
          role: "user",
          content: entry.text,
        })
      }
    })

    // Add regeneration request
    messages.push({
      role: "user",
      content: "Please regenerate the living document based on all the notes provided above.",
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI response timeout after 30 seconds")), 30000),
    )

    const messagePromise = makeOpenRouterRequest(messages)
    const responseContent = await Promise.race([messagePromise, timeoutPromise])

    return parseJsonResponse(responseContent)
  },
}
