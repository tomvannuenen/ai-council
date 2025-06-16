import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ClaudeClient } from './clients/claude.js';
import { OpenAIClient } from './clients/openai.js';
import { GeminiClient } from './clients/gemini.js';
import { ModelFetcher } from './utils/modelFetcher.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getApiKeys() {
  try {
    const zshrc = execSync('cat ~/.zshrc', { encoding: 'utf8' });
    
    const anthropicMatch = zshrc.match(/export CLAUDE_API_KEY="?([^"\n]+)"?/);
    const openaiMatch = zshrc.match(/export OPENAI_API_KEY="?([^"\n]+)"?/);
    const geminiMatch = zshrc.match(/export GEMINI_API_KEY="?([^"\n]+)"?/);
    
    return {
      anthropic: anthropicMatch ? anthropicMatch[1] : null,
      openai: openaiMatch ? openaiMatch[1] : null,
      gemini: geminiMatch ? geminiMatch[1] : null
    };
  } catch (error) {
    console.error('Error reading .zshrc file:', error.message);
    return { anthropic: null, openai: null, gemini: null };
  }
}

app.get('/api/models', async (req, res) => {
  try {
    const apiKeys = getApiKeys();
    const availableModels = await ModelFetcher.fetchAllAvailableModels(apiKeys);
    res.json(availableModels);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch available models' });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { question, selectedModels, includeSummary } = req.body;
    const apiKeys = getApiKeys();
    
    const clients = [];
    const availableModels = await ModelFetcher.fetchAllAvailableModels(apiKeys);
    
    if (selectedModels.claude && apiKeys.anthropic && availableModels.claude) {
      const model = availableModels.claude.find(m => m.id === selectedModels.claude);
      if (model) clients.push(new ClaudeClient(apiKeys.anthropic, model));
    }
    if (selectedModels.openai && apiKeys.openai && availableModels.openai) {
      const model = availableModels.openai.find(m => m.id === selectedModels.openai);
      if (model) clients.push(new OpenAIClient(apiKeys.openai, model));
    }
    if (selectedModels.gemini && apiKeys.gemini && availableModels.gemini) {
      const model = availableModels.gemini.find(m => m.id === selectedModels.gemini);
      if (model) clients.push(new GeminiClient(apiKeys.gemini, model));
    }
    
    if (clients.length === 0) {
      return res.status(400).json({ error: 'No valid models selected or API keys missing' });
    }
    
    const promises = clients.map(client => client.query(question));
    const results = await Promise.all(promises);
    
    let summary = null;
    if (includeSummary) {
      const validResponses = results.filter(r => r.response && !r.error);
      
      if (validResponses.length > 0 && apiKeys.anthropic) {
        const summaryPrompt = `You are analyzing responses from different AI models to the question: "${question}"

Here are their responses:

${validResponses.map((r, i) => `${r.model}:\n${r.response}\n`).join('\n---\n')}

Please provide a brief integrated summary (2-3 short paragraphs max) that:
1. Highlights the key consensus and main differences
2. Notes any standout insights from specific models
3. Gives a balanced overview

Be concise and focus on the most important points.`;

        try {
          const claudeModel = availableModels.claude[0]; // Use first Claude model for summary
          const claudeClient = new ClaudeClient(apiKeys.anthropic, claudeModel);
          const summaryResult = await claudeClient.query(summaryPrompt);
          summary = summaryResult.response;
        } catch (error) {
          summary = 'Failed to generate summary: ' + error.message;
        }
      }
    }
    
    res.json({ results, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Council web app running at http://localhost:${PORT}`);
});