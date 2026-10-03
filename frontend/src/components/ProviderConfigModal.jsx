import React, { useState } from 'react';
import { X, Key, Globe, ShieldCheck, ExternalLink, Cpu } from 'lucide-react';

export default function ProviderConfigModal({
  isOpen,
  onClose,
  provider,
  savedKeys,
  onSaveKey,
}) {
  const [apiKey, setApiKey] = useState(savedKeys[provider?.provider]?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(savedKeys[provider?.provider]?.baseUrl || '');
  const [successNotice, setSuccessNotice] = useState(false);

  React.useEffect(() => {
    if (provider) {
      setApiKey(savedKeys[provider.provider]?.apiKey || '');
      setBaseUrl(savedKeys[provider.provider]?.baseUrl || '');
    }
  }, [provider, savedKeys, isOpen]);

  if (!isOpen || !provider) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveKey(provider.provider, { apiKey, baseUrl });
    setSuccessNotice(true);
    setTimeout(() => {
      setSuccessNotice(false);
      onClose();
    }, 900);
  };

  const getDocLink = (name) => {
    switch (name) {
      case 'DeepSeek': return 'https://platform.deepseek.com/api_keys';
      case 'Gemini': return 'https://aistudio.google.com/app/apikey';
      case 'Claude': return 'https://console.anthropic.com/settings/keys';
      case 'OpenAI': return 'https://platform.openai.com/api-keys';
      case 'Groq': return 'https://console.groq.com/keys';
      case 'Mistral': return 'https://console.mistral.ai/api-keys';
      case 'OpenRouter': return 'https://openrouter.ai/keys';
      case 'Nvidia': return 'https://build.nvidia.com';
      case 'Ollama': return 'https://ollama.com/download';
      default: return null;
    }
  };

  const docUrl = getDocLink(provider.provider);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="provider-icon-badge">
              <Cpu size={18} />
            </div>
            <div>
              <h3>Configure {provider.provider}</h3>
              <p className="modal-subtitle">{provider.type} Engine</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          <p className="provider-description-text">{provider.description}</p>

          <div className="field-group">
            <label>
              <Key size={14} />
              <span>API Key</span>
            </label>
            <input
              type="password"
              placeholder={provider.provider === 'Gemini' ? 'Configured in backend (or enter custom key)' : `Enter your ${provider.provider} API Key...`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-input"
            />
            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noreferrer"
                className="get-key-link"
              >
                <span>Get API Key from {provider.provider}</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div className="field-group">
            <label>
              <Globe size={14} />
              <span>Base URL (Optional Custom Endpoint / Proxy)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. http://localhost:11434/v1 or custom reverse proxy"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="text-input"
            />
            <span className="field-hint">
              Leave blank to use official default endpoints.
            </span>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {successNotice ? (
                <>
                  <ShieldCheck size={16} />
                  <span>Saved!</span>
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
