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
      const response = await this.client.chat.completions.create({
        model: this.modelConfig.id,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
      });
      
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