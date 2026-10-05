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
  KeyRound,
  Paperclip,
  Camera,
  Edit2,
  Crop,
  X,
  FileText,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Plus,
  MessageSquare
} from 'lucide-react';
import ChatMessageItem from './components/ChatMessageItem';
import PromptPresets from './components/PromptPresets';
import ProviderConfigModal from './components/ProviderConfigModal';
import ImageEditorModal from './components/ImageEditorModal';
import TextFileEditorModal from './components/TextFileEditorModal';
import EdgeSnippetOverlay from './components/EdgeSnippetOverlay';
import AuthModal from './components/AuthModal';
import { useAuth } from './context/AuthContext';
import html2canvas from 'html2canvas';

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
  const { user: authUser, isAuthenticated, logout: authLogout, authFetch, refreshUser } = useAuth();
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('Gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Current user derived from AuthContext
  const currentUser = authUser;

  // Multi-Chat Sessions State
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_hub_chat_sessions');
      return saved ? JSON.parse(saved) : [
        {
          id: 'sess_default',
          title: 'Welcome & System Overview',
          messages: INITIAL_MESSAGES,
          updatedAt: Date.now()
        }
      ];
    } catch {
      return [{ id: 'sess_default', title: 'Welcome & System Overview', messages: INITIAL_MESSAGES, updatedAt: Date.now() }];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState('sess_default');

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

  // Attachments State
  const [attachments, setAttachments] = useState([]);
  const [activeImageEditor, setActiveImageEditor] = useState(null); // { id, name, data }
  const [activeTextEditor, setActiveTextEditor] = useState(null); // { id, name, data }
  const [edgeOverlaySrc, setEdgeOverlaySrc] = useState(null); // Full screenshot buffer for Edge Snipper
  const fileInputRef = useRef(null);

  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Instant Microsoft Edge Web Capture / Snipping experience
  const handleCaptureScreen = async () => {
    try {
      // 1. Try in-app direct window snapshot via html2canvas (Works on 100% of browsers, HTTP, IP, localhost, zero prompt)
      const appRoot = document.getElementById('root') || document.body;
      const canvas = await html2canvas(appRoot, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#090d16',
      });
      const dataUrl = canvas.toDataURL('image/png');
      setEdgeOverlaySrc(dataUrl);
    } catch (err) {
      console.warn('html2canvas capture fallback, attempting displayMedia:', err);
      // Fallback: try getDisplayMedia if available
      if (navigator.mediaDevices?.getDisplayMedia) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' },
            audio: false,
          });
          const video = document.createElement('video');
          video.srcObject = stream;
          await video.play();
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          stream.getTracks().forEach((track) => track.stop());
          const dataUrl = canvas.toDataURL('image/png');
          setEdgeOverlaySrc(dataUrl);
        } catch (mediaErr) {
          console.error('Screen stream failed:', mediaErr);
        }
      }
    }
  };

  const handleConfirmEdgeSnippet = (snippetDataUrl) => {
    const newAttachment = {
      id: 'snip-' + Date.now(),
      name: `Edge-Snippet-${new Date().toLocaleTimeString().replace(/:/g, '')}.png`,
      type: 'image',
      data: snippetDataUrl,
      size: snippetDataUrl.length,
    };
    setAttachments((prev) => [...prev, newAttachment]);
  };

  // Clipboard paste handler: allows instant Win+Shift+S / PrtScn -> Ctrl+V paste into chat!
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 1. Check for real file/blob in clipboard
    const items = clipboardData.items;
    let foundImage = false;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            foundImage = true;
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const newAtt = {
                id: 'pasted-' + Date.now(),
                name: `Screenshot-${new Date().toLocaleTimeString().replace(/:/g, '')}.png`,
                type: 'image',
                data: loadEvent.target.result,
                size: file.size,
              };
              setAttachments((prev) => [...prev, newAtt]);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    }

    // 2. If no blob was found, check if plain text is a base64 image data URL (fallback from capture tool)
    if (!foundImage) {
      const text = clipboardData.getData('text');
      if (text && text.startsWith('data:image/')) {
        e.preventDefault();
        const newAtt = {
          id: 'pasted-url-' + Date.now(),
          name: `Snippet-${new Date().toLocaleTimeString().replace(/:/g, '')}.png`,
          type: 'image',
          data: text,
          size: text.length,
        };
        setAttachments((prev) => [...prev, newAtt]);
      }
    }
  };

  // Upload local files or images
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const reader = new FileReader();

      if (isImg) {
        reader.onload = (uploadEvent) => {
          const newAtt = {
            id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: file.name,
            type: 'image',
            data: uploadEvent.target.result,
            size: file.size,
          };
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (uploadEvent) => {
          const newAtt = {
            id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: file.name,
            type: 'text',
            data: uploadEvent.target.result,
            size: file.size,
          };
          setAttachments((prev) => [...prev, newAtt]);
        };
        reader.readAsText(file);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveEditedImage = (newDataUrl) => {
    if (!activeImageEditor) return;
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === activeImageEditor.id ? { ...a, data: newDataUrl, size: newDataUrl.length } : a
      )
    );
  };

  const handleSaveEditedText = (id, newText) => {
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, data: newText, size: newText.length } : a
      )
    );
  };

  // Sync history to local storage & active session
  useEffect(() => {
    try {
      localStorage.setItem('ai_hub_chat_history', JSON.stringify(messages));
      // Keep active session messages in sync
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages, updatedAt: Date.now() } : s))
      );
    } catch (e) {
      console.warn('Failed to cache chat history', e);
    }
  }, [messages, activeSessionId]);

  // Sync sessions list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ai_hub_chat_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to cache chat sessions', e);
    }
  }, [sessions]);

  // Sync user profile to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('ai_hub_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('ai_hub_current_user');
      }
    } catch (e) {
      console.warn('Failed to sync current user', e);
    }
  }, [currentUser]);

  // Session Handlers (ChatGPT / Claude multi-chat experience)
  const handleNewChat = () => {
    const newSessionId = 'sess_' + Date.now();
    const newSession = {
      id: newSessionId,
      title: 'New Chat',
      messages: INITIAL_MESSAGES,
      updatedAt: Date.now()
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setAttachments([]);
  };

  const handleSelectSession = (session) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || INITIAL_MESSAGES);
    setInput('');
    setAttachments([]);
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // Just clear current session
      setMessages(INITIAL_MESSAGES);
      return;
    }
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      const nextActive = filtered[0];
      setActiveSessionId(nextActive.id);
      setMessages(nextActive.messages || INITIAL_MESSAGES);
    }
  };

  const handleLoginSuccess = (userObj) => {
    setShowAuthModal(false);

    // Notify user with a friendly system welcome in the active chat
    const welcomeNotice = {
      role: 'assistant',
      content: `🎉 **Welcome, ${userObj.name}! All AI Developer Models are now Active.**\n\nYour account (\`${userObj.email}\`) has been authenticated. You now have unified developer access to:\n- ⚡ **Google Gemini**: \`gemini-3.8-flash\`, \`gemini-flash-lite\`\n- 🧠 **OpenRouter / Free Frontier Models**: \`openrouter/free\`, \`qwen/qwen3.8-27b:free\`, \`deepseek/deepseek-r1\`\n- 💻 **Claude, Copilot & OpenAI**: Select any model in the sidebar to begin building.\n\n*All models are centralized here in this single workspace—no need to switch between different platforms.*`,
      model: 'AI Hub Master',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, welcomeNotice]);
  };

  const handleLogout = async () => {
    if (window.confirm('Sign out from your Dev AI account?')) {
      await authLogout();
      setProviderOverrides({});
    }
  };

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

  // All unified models across all providers for instant 1-click access
  const allUnifiedModels = useMemo(() => {
    const list = [];
    providers.forEach((p) => {
      (p.models || []).forEach((m) => {
        list.push({ ...m, provider: p.provider });
      });
    });
    return list;
  }, [providers]);

  // Model list: shows models for selected provider, or all unified models if filtered
  const availableModels = useMemo(() => {
    const baseList = currentProviderObj?.models || [];
    if (selectedCategory === 'All') return baseList;
    return baseList.filter(
      (m) => m.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [currentProviderObj, selectedCategory]);

  const activeModelDetail = useMemo(() => {
    return allUnifiedModels.find((m) => m.id === selectedModel);
  }, [allUnifiedModels, selectedModel]);

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

  const handleEditMessage = async (msgIndex, newContent, resubmit = true) => {
    if (!newContent.trim()) return;

    if (!resubmit) {
      setMessages((prev) =>
        prev.map((m, idx) => (idx === msgIndex ? { ...m, content: newContent } : m))
      );
      return;
    }

    // Truncate conversation to this message and resubmit
    const updatedUserMsg = {
      ...messages[msgIndex],
      content: newContent.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const historyUpToEdit = messages.slice(0, msgIndex);
    const newContext = [...historyUpToEdit, updatedUserMsg];

    setMessages(newContext);
    setLoading(true);

    if (!currentUser) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '🔒 **Please Sign In**\n\nPlease sign in with your Google account to send messages and unlock all AI developer models.',
          model: selectedModel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setLoading(false);
      setShowAuthModal(true);
      return;
    }

    const override = providerOverrides[selectedProvider] || {};

    try {
      const response = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          apiKey: (override.apiKey && override.apiKey !== 'system-active') ? override.apiKey : null,
          baseUrl: override.baseUrl || null,
          systemPrompt: customSystemPrompt || null,
          messages: newContext.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: parseFloat(temperature),
          maxTokens: parseInt(maxTokens, 10),
        }),
      });

      if (response.status === 401) {
        setShowAuthModal(true);
        throw new Error('Your session has expired. Please sign in again.');
      }

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
      refreshUser();
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || loading) return;

    if (!currentUser) {
      setShowAuthModal(true);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '🔒 **Please Sign In**\n\nPlease sign in with your Google account to send messages and unlock all AI developer models.',
          model: selectedModel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentAttachments = [...attachments];
    const userMessage = {
      role: 'user',
      content: input.trim(),
      attachments: currentAttachments,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setLoading(true);

    const override = providerOverrides[selectedProvider] || {};

    try {
      const response = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          apiKey: (override.apiKey && override.apiKey !== 'system-active') ? override.apiKey : null,
          baseUrl: override.baseUrl || null,
          systemPrompt: customSystemPrompt || null,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments || null,
          })),
          temperature: parseFloat(temperature),
          maxTokens: parseInt(maxTokens, 10),
        }),
      });

      if (response.status === 401) {
        setShowAuthModal(true);
        throw new Error('Your session has expired. Please sign in again.');
      }

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
      refreshUser();
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
            className="btn-new-chat"
            onClick={handleNewChat}
            title="Start a new AI conversation"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>

          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button
              type="button"
              className="quick-btn"
              onClick={() => setShowConfigModal(true)}
              title="Configure API Keys & Endpoints"
              style={{ flex: 1 }}
            >
              <KeyRound size={13} />
              <span>Key Config</span>
            </button>
            <button
              type="button"
              className="quick-btn text-rose-400"
              onClick={clearChatHistory}
              title="Clear Current Chat"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Sessions / Chat History List (ChatGPT style) */}
        <div className="sidebar-section">
          <div className="section-title-row">
            <MessageSquare size={14} className="text-blue-400" />
            <span>CHAT SESSIONS ({sessions.length})</span>
          </div>

          <div className="sessions-list-container">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  className={`session-item-row ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectSession(sess)}
                >
                  <span className="session-title-text" title={sess.title}>
                    {sess.title}
                  </span>
                  <button
                    type="button"
                    className="session-delete-btn"
                    onClick={(e) => handleDeleteSession(e, sess.id)}
                    title="Delete chat session"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
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
              // When user is logged in with Google, ALL providers are activated via unified access
              const isReady = !!currentUser || p.isConfigured || hasCustomKey;

              return (
                <div
                  key={p.provider}
                  onClick={() => handleProviderSelect(p.provider)}
                  className={`provider-card-btn ${isSelected ? 'active' : ''}`}
                >
                  <div className="provider-card-top">
                    <span className="provider-name">{p.provider}</span>
                    <span
                      className={`status-dot ${isReady ? 'ready' : 'missing'}`}
                      title={isReady ? 'Active & Ready' : 'API Key Required'}
                    />
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
              onChange={(e) => {
                const chosenId = e.target.value;
                setSelectedModel(chosenId);
                // Auto-switch provider if chosen model belongs to another provider
                const modelInfo = allUnifiedModels.find((m) => m.id === chosenId);
                if (modelInfo && modelInfo.provider && modelInfo.provider !== selectedProvider) {
                  setSelectedProvider(modelInfo.provider);
                }
              }}
              className="hub-select"
            >
              {providers.map((p) => {
                const pModels = (p.models || []).filter((m) =>
                  selectedCategory === 'All' ? true : m.category.toLowerCase() === selectedCategory.toLowerCase()
                );
                if (pModels.length === 0) return null;
                return (
                  <optgroup key={p.provider} label={`━━━ ${p.provider} Models ━━━`}>
                    {pModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} ({m.badge})
                      </option>
                    ))}
                  </optgroup>
                );
              })}
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

        {/* User Account / Sign In Status */}
        {currentUser ? (
          <div className="user-profile-card">
            <div className="user-profile-left">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="user-profile-avatar"
              />
              <div className="user-profile-info">
                <span className="user-name" title={currentUser.email}>
                  {currentUser.name}
                </span>
                <span className="user-plan-badge">
                  <Sparkles size={11} />
                  <span>All AI Models Active</span>
                </span>
                {currentUser.quota && (
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>
                    Quota: {currentUser.quota.remaining} / {currentUser.quota.limit} today
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="user-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="login-trigger-btn"
            onClick={() => setShowAuthModal(true)}
            title="Sign in with Google or Email to unlock all models"
          >
            <LogIn size={15} />
            <span>Sign In / Activate All AI</span>
          </button>
        )}
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

          <div className="topbar-right" style={{ position: 'relative' }}>
            {currentUser ? (
              <>
                <button
                  type="button"
                  className="key-badge-btn"
                  onClick={() => setShowConfigModal(true)}
                  style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.12)' }}
                >
                  <KeyRound size={13} className="text-emerald-400" />
                  <span style={{ color: '#34d399' }}>Key Active</span>
                </button>

                <div style={{ position: 'relative' }}>
                  <div
                    className="key-badge-btn"
                    style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.12)', cursor: 'pointer' }}
                    onClick={() => setShowUserDropdown((prev) => !prev)}
                    title={`Logged in as ${currentUser.email}`}
                  >
                    <img
                      src={currentUser.avatar || currentUser.pictureUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(currentUser.email || 'user')}`}
                      alt={currentUser.name}
                      style={{ width: 16, height: 16, borderRadius: '50%' }}
                    />
                    <span style={{ color: '#c7d2fe' }}>{currentUser.name}</span>
                    <ChevronDown size={12} style={{ color: '#94a3b8', marginLeft: 4 }} />
                  </div>

                  {showUserDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 6,
                        minWidth: 180,
                        backgroundColor: '#181b26',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                        zIndex: 100,
                        padding: '6px 0',
                      }}
                    >
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f1f5f9' }}>{currentUser.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.email}</div>
                        {currentUser.quota && (
                          <div style={{ fontSize: '0.68rem', color: '#34d399', marginTop: 4 }}>
                            Daily Quota: {currentUser.quota.remaining}/{currentUser.quota.limit}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleLogout();
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          color: '#f43f5e',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                className="key-badge-btn"
                onClick={() => setShowAuthModal(true)}
                style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.12)' }}
              >
                <LogIn size={13} className="text-indigo-400" />
                <span style={{ color: '#a5b4fc' }}>Sign In</span>
              </button>
            )}
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
            <ChatMessageItem
              key={index}
              message={message}
              index={index}
              onEditMessage={handleEditMessage}
              disabled={loading}
            />
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
            {/* Attachment preview tray */}
            {attachments.length > 0 && (
              <div className="composer-attachments-tray">
                {attachments.map((att) => (
                  <div key={att.id} className="attachment-chip">
                    {att.type === 'image' ? (
                      <div
                        className="chip-img-thumb"
                        onClick={() => setActiveImageEditor(att)}
                        title="Click to Crop / Highlight / Annotate"
                      >
                        <img src={att.data} alt={att.name} />
                        <span className="chip-badge-edit">
                          <Crop size={10} />
                          <span>Edit</span>
                        </span>
                      </div>
                    ) : (
                      <div
                        className="chip-file-thumb"
                        onClick={() => setActiveTextEditor(att)}
                        title="Click to view & edit text file"
                      >
                        <FileText size={14} className="text-sky-400" />
                        <span className="chip-file-name">{att.name}</span>
                        <span className="chip-badge-edit">
                          <Edit2 size={10} />
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={() => removeAttachment(att.id)}
                      title="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="composer-input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={2}
                placeholder={`Ask ${selectedModel} anything about code, upload files, capture screen, or press Ctrl+V to paste screenshot... (Shift + Enter for newline)`}
                className="hub-textarea"
              />
            </div>

            <div className="composer-toolbar">
              <div className="toolbar-left-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="composer-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Files (Code, JSON, Text, Images)"
                >
                  <Paperclip size={14} />
                  <span>Attach File</span>
                </button>

                <button
                  type="button"
                  className="composer-action-btn btn-screen-capture"
                  onClick={handleCaptureScreen}
                  title="Capture Screen or Select Screenshot (Auto opens Crop & Highlighter)"
                >
                  <Camera size={14} className="text-emerald-400" />
                  <span>Capture Screen</span>
                </button>
              </div>

              <div className="toolbar-right-actions">
                <div className="toolbar-info">
                  <Terminal size={12} className="text-slate-400" />
                  <span>Vision & File Analysis Active</span>
                </div>
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && attachments.length === 0)}
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

      {/* Screen & Image Crop / Highlighter Modal */}
      <ImageEditorModal
        isOpen={!!activeImageEditor}
        onClose={() => setActiveImageEditor(null)}
        imageSrc={activeImageEditor?.data}
        fileName={activeImageEditor?.name}
        onSave={handleSaveEditedImage}
      />

      {/* Uploaded File Editor Modal */}
      <TextFileEditorModal
        isOpen={!!activeTextEditor}
        onClose={() => setActiveTextEditor(null)}
        file={activeTextEditor}
        onSave={handleSaveEditedText}
      />

      {/* Microsoft Edge Style Web Capture & Snipping Tool */}
      <EdgeSnippetOverlay
        isOpen={!!edgeOverlaySrc}
        onClose={() => setEdgeOverlaySrc(null)}
        fullScreenshotSrc={edgeOverlaySrc}
        onConfirmSnippet={handleConfirmEdgeSnippet}
      />

      {/* Google / Email Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
