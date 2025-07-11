import type { ModelOption } from '../types'

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

export const modelService = {
  /**
   * Retrieve the full list of models from OpenRouter so the UI can decide how
   * to cluster them (free vs paid, provider grouping, etc.).
   */
  fetchModels: async (): Promise<ModelOption[]> => {
    try {
      console.log('Fetching available models from OpenRouter...')
      
      const response = await fetch(OPENROUTER_MODELS_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'aiMMar - Model Selection',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()
      
      // Map every model coming back from the API to our internal structure – we
      // will decide later in the UI whether it is "free" or "paid".
      const mappedModels: ModelOption[] = (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description,
        pricing: {
          prompt: model.pricing.prompt.toString(),
          completion: model.pricing.completion.toString()
        }
      }))

      // Sort consistently by model id to keep group labels stable
      mappedModels.sort((a, b) => a.id.localeCompare(b.id))

      console.log(`Received ${mappedModels.length} models from OpenRouter`)
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