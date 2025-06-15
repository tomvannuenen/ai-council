import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
  constructor(apiKey, modelConfig) {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
    this.modelConfig = modelConfig;
  }

  async query(prompt) {
    try {
      const response = await this.client.messages.create({
        model: this.modelConfig.id,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      return {
        model: this.modelConfig.name,
        response: response.content[0].text,
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