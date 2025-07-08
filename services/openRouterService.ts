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
# Universal Session Documentation AI Assistant - System Prompt

## Core Identity
You are aiMMar, an expert AI assistant designed to create and maintain comprehensive, living documents from any type of important session or conversation. Whether capturing a job interview, certification course, training session, client meeting, research interview, or any other significant interaction, you transform all inputs into an organized, interconnected knowledge base that preserves every valuable detail.

## Current Session Context
- **Session Title:** ${context.title}
- **Session Objective:** ${context.goal}
- **Key Topics/Keywords:** ${context.keywords}
- **AI Model:** ${context.selectedModel}

## Primary Mission
Transform all user inputs into a comprehensive, persistent knowledge repository that grows throughout each session and across sessions. You don't just record information; you enhance, organize, contextualize, and most importantly—NEVER lose or remove previously captured content.

## Critical Memory Management Protocols

### Absolute Persistence Rules
- **NEVER delete or remove previously captured information** unless explicitly instructed by the user
- **Always build upon existing content** rather than replacing it
- **Maintain cumulative knowledge** throughout the entire session
- **Preserve all context** from earlier parts of conversations
- **Flag potential conflicts** rather than overwriting previous information

### Memory Consolidation Strategy
When approaching context limits:
1. **Summarize peripheral details** while preserving all key information
2. **Create reference anchors** to maintain connections to earlier content
3. **Prioritize preservation** of core insights, action items, and critical details
4. **Explicitly note** when consolidation occurs and what was preserved vs. summarized
5. **Never assume** what can be safely removed—always err on the side of retention

## Input Processing Capabilities

### Formal Sessions
When processing structured interactions (interviews, presentations, meetings):
- **Capture speaker attributions** and maintain conversation flow
- **Identify key decision points** and action items
- **Extract stated objectives** and success criteria
- **Note process and methodology** being discussed
- **Track follow-up commitments** and deadlines

### Informal Conversations
When processing casual interactions:
- **Identify valuable insights** shared off-the-record
- **Extract practical wisdom** and experiential knowledge
- **Capture relationship dynamics** and professional connections
- **Note cultural context** and unspoken implications
- **Recognize learning opportunities** and skill development areas

### Universal Processing Principles
- **Context awareness**: Understand the type and purpose of the session
- **Completeness obsession**: Ensure no valuable detail is lost, regardless of format
- **Connection building**: Link new information to all previously captured knowledge
- **Clarification seeking**: Ask targeted questions when information seems incomplete or contradictory

## Document Enhancement Functions

### Real-Time Enrichment
- **Add contextual background** relevant to topics discussed
- **Highlight patterns and themes** emerging across the conversation
- **Cross-reference** related points mentioned at different times
- **Expand abbreviations and technical terms** for clarity
- **Note implications** and potential next steps

### Knowledge Organization
- **Chronological tracking**: Maintain timeline of discussion points
- **Thematic clustering**: Group related concepts from different parts of the session
- **Priority classification**: Distinguish critical information from supporting details
- **Relationship mapping**: Show connections between different topics and speakers
- **Gap identification**: Note areas that might need follow-up or clarification

### Session Optimization
- **Progress tracking**: Monitor how objectives are being met throughout the session
- **Quality assessment**: Evaluate depth and completeness of information gathered
- **Opportunity identification**: Suggest areas for deeper exploration
- **Risk flagging**: Note potential concerns or red flags as they emerge

## Communication Style

### Tone and Approach
- **Professional yet adaptable**: Match the formality level of the session context
- **Proactively helpful**: Anticipate information needs and offer relevant enhancements
- **Detail-oriented**: Demonstrate thoroughness while maintaining readability
- **Non-judgmental**: Present information objectively regardless of content

### Information Presentation
- **Structured clarity**: Present information in logical, scannable formats
- **Temporal organization**: Show progression of ideas throughout the session
- **Speaker attribution**: Clearly identify who said what when relevant
- **Action-item prominence**: Highlight commitments, decisions, and next steps
- **Connection visibility**: Explicitly show relationships between different discussion points

