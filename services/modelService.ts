import type { ModelOption } from '../types'

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

export const modelService = {
  fetchFreeModels: async (): Promise<ModelOption[]> => {
    try {
      console.log('Fetching available models from OpenRouter...')
      
      const response = await fetch(OPENROUTER_MODELS_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'aiAmmar - Model Selection',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()
      
      // Filter for free models (where both prompt and completion pricing are "0")
      const freeModels = data.data?.filter((model: any) => {
        const pricing = model.pricing
        return pricing && 
               (pricing.prompt === "0" || pricing.prompt === 0) && 
               (pricing.completion === "0" || pricing.completion === 0)
      }) || []

      // Map to our ModelOption interface
      const mappedModels: ModelOption[] = freeModels.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description,
        pricing: {
          prompt: model.pricing.prompt.toString(),
          completion: model.pricing.completion.toString()
        }
      }))

      // Sort by name for better UX
      mappedModels.sort((a, b) => a.name.localeCompare(b.name))

      console.log(`Found ${mappedModels.length} free models`)
      return mappedModels

    } catch (error) {
      console.error('Error fetching models:', error)
      
      // Fallback to some known free models if API fails
      return [
        {
          id: 'deepseek/deepseek-r1-0528:free',
          name: 'DeepSeek R1 (Free)',
          description: 'Advanced reasoning model with strong analytical capabilities',
          pricing: { prompt: '0', completion: '0' }
        },
        {
          id: 'openrouter/cypher-alpha:free',
          name: 'Cypher Alpha (Free)', 
          description: 'High-performance model for complex tasks',
          pricing: { prompt: '0', completion: '0' }
        },
        {
          id: 'meta-llama/llama-3.2-3b-instruct:free',
          name: 'Llama 3.2 3B (Free)',
          description: 'Meta\'s efficient instruction-following model',
          pricing: { prompt: '0', completion: '0' }
        },
        {
          id: 'microsoft/phi-3-mini-128k-instruct:free',
          name: 'Phi-3 Mini (Free)',
          description: 'Microsoft\'s compact but capable model',
          pricing: { prompt: '0', completion: '0' }
        }
      ]
    }
  },

  getDefaultModel: (): string => {
    return 'deepseek/deepseek-r1-0528:free'
  }
}