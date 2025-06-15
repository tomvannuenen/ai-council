class AICouncil {
    constructor() {
        this.availableModels = {};
        this.init();
    }

    async init() {
        await this.loadAvailableModels();
        this.setupEventListeners();
        this.renderModelSelection();
    }

    async loadAvailableModels() {
        try {
            const response = await fetch('/api/models');
            this.availableModels = await response.json();
        } catch (error) {
            console.error('Failed to load available models:', error);
            this.showError('Failed to load available models. Please check your API keys.');
        }
    }

    setupEventListeners() {
        const askBtn = document.getElementById('askBtn');
        const questionInput = document.getElementById('questionInput');

        askBtn.addEventListener('click', () => this.askQuestion());
        
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                this.askQuestion();
            }
        });
    }

    renderModelSelection() {
        const container = document.getElementById('modelSelection');
        
        if (Object.keys(this.availableModels).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Loading available models...</p>
                    <div class="spinner"></div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        Object.entries(this.availableModels).forEach(([provider, models]) => {
            const providerDiv = document.createElement('div');
            providerDiv.className = 'model-group';
            
            const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
            
            providerDiv.innerHTML = `
                <h3>${providerName} (${models.length} models available)</h3>
                <select id="${provider}Select">
                    <option value="">Select ${providerName} model</option>
                    ${models.map(model => `
                        <option value="${model.id}" title="${model.description || ''}">${model.name}</option>
                    `).join('')}
                </select>
            `;
            
            container.appendChild(providerDiv);
        });

        if (Object.keys(this.availableModels).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No API keys found or no models available. Please check your API keys in .zshrc:</p>
                    <ul style="text-align: left; margin-top: 10px;">
                        <li>CLAUDE_API_KEY</li>
                        <li>OPENAI_API_KEY</li>
                        <li>GEMINI_API_KEY</li>
                    </ul>
                </div>
            `;
        }
    }

    getSelectedModels() {
        const selected = {};
        
        Object.keys(this.availableModels).forEach(provider => {
            const select = document.getElementById(`${provider}Select`);
            if (select && select.value) {
                selected[provider] = select.value;
            }
        });
        
        return selected;
    }

    async askQuestion() {
        const question = document.getElementById('questionInput').value.trim();
        const selectedModels = this.getSelectedModels();
        const includeSummary = document.getElementById('includeSummary').checked;

        if (!question) {
            alert('Please enter a question');
            return;
        }

        if (Object.keys(selectedModels).length === 0) {
            alert('Please select at least one model');
            return;
        }

        this.showLoading(true);
        this.clearResults();

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question,
                    selectedModels,
                    includeSummary
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get responses');
            }

            this.displayResults(data.results, data.summary, question);

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    displayResults(results, summary, question) {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';

        // Add question header
        const questionHeader = document.createElement('div');
        questionHeader.innerHTML = `
            <h2 style="color: #333; margin-bottom: 25px; text-align: center; font-size: 1.5em;">
                Results for: "${question}"
            </h2>
        `;
        resultsContainer.appendChild(questionHeader);

        // Display individual results
        results.forEach(result => {
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            
            const content = result.error 
                ? `<span class="error">❌ Error: ${result.error}</span>`
                : result.response;
            
            resultCard.innerHTML = `
                <div class="result-header">${result.model}</div>
                <div class="result-content">${content}</div>
            `;
            
            resultsContainer.appendChild(resultCard);
        });

        // Display summary if available
        if (summary) {
            const summaryCard = document.createElement('div');
            summaryCard.className = 'result-card summary-card';
            
            summaryCard.innerHTML = `
                <div class="result-header summary-header">📋 Integrated Summary</div>
                <div class="result-content">${summary}</div>
            `;
            
            resultsContainer.appendChild(summaryCard);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const askBtn = document.getElementById('askBtn');
        
        loading.style.display = show ? 'block' : 'none';
        askBtn.disabled = show;
        
        if (show) {
            askBtn.textContent = 'Asking...';
        } else {
            askBtn.textContent = 'Ask AI Council';
        }
    }

    clearResults() {
        document.getElementById('results').innerHTML = '';
    }

    showError(message) {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = `
            <div class="result-card">
                <div class="result-header" style="background: #e74c3c;">Error</div>
                <div class="result-content error">${message}</div>
            </div>
        `;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AICouncil();
});