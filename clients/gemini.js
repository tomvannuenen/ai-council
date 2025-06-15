import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiClient {
  constructor(apiKey, modelConfig) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: modelConfig.id });
    this.modelConfig = modelConfig;
  }

  async query(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return {
        model: this.modelConfig.name,
        response: response.text(),
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