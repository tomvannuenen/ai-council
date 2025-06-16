import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export class ModelFetcher {
  static async fetchClaudeModels(apiKey) {
    try {
      // Use the official Anthropic models API endpoint
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No models returned from API');
      }

      // Map the API response to our format
      const models = data.data.map(model => ({
        id: model.id,
        name: model.display_name || this.formatClaudeModelName(model.id),
        description: `Created: ${new Date(model.created_at).toLocaleDateString()}`
      }));

      return models;
    } catch (error) {
      console.error('Error fetching Claude models:', error.message);
      return [];
    }
  }

  static async fetchOpenAIModels(apiKey) {
    try {
      const client = new OpenAI({ apiKey });
      const response = await client.models.list();
      
      // Debug: Log all available models
      console.log('Available OpenAI models from API:', response.data.map(m => ({
        id: m.id,
        created: m.created
      })));
      
      // Filter for chat completion models by excluding non-chat models
      const chatModels = response.data
        .filter(model => 
          !model.id.includes('instruct') && 
          !model.id.includes('edit') &&
          !model.id.includes('embedding') &&
          !model.id.includes('whisper') &&
          !model.id.includes('tts') &&
          !model.id.includes('dall-e') &&
          !model.id.includes('davinci') &&
          !model.id.includes('babbage') &&
          !model.id.includes('ada') &&
          !model.id.includes('search') &&
          !model.id.includes('similarity') &&
          !model.id.includes('code-search') &&
          !model.id.includes('text-search')
        )
        .map(model => ({
          id: model.id,
          name: this.formatOpenAIModelName(model.id),
          description: `Created: ${new Date(model.created * 1000).toLocaleDateString()}`,
          created: model.created
        }))
        .sort((a, b) => {
          // Sort by creation date (newest first)
          return b.created - a.created;
        });

      return chatModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error.message);
      return [];
    }
  }

  static async fetchGeminiModels(apiKey) {
    try {
      // Try the v1beta endpoint first as it has more models including 2.5
      let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      
      // If v1beta fails, try v1
      if (!response.ok) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.models || data.models.length === 0) {
        throw new Error('No models returned from API');
      }
      
      // Debug: Log all available models
      console.log('Available Gemini models from API:', data.models.map(m => ({
        name: m.name,
        displayName: m.displayName,
        supportedMethods: m.supportedGenerationMethods
      })));
      
      // Filter for generative models that support generateContent
      const generativeModels = data.models
        .filter(model => 
          model.supportedGenerationMethods?.includes('generateContent') &&
          !model.name.includes('embedding')
          // Removed vision filter to include Gemini 2.5 models which have vision capabilities
        )
        .map(model => ({
          id: model.name.replace('models/', ''),
          name: this.formatGeminiModelName(model.name.replace('models/', '')),
          description: model.description || model.displayName || ''
        }))
        .sort((a, b) => {
          // Sort by priority: 2.5 > 2.0 > 1.5 > 1.0, experimental models first
          if (a.id.includes('2.5') && !b.id.includes('2.5')) return -1;
          if (!a.id.includes('2.5') && b.id.includes('2.5')) return 1;
          if (a.id.includes('2.0') && !b.id.includes('2.0')) return -1;
          if (!a.id.includes('2.0') && b.id.includes('2.0')) return 1;
          if (a.id.includes('exp') && !b.id.includes('exp')) return -1;
          if (!a.id.includes('exp') && b.id.includes('exp')) return 1;
          if (a.id.includes('1.5') && !b.id.includes('1.5')) return -1;
          if (!a.id.includes('1.5') && b.id.includes('1.5')) return 1;
          if (a.id.includes('pro') && !b.id.includes('pro')) return -1;
          if (!a.id.includes('pro') && b.id.includes('pro')) return 1;
          return a.name.localeCompare(b.name);
        });

      return generativeModels;
    } catch (error) {
      console.error('Error fetching Gemini models:', error.message);
      return [];
    }
  }

  static formatClaudeModelName(modelId) {
    return modelId
      .replace(/claude-/, 'Anthropic Claude ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  static formatOpenAIModelName(modelId) {
    // Handle different model prefixes dynamically
    if (modelId.startsWith('gpt-')) {
      return modelId
        .replace(/^gpt-/, 'OpenAI GPT-')
        .replace(/turbo/i, 'Turbo')
        .replace(/preview/i, 'Preview')
        .replace(/instruct/i, 'Instruct')
        .replace(/mini/i, 'Mini')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    } else if (modelId.match(/^o\d+/)) {
      // Handle reasoning models (o1, o3, o4, etc.)
      return modelId
        .replace(/^(o\d+)-?/, 'OpenAI $1 ')
        .replace(/preview/i, 'Preview')
        .replace(/mini/i, 'Mini')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
    } else {
      // Default formatting for any other OpenAI models
      return 'OpenAI ' + modelId
        .replace(/turbo/i, 'Turbo')
        .replace(/preview/i, 'Preview')
        .replace(/mini/i, 'Mini')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  static formatGeminiModelName(modelId) {
    return modelId
      .replace(/^gemini-/, 'Google Gemini ')
      .replace(/pro/i, 'Pro')
      .replace(/flash/i, 'Flash')
      .replace(/ultra/i, 'Ultra')
      .replace(/exp/i, '(Experimental)')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  static async fetchAllAvailableModels(apiKeys) {
    const results = {};
    
    const promises = [];
    
    if (apiKeys.anthropic) {
      promises.push(
        this.fetchClaudeModels(apiKeys.anthropic)
          .then(models => ({ provider: 'claude', models }))
      );
    }
    
    if (apiKeys.openai) {
      promises.push(
        this.fetchOpenAIModels(apiKeys.openai)
          .then(models => ({ provider: 'openai', models }))
      );
    }
    
    if (apiKeys.gemini) {
      promises.push(
        this.fetchGeminiModels(apiKeys.gemini)
          .then(models => ({ provider: 'gemini', models }))
      );
    }
    
    const allResults = await Promise.all(promises);
    
    allResults.forEach(({ provider, models }) => {
      if (models.length > 0) {
        results[provider] = models;
      }
    });
    
    return results;
  }
}