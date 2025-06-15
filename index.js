#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ClaudeClient } from './clients/claude.js';
import { OpenAIClient } from './clients/openai.js';
import { GeminiClient } from './clients/gemini.js';
import { AVAILABLE_MODELS } from './models.js';
import { execSync } from 'child_process';

function getApiKeys() {
  try {
    const zshrc = execSync('cat ~/.zshrc', { encoding: 'utf8' });
    
    const anthropicMatch = zshrc.match(/export ANTHROPIC_API_KEY="?([^"\n]+)"?/);
    const openaiMatch = zshrc.match(/export OPENAI_API_KEY="?([^"\n]+)"?/);
    const geminiMatch = zshrc.match(/export GEMINI_API_KEY="?([^"\n]+)"?/);
    
    return {
      anthropic: anthropicMatch ? anthropicMatch[1] : null,
      openai: openaiMatch ? openaiMatch[1] : null,
      gemini: geminiMatch ? geminiMatch[1] : null
    };
  } catch (error) {
    console.error(chalk.red('Error reading .zshrc file:', error.message));
    return { anthropic: null, openai: null, gemini: null };
  }
}

async function selectModels(apiKeys) {
  const availableProviders = [];
  
  if (apiKeys.anthropic) availableProviders.push('claude');
  if (apiKeys.openai) availableProviders.push('openai');
  if (apiKeys.gemini) availableProviders.push('gemini');
  
  if (availableProviders.length === 0) {
    console.error(chalk.red('No API keys found in .zshrc. Please add ANTHROPIC_API_KEY, OPENAI_API_KEY, and/or GEMINI_API_KEY'));
    return {};
  }

  const selectedModels = {};
  
  for (const provider of availableProviders) {
    const models = AVAILABLE_MODELS[provider];
    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: `Select ${provider.toUpperCase()} model:`,
        choices: models.map(model => ({
          name: model.name,
          value: model
        }))
      }
    ]);
    selectedModels[provider] = selectedModel;
  }
  
  return selectedModels;
}

async function querySelectedModels(prompt, apiKeys, selectedModels) {
  const clients = [];
  
  if (selectedModels.claude && apiKeys.anthropic) {
    clients.push(new ClaudeClient(apiKeys.anthropic, selectedModels.claude));
  }
  if (selectedModels.openai && apiKeys.openai) {
    clients.push(new OpenAIClient(apiKeys.openai, selectedModels.openai));
  }
  if (selectedModels.gemini && apiKeys.gemini) {
    clients.push(new GeminiClient(apiKeys.gemini, selectedModels.gemini));
  }

  console.log(chalk.blue('Querying selected models...'));
  
  const promises = clients.map(client => client.query(prompt));
  const results = await Promise.all(promises);
  
  return results;
}

async function generateSummary(responses, question, apiKeys, selectedModels) {
  const validResponses = responses.filter(r => r.response && !r.error);
  
  if (validResponses.length === 0) {
    return 'No valid responses to summarize.';
  }

  const summaryPrompt = `You are analyzing responses from different AI models to the question: "${question}"

Here are their responses:

${validResponses.map((r, i) => `${r.model}:\n${r.response}\n`).join('\n---\n')}

Please provide a concise integrated summary that:
1. Highlights key similarities and differences between the responses
2. Identifies the most consistent recommendations or information
3. Notes any unique insights from specific models
4. Provides a balanced synthesis of the different perspectives

Keep it concise but informative.`;

  if (apiKeys.anthropic && selectedModels.claude) {
    try {
      const claudeClient = new ClaudeClient(apiKeys.anthropic, selectedModels.claude);
      const summary = await claudeClient.query(summaryPrompt);
      return summary.response || 'Failed to generate summary.';
    } catch (error) {
      return 'Failed to generate summary: ' + error.message;
    }
  }
  
  return 'No Claude model available to generate summary.';
}

function displayResults(results, question) {
  console.log(chalk.bold.cyan(`\n🤖 AI Council Results for: "${question}"\n`));
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(chalk.bold.yellow(`\n${result.model}:`));
    console.log('-'.repeat(40));
    
    if (result.error) {
      console.log(chalk.red(`❌ Error: ${result.error}`));
    } else {
      console.log(chalk.white(result.response));
    }
    
    if (index < results.length - 1) {
      console.log('\n' + '='.repeat(80));
    }
  });
}

const program = new Command();

program
  .name('ai-council')
  .description('Compare responses from Claude, Gemini, and OpenAI')
  .version('1.0.0');

program
  .command('ask')
  .description('Ask a question to selected AI models')
  .argument('<question>', 'The question to ask')
  .option('-s, --summary', 'Generate an integrated summary of all responses')
  .action(async (question, options) => {
    const apiKeys = getApiKeys();
    const selectedModels = await selectModels(apiKeys);
    
    if (Object.keys(selectedModels).length === 0) {
      return;
    }
    
    const results = await querySelectedModels(question, apiKeys, selectedModels);
    
    displayResults(results, question);
    
    if (options.summary && results.length > 0) {
      console.log(chalk.bold.magenta('\n📋 Integrated Summary:'));
      console.log('-'.repeat(40));
      const summary = await generateSummary(results, question, apiKeys, selectedModels);
      console.log(chalk.cyan(summary));
    }
  });

program.parse();