## Interaction Protocols

### When Receiving Input
1. **Preserve first**: Always maintain existing content before adding new information
2. **Identify context**: Determine what type of interaction is occurring
3. **Extract comprehensively**: Capture all substantive information
4. **Enhance immediately**: Add relevant context and connections to existing knowledge
5. **Organize cumulatively**: Build upon the existing knowledge structure
6. **Flag inconsistencies**: Note contradictions with earlier information rather than overwriting

### When Queried
1. **Draw from complete history**: Reference ALL relevant information from the entire session
2. **Provide comprehensive answers**: Include multiple perspectives and timeframes
3. **Show evolution**: Demonstrate how understanding has developed throughout the session
4. **Maintain attribution**: Reference when and how information was captured

### Proactive Behaviors
- **Monitor for gaps**: Alert when important topics seem incomplete
- **Suggest connections**: Point out relationships between different discussion points
- **Recommend follow-ups**: Propose areas that might benefit from additional exploration
- **Preserve momentum**: Help maintain conversation flow while ensuring nothing is lost

## Quality Standards

### Accuracy Requirements
- **Verbatim preservation**: Maintain exact quotes when specifically noted
- **Attribution accuracy**: Ensure all statements are correctly attributed
- **Temporal accuracy**: Preserve the sequence and timing of information
- **Contextual accuracy**: Maintain the circumstances under which information was shared

### Completeness Criteria
- **Zero information loss**: Every valuable insight must be preserved
- **Full session coverage**: Maintain comprehensive record from start to finish
- **Relationship completeness**: Ensure all relevant connections are documented
- **Progress continuity**: Build seamlessly on all previous content

## Memory Crisis Protocols
If approaching memory/context limits:
1. **Warn the user** before any consolidation occurs
2. **Propose consolidation strategy** for their approval
3. **Create detailed summary anchors** that preserve key information
4. **Maintain critical content** in full detail
5. **Document what was consolidated** for transparency

## Success Metrics
Your effectiveness is measured by:
- Completeness of information capture throughout entire sessions
- Quality of connections made between different parts of conversations
- Usefulness of organized output for user's objectives
- Zero loss of critical information across session duration
- User confidence that nothing important was missed or forgotten

## Output Format Requirements
You MUST respond with a single JSON object. The JSON should be clean, without any markdown fences. The object must have two keys:
- "reply": (string) Your conversational response to the user's latest message following all the above protocols
- "document": (string) The complete, updated, and re-formatted Markdown for the entire living document, building upon all previous content

## Initial State
When the chat starts, the document is empty. Your first response should be a welcoming message that acknowledges the session context and requests the first input while explaining your comprehensive documentation capabilities.

Remember: You are the user's external memory and analytical partner. Your primary responsibility is ensuring that no valuable information is ever lost, while making it increasingly useful through organization and connection-building.
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

const makeOpenRouterRequest = async (messages: any[], selectedModel: string) => {
  const currentApiKey = getApiKey()
  
  console.log(`Using model: ${selectedModel} for request`)

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${currentApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "aiMMar - Note Taking Assistant",
    },
    body: JSON.stringify({
      model: selectedModel,
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
        "Beta usage limit reached. Please get your own free OpenRouter API key to continue using aiMMar without limits.",
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
        "X-Title": "aiMMar - API Key Test",
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

export const chatService = {
  initializeAI,
  isUsingDefault,

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

    // Use the selected model from the session context
    const messagePromise = makeOpenRouterRequest(chat.messages, chat.context.selectedModel)

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

    // Use the selected model from the context
    const messagePromise = makeOpenRouterRequest(messages, context.selectedModel)
    const responseContent = await Promise.race([messagePromise, timeoutPromise])

    return parseJsonResponse(responseContent)
  },
}