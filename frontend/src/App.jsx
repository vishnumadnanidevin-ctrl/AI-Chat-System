import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cpu,
  Settings,
  Send,
  Trash2,
  Sliders,
  ChevronDown,
  Sparkles,
  Zap,
  Code,
  Shield,
  Layers,
  Terminal,
  Server,
  KeyRound
} from 'lucide-react';
import ChatMessageItem from './components/ChatMessageItem';
import PromptPresets from './components/PromptPresets';
import ProviderConfigModal from './components/ProviderConfigModal';

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: `### Welcome to Developer AI Hub 🚀
The ultimate multi-model coding station designed for software engineers.

- **All Major Developer Models**: DeepSeek R1 & Coder, Anthropic Claude 3.7 / 3.5 Sonnet, OpenAI GPT-4o & o3-mini, Google Gemini 3.8 & 2.5 Pro, Mistral Codestral, Groq LPU, and Ollama local models.
- **Embedded Syntax Highlighting**: Copy-paste production code with 1-click clipboard integration.
- **Developer Personas**: Switch between *Full-Stack Architect*, *Deep Bug Finder*, *Clean Code Refactor*, and *API Design*.
- **Embeddable in Any Project**: Designed as a self-contained, modular UI easily portable to any React or web app.

Select your model from the sidebar or click **Configure Key** to add your custom tokens!`,
    model: 'AI Hub Master',
    timestamp: 'Just now'
  }
];

