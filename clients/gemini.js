import { GoogleGenAI } from '@google/genai';

export class GeminiClient {
  constructor(apiKey, modelConfig) {
    this.client = new GoogleGenAI({ apiKey: apiKey });
    this.modelConfig = modelConfig;
  }

  async query(prompt) {
    try {
      const response = await this.client.models.generateContent({
        model: this.modelConfig.id,
        contents: prompt,
      });
      
      return {
        model: this.modelConfig.name,
        response: response.text,
        error: null
      };
    } catch (error) {
      // Handle quota errors with helpful message
      if (error.message.includes('quota') || error.message.includes('429')) {
        const quotaError = error.message.includes('gemini-2.5-pro-preview-03-25') 
          ? 'Quota exceeded. Try using gemini-2.5-pro-preview-03-25 for higher limits.'
          : 'API quota exceeded. Please check your usage limits.';
        
        return {
          model: this.modelConfig.name,
          response: null,
          error: quotaError
        };
      }
      
      return {
        model: this.modelConfig.name,
        response: null,
        error: error.message
      };
    }
  }
}