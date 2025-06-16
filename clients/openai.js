import OpenAI from 'openai';

export class OpenAIClient {
  constructor(apiKey, modelConfig) {
    this.client = new OpenAI({
      apiKey: apiKey,
    });
    this.modelConfig = modelConfig;
  }

  async query(prompt) {
    try {
      // Use max_completion_tokens for reasoning models (o1, o3, etc.), max_tokens for others
      const isReasoningModel = this.modelConfig.id.match(/^o\d+/);
      const tokenParam = isReasoningModel ? 'max_completion_tokens' : 'max_tokens';
      
      const requestParams = {
        model: this.modelConfig.id,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        [tokenParam]: 1000,
      };
      
      const response = await this.client.chat.completions.create(requestParams);
      
      return {
        model: this.modelConfig.name,
        response: response.choices[0].message.content,
        error: null
      };
    } catch (error) {
      return {
        model: this.modelConfig.name,
        response: null,
        error: error.message
      };
    }
  }
}