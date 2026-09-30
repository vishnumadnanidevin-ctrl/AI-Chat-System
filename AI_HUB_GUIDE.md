# Universal AI Hub for Developers

A modern, production-grade AI Hub built for developers. Supports all premier AI coding models across OpenAI, Anthropic, DeepSeek, Google Gemini, Groq, Mistral/Codestral, Ollama, and OpenRouter, with code highlighting, 1-click clipboard, custom parameters, and developer personas.

---

## 🚀 Supported AI Models & Providers

| Provider | Core Models Included | Best Used For |
| :--- | :--- | :--- |
| **Google Gemini** | `gemini-3.8-flash`, `gemini-flash-lite`, `gemini-1.5-pro` | High-speed code gen, 1M+ token context |
| **DeepSeek** | `deepseek-reasoner` (R1), `deepseek-chat` (V3), `deepseek-coder` | Complex algorithms, reasoning, math |
| **Anthropic Claude** | `claude-3-7-sonnet`, `claude-3-5-sonnet`, `claude-3-5-haiku` | Architecture, refactoring, systems code |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini`, `o1-mini` | Production backend, reasoning |
| **Groq LPU** | `llama-3.3-70b`, `llama-3.1-8b`, `qwen-2.5-coder-32b` | Sub-second latency (500+ tokens/sec) |
| **Mistral AI** | `codestral-latest`, `mistral-large-latest` | 80+ programming languages specialist |
| **Ollama** | `qwen2.5-coder`, `deepseek-coder-v2`, `llama3.2` | 100% private offline local code execution |
| **OpenRouter** | `qwen-2.5-coder-32b`, `deepseek-r1`, `llama-3.3-70b` | Universal gateway to 100+ models |
| **GitHub Copilot** | `gpt-4o`, `gpt-4o-mini`, `claude-3.5-sonnet` | Copilot-compatible API |

---

## 🛠️ How to Merge into Any Project

### Option A: Import as a Reusable React Component
You can copy `frontend/src/components/` and `frontend/src/App.jsx` into any React / Next.js / Vite project:

```jsx
import { AIChatHub, CodeBlock, FormattedMessage } from './components/AIChatHub';

function MyDashboard() {
  return (
    <div style={{ height: '100vh' }}>
      <AIChatHub />
    </div>
  );
}
```

### Option B: Drop-in Backend Controller
The backend is completely modular (.NET 8):
1. Copy [ChatController.cs](file:///e:/Vishnu/My%20Project/AI-Chat-System-main/backend/AIChat.Api/Controllers/ChatController.cs) and [AIChatServices.cs](file:///e:/Vishnu/My%20Project/AI-Chat-System-main/backend/AIChat.Api/Services/AIChatServices.cs) into your backend project.
2. In your `Program.cs`, add:
```csharp
builder.Services.Configure<AIProviderSettings>(builder.Configuration.GetSection("AIProviders"));
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ChatServiceFactory>();
```
3. Copy the `AIProviders` section from [appsettings.json](file:///e:/Vishnu/My%20Project/AI-Chat-System-main/backend/AIChat.Api/appsettings.json).

---

## ⚡ Features
- **In-App API Key & Endpoint Configuration**: Enter your API keys directly from the UI without modifying config files.
- **Code Block Formatting & Clipboard**: Formatted code with language badges and instant copy buttons.
- **Developer Personas**: Switch between *Full-Stack Architect*, *Deep Bug Finder*, *Clean Code Refactor*, and *API Design*.
- **Parameter Controls**: Real-time adjustment of Temperature (Precise vs Creative) and Max Tokens (up to 8,192).
- **Persistent Chat History**: Automatically saved in `localStorage`.
