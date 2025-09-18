class AICouncil {
    constructor() {
        this.availableModels = {};
        this.chatHistory = [];
        this.currentChatId = null;
        this.init();
    }

    async init() {
        await this.loadAvailableModels();
        this.loadChatHistory();
        this.setupEventListeners();
        this.renderModelSelection();
        this.renderHistory();
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
        const clearHistoryBtn = document.getElementById('clearHistory');

        askBtn.addEventListener('click', () => this.askQuestion());
        
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                this.askQuestion();
            }
        });

        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all chat history?')) {
                this.chatHistory = [];
                this.currentChatId = null;
                this.saveChatHistory();
                this.renderHistory();
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
            
            const providerNames = {
                'claude': 'Anthropic',
                'openai': 'OpenAI', 
                'gemini': 'Google'
            };
            const providerName = providerNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
            
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
            this.saveCurrentChat(question, data.results, data.summary);

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderMarkdown(text) {
        if (!text) return text;
        try {
            return marked.parse(text);
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return this.escapeHtml(text);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadChatHistory() {
        const saved = localStorage.getItem('aiCouncilHistory');
        if (saved) {
            this.chatHistory = JSON.parse(saved);
        }
    }

    saveChatHistory() {
        localStorage.setItem('aiCouncilHistory', JSON.stringify(this.chatHistory));
    }

    generateChatId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.chatHistory.length === 0) {
            historyList.innerHTML = '<div class="history-item" style="text-align: center; color: #666; font-style: italic;">No previous conversations</div>';
            return;
        }

        historyList.innerHTML = this.chatHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(chat => `
                <div class="history-item ${chat.id === this.currentChatId ? 'active' : ''}" 
                     onclick="aiCouncil.loadChat('${chat.id}')">
                    <div class="history-question">${this.truncateText(chat.question, 60)}</div>
                    <div class="history-date">${new Date(chat.timestamp).toLocaleDateString()}</div>
                </div>
            `).join('');
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    loadChat(chatId) {
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (!chat) return;

        this.currentChatId = chatId;
        document.getElementById('questionInput').value = chat.question;
        this.displayResults(chat.results, chat.summary, chat.question);
        this.renderHistory();
    }

    saveCurrentChat(question, results, summary) {
        const chatId = this.generateChatId();
        const chat = {
            id: chatId,
            question,
            results,
            summary,
            timestamp: new Date().toISOString()
        };

        this.chatHistory.unshift(chat);
        // Keep only last 50 chats
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(0, 50);
        }
        
        this.currentChatId = chatId;
        this.saveChatHistory();
        this.renderHistory();
    }

    displayResults(results, summary, question) {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';

        // Add question header
        const questionHeader = document.createElement('div');
        questionHeader.innerHTML = `
            <div style="color: #666; margin-bottom: 25px; text-align: center; font-size: 1.1em; font-weight: 500;">
                Results for: <em>"${this.escapeHtml(question)}"</em>
            </div>
        `;
        resultsContainer.appendChild(questionHeader);

        // Display individual results
        results.forEach(result => {
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            
            const content = result.error 
                ? `<span class="error">Error: ${result.error}</span>`
                : this.renderMarkdown(result.response);
            
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
                <div class="result-header summary-header">Integrated Summary</div>
                <div class="result-content">${this.renderMarkdown(summary)}</div>
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
let aiCouncil;
document.addEventListener('DOMContentLoaded', () => {
    aiCouncil = new AICouncil();
});