export default function App() {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('Gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_hub_chat_history');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Settings & Configurations
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [activePreset, setActivePreset] = useState('fullstack');
  const [customSystemPrompt, setCustomSystemPrompt] = useState(
    'You are an elite Senior Software Engineer and Architect. Provide production-ready, clean, scalable code with complete error handling, strict type safety, and best practices.'
  );
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Client-side local key storage for easy zero-config provider switches
  const [providerOverrides, setProviderOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_hub_keys_config');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync history to local storage
  useEffect(() => {
    try {
      localStorage.setItem('ai_hub_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to cache chat history', e);
    }
  }, [messages]);

  // Sync client keys to local storage
  useEffect(() => {
    try {
      localStorage.setItem('ai_hub_keys_config', JSON.stringify(providerOverrides));
    } catch (e) {
      console.warn('Failed to cache provider overrides', e);
    }
  }, [providerOverrides]);

  // Load backend provider & model capabilities
  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetch('/api/chat/models');
        const data = await response.json();
        const loadedProviders = data.providers || [];
        setProviders(loadedProviders);

        if (loadedProviders.length > 0) {
          // Default to Gemini or first configured provider
          const activeProv = loadedProviders.find((p) => p.provider === 'Gemini') || loadedProviders[0];
          setSelectedProvider(activeProv.provider);
          if (activeProv.models && activeProv.models.length > 0) {
            setSelectedModel(activeProv.models[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load models list', err);
      }
    }
    loadModels();
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Current active provider object
  const currentProviderObj = useMemo(() => {
    return providers.find((p) => p.provider === selectedProvider);
  }, [providers, selectedProvider]);

  // Model list filtered by category if applicable
  const availableModels = useMemo(() => {
    if (!currentProviderObj) return [];
    if (selectedCategory === 'All') return currentProviderObj.models || [];
    return (currentProviderObj.models || []).filter(
      (m) => m.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [currentProviderObj, selectedCategory]);

  const activeModelDetail = useMemo(() => {
    return (currentProviderObj?.models || []).find((m) => m.id === selectedModel);
  }, [currentProviderObj, selectedModel]);

  const handleProviderSelect = (providerName) => {
    const prov = providers.find((p) => p.provider === providerName);
    setSelectedProvider(providerName);
    if (prov && prov.models && prov.models.length > 0) {
      setSelectedModel(prov.models[0].id);
    }
  };

  const handleSelectPreset = (preset) => {
    if (!preset) {
      setActivePreset(null);
      setCustomSystemPrompt('');
    } else {
      setActivePreset(preset.id);
      setCustomSystemPrompt(preset.prompt);
    }
  };

  const handleSaveKey = (providerName, config) => {
    setProviderOverrides((prev) => ({
      ...prev,
      [providerName]: config,
    }));
  };

  const clearChatHistory = () => {
    if (window.confirm('Clear current chat session?')) {
      setMessages(INITIAL_MESSAGES);
      localStorage.removeItem('ai_hub_chat_history');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = { role: 'user', content: input.trim(), timestamp: timeStr };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const override = providerOverrides[selectedProvider] || {};

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          apiKey: override.apiKey || null,
          baseUrl: override.baseUrl || null,
          systemPrompt: customSystemPrompt || null,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: parseFloat(temperature),
          maxTokens: parseInt(maxTokens, 10),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.title || 'The chat request encountered an error.');
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'No response returned from the model.',
        model: selectedModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Execution Error**\n\n${err instanceof Error ? err.message : 'Failed to reach AI service.'}\n\n*Click the **Key & Proxy Config** button in the sidebar or top bar to input your API key, or switch to **Gemini** (active) or **Ollama**.*`,
          model: selectedModel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="hub-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="hub-sidebar">
        {/* Brand / Logo */}
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Cpu size={22} className="brand-svg" />
          </div>
          <div>
            <h1 className="brand-title">AI Hub for Devs</h1>
            <p className="brand-sub">Universal AI Engine</p>
          </div>
        </div>

        {/* Action Quickbar */}
        <div className="sidebar-quickbar">
          <button
            type="button"
            className="quick-btn"
            onClick={() => setShowConfigModal(true)}
            title="Configure API Keys & Endpoints"
          >
            <KeyRound size={14} />
            <span>Key & Proxy Config</span>
          </button>
          <button
            type="button"
            className="quick-btn text-rose-400"
            onClick={clearChatHistory}
            title="Clear Chat History"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>

        {/* Provider List */}
        <div className="sidebar-section">
          <div className="section-title-row">
            <Server size={14} className="text-sky-400" />
            <span>AI PROVIDER</span>
          </div>

          <div className="provider-cards-list">
            {providers.map((p) => {
              const isSelected = p.provider === selectedProvider;
              const hasCustomKey = !!providerOverrides[p.provider]?.apiKey;
              const isReady = p.isConfigured || hasCustomKey;

              return (
                <div
                  key={p.provider}
                  onClick={() => handleProviderSelect(p.provider)}
                  className={`provider-card-btn ${isSelected ? 'active' : ''}`}
                >
                  <div className="provider-card-top">
                    <span className="provider-name">{p.provider}</span>
                    <span className={`status-dot ${isReady ? 'ready' : 'missing'}`} title={isReady ? 'Ready' : 'API Key Required'} />
                  </div>
                  <div className="provider-card-sub">
                    <span className="badge-type">{p.type}</span>
                    <span className="models-count">{p.models?.length || 0} models</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        <div className="sidebar-section">
          <div className="section-title-row">
            <Code size={14} className="text-emerald-400" />
            <span>DEV MODEL</span>
          </div>

          {/* Model category filter */}
          <div className="category-filter-chips">
            {['All', 'Coding', 'Reasoning', 'Fast'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="model-select-wrapper">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="hub-select"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id} ({m.badge})
                </option>
              ))}
            </select>
          </div>

          {activeModelDetail && (
            <div className="model-info-box">
              <div className="info-row">
                <span className="info-label">Context Window:</span>
                <span className="info-val">{activeModelDetail.contextWindow}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Specialty:</span>
                <span className="badge-specialty">{activeModelDetail.badge}</span>
              </div>
            </div>
          )}
        </div>

        {/* Hyperparameters / Fine-tuning */}
        <div className="sidebar-section parameters-box">
          <div className="section-title-row">
            <Sliders size={14} className="text-violet-400" />
            <span>INFERENCE PARAMETERS</span>
          </div>

          <div className="param-item">
            <div className="param-header">
              <span>Temperature</span>
              <span className="param-val">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="param-slider"
            />
            <div className="param-labels">
              <span>Precise (Code)</span>
              <span>Creative</span>
            </div>
          </div>

          <div className="param-item">
            <div className="param-header">
              <span>Max Tokens</span>
              <span className="param-val">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              className="param-slider"
            />
          </div>
        </div>
      </aside>

      {/* MAIN CHAT STAGE */}
      <main className="hub-main">
        {/* Top Header Bar */}
        <header className="hub-topbar">
          <div className="topbar-left">
            <div className="active-model-indicator">
              <span className="pulse-indicator" />
              <span className="active-provider-label">{selectedProvider}:</span>
              <strong className="active-model-label">
                {activeModelDetail?.name || selectedModel}
              </strong>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="key-badge-btn"
              onClick={() => setShowConfigModal(true)}
            >
              <KeyRound size={13} />
              <span>
                {providerOverrides[selectedProvider]?.apiKey || currentProviderObj?.isConfigured
                  ? 'Key Active'
                  : 'Add Key'}
              </span>
            </button>
          </div>
        </header>

        {/* Persona & Developer Presets Banner */}
        <div className="hub-presets-bar">
          <PromptPresets
            activePreset={activePreset}
            onSelectPreset={handleSelectPreset}
          />
        </div>

        {/* Chat History Messages Stream */}
        <div className="hub-chat-stream">
          {messages.map((message, index) => (
            <ChatMessageItem key={index} message={message} index={index} />
          ))}

          {loading && (
            <div className="chat-bubble-row assistant-row">
              <div className="avatar-badge avatar-ai">
                <Cpu size={16} className="animate-spin" />
              </div>
              <div className="chat-bubble-card bubble-assistant loading-state">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="loading-text">
                  Synthesizing code response with {selectedModel}...
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Composer Form */}
        <div className="hub-composer-container">
          <form onSubmit={handleSubmit} className="hub-composer">
            <div className="composer-input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={`Ask ${selectedModel} anything about code, algorithms, architecture... (Shift + Enter for newline)`}
                className="hub-textarea"
              />
            </div>

            <div className="composer-toolbar">
              <div className="toolbar-info">
                <Terminal size={12} className="text-slate-400" />
                <span>Supports Markdown, C#, TypeScript, Python, Go, Rust & more</span>
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="hub-send-btn"
              >
                {loading ? (
                  <span>Thinking...</span>
                ) : (
                  <>
                    <span>Execute</span>
                    <Send size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Provider Config Key & Endpoint Modal */}
      <ProviderConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        provider={currentProviderObj}
        savedKeys={providerOverrides}
        onSaveKey={handleSaveKey}
      />
    </div>
  );
}
