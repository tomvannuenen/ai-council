# AI Council

A web application for comparing responses from multiple AI models side-by-side. Get insights from Anthropic, Google, and OpenAI all at once, with an integrated summary that highlights key differences and similarities.

## Features

- **Dynamic Model Selection** - Automatically fetches the latest available models from all providers
- **Side-by-Side Comparison** - See responses from multiple AI models simultaneously
- **Integrated Summary** - AI-powered analysis of differences and similarities between responses
- **Refined Web Interface** - Clean, modern UI with responsive design
- **Fast Performance** - Concurrent API calls for quick results
- **Secure** - API keys stored locally, never exposed in code
- **CLI Available** - Also includes a command-line interface

## Prerequisites

- Node.js (v16 or higher)
- API keys for the providers you want to use:
  - [Anthropic API Key](https://console.anthropic.com/)
  - [OpenAI API Key](https://platform.openai.com/api-keys)
  - [Google API Key](https://makersuite.google.com/app/apikey)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tomvannuenen/ai-council.git
   cd ai-council
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up API keys in your `.zshrc` file**
   ```bash
   echo 'export CLAUDE_API_KEY="your-anthropic-api-key"' >> ~/.zshrc
   echo 'export OPENAI_API_KEY="your-openai-api-key"' >> ~/.zshrc
   echo 'export GEMINI_API_KEY="your-google-api-key"' >> ~/.zshrc
   source ~/.zshrc
   ```

   > **Note**: You don't need all three API keys. The app will work with whatever keys you provide.

## Usage

### Web Interface (Recommended)

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open your browser**
   Navigate to `http://localhost:3000`

3. **Ask your question**
   - Type your question in the text area
   - Select which models you want to use from the dropdowns
   - Toggle "Include integrated summary" if desired
   - Click "Ask AI Council"

> **Security Note**: Keep the site on your own machine alongside the Express backend. Publishing the static files on a public host (e.g. GitHub Pages) forces visitors to paste API keys into their browser, where extensions or injected scripts can read them. For shared deployments, proxy model calls through a trusted server that manages the secrets.

### Command Line Interface

```bash
# Ask a question to all available models
npm run cli ask "What's the best programming language to learn in 2024?"

# Include an integrated summary
npm run cli ask "What's the best programming language to learn in 2024?" --summary
```

## How It Works

1. **Dynamic Model Fetching**: The app calls each provider's API to get their latest available models
2. **Model Selection**: Choose specific models from dropdown menus for each provider
3. **Concurrent Queries**: Your question is sent to all selected models simultaneously
4. **Response Display**: Results are shown side-by-side with clear model identification
5. **Integrated Summary**: Claude analyzes all responses to provide insights on similarities, differences, and recommendations

## Architecture

```
ai-council/
|- clients/            # API client classes for each provider
|  |- claude.js        # Anthropic Claude client
|  |- openai.js        # OpenAI client
|  `- gemini.js        # Google Gemini client
|- utils/              # Utility functions
|  `- modelFetcher.js  # Dynamic model fetching logic
|- public/             # Web interface files
|  |- index.html       # Main web page
|  `- app.js           # Frontend JavaScript
|- server.js           # Express web server
|- index.js            # CLI interface
`- package.json        # Dependencies and scripts
```

## Configuration

### Environment Variables

The app reads API keys from your shell environment. Supported variable names:

- `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` 
- `GEMINI_API_KEY` 

### Model Selection

Models are dynamically fetched from each provider's API, ensuring you always have access to the latest releases. The app automatically:

- Filters for text generation models only
- Sorts by release date (newest first)
- Handles API errors gracefully
- Shows model creation dates

## Screenshots

### Web Interface
- Beautiful gradient design with modern UI
- Responsive model selection dropdowns
- Live loading states and error handling
- Clean typography and spacing

### CLI Interface
- Colorized output for easy reading
- Progress indicators during API calls
- Structured comparison format

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Areas for improvement:

- Additional AI providers (Cohere, Mistral, etc.)
- Export functionality (PDF, JSON, etc.)
- Response caching
- Usage analytics
- Model performance metrics

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with modern web technologies (Express, vanilla JS)
- Powered by the latest AI models from Anthropic, OpenAI, and Google
- Inspired by the need to compare AI responses efficiently

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/tomvannuenen/ai-council/issues) page
2. Create a new issue with details about your problem
3. Include your Node.js version and operating system
