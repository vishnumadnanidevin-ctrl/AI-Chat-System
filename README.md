# AI Chat System

A full-stack AI chat application built with React and ASP.NET Core 8. It supports multiple AI providers and model configurations, including OpenAI/ChatGPT, Anthropic/Claude, Google Gemini, GitHub Copilot, Leo AI, and any additional OpenAI-compatible provider.

## 🚀 Live Demo

View the application UI here:
- **Frontend UI**: http://10.100.22.187:5173
- **Backend API**: http://10.100.22.187:5001
- **Swagger API Docs**: http://10.100.22.187:5001/swagger

## ✨ Features

- ✅ React frontend with modern chat UI
- ✅ ASP.NET Core 8 backend API
- ✅ Model provider registry and configuration-driven architecture
- ✅ Support for multiple providers:
  - OpenAI/ChatGPT (gpt-4o, gpt-4o-mini, etc.)
  - Anthropic/Claude (claude-3-5-sonnet, claude-3-5-haiku, etc.)
  - Google Gemini (gemini-1.5-flash, gemini-1.5-pro, etc.)
  - GitHub Copilot (gpt-4o, gpt-4o-mini, etc.)
  - Leo AI (leo-pro, leo-mini, etc.)
  - Custom OpenAI-compatible providers
- ✅ Demo mode fallback when API keys are not available
- ✅ CORS-enabled API for cross-network frontend development
- ✅ Provider and model selection UI
- ✅ Real-time chat interface
- ✅ Dark theme modern UI

## 📁 Project Structure

```
AI-Chat-System/
├── backend/
│   └── AIChat.Api/
│       ├── Controllers/
│       │   └── ChatController.cs          # Chat endpoints
│       ├── Services/
│       │   ├── IChatService.cs            # Service interface
│       │   ├── ChatServiceFactory.cs      # Provider factory
│       │   ├── AIChatServices.cs          # Provider implementations
│       ├── Config/
│       │   └── AIProviderSettings.cs      # Configuration models
│       ├── Models/
│       │   └── ChatModels.cs              # Request/Response DTOs
│       ├── Properties/
│       │   └── launchSettings.json        # Launch configuration
│       ├── appsettings.json               # App settings with providers
│       ├── Program.cs                     # App startup
│       └── AIChat.Api.csproj              # Project file
├── frontend/
│   ├── src/
│   │   ├── App.jsx                        # Main chat component
│   │   ├── main.jsx                       # React entry point
│   │   └── styles.css                     # Global styles
│   ├── index.html                         # HTML template
│   ├── vite.config.js                     # Vite configuration
│   └── package.json                       # Dependencies
├── .gitignore
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI library
- **Vite 5.4** - Build tool and dev server
- **CSS3** - Modern styling with gradients and flexbox

### Backend
- **ASP.NET Core 8.0** - Web framework
- **C# 12** - Language
- **Swagger/OpenAPI** - API documentation
- **HttpClient** - HTTP communication with AI providers

## 📋 Prerequisites

- Node.js 16+
- .NET 8 SDK
- npm or yarn

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend/AIChat.Api

# Restore dependencies
dotnet restore

# Run the API
dotnet run
```

Backend will run on:
- http://10.100.22.187:5001
- Swagger Docs: http://10.100.22.187:5001/swagger

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on:
- http://10.100.22.187:5173

## 🌐 Access the Application

Open your browser and navigate to:
```
http://10.100.22.187:5173
```

## ⚙️ Configure Free Models

The app includes local Ollama models that do not require an API key and Google Gemini API models with a free tier. Free hosted-model quotas and availability depend on your account and region.

### Local models with Ollama (no API key)

1. Install [Ollama](https://ollama.com/download) and keep it running.
2. Pull the models you want to use (each model must be downloaded locally):

   ```powershell
   ollama pull llama3.2:1b
   ollama pull gemma3:1b
   ollama pull qwen3:4b
   ```

3. Start the backend and select **Ollama** in the app.

The default Ollama URL is `http://localhost:11434/v1`. If the backend runs on another machine or in a container, set `AIProviders__Ollama__BaseUrl` to the Ollama server's reachable URL.

### Hosted free models with Google Gemini

1. Create or view a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). Since May 28, 2026, new AI Studio keys are authorization keys by default. If you are using an older standard key, make sure it has an explicit restriction for the **Generative Language API**; unrestricted standard keys are rejected by Gemini.
2. Store it in .NET User Secrets from `backend/AIChat.Api` (do not put API keys in `appsettings.json` or commit them):

   ```powershell
   dotnet user-secrets set "AIProviders:Gemini:ApiKey" "YOUR_GEMINI_API_KEY"
   ```

   Replace `YOUR_GEMINI_API_KEY` with the actual key value; do not include placeholder angle brackets or paste the key into chat or source control. Run this command on the same machine and under the same Windows account that runs the backend.
3. Restart the backend. **Gemini** will then appear in the provider list.

The configured model options are `gemini-2.5-flash` and `gemini-2.5-flash-lite`. Check [Gemini API pricing and free-tier availability](https://ai.google.dev/gemini-api/docs/pricing) for current quotas and eligible models. On deployment, provide the key using the `AIProviders__Gemini__ApiKey` environment variable instead of User Secrets.

If Gemini responds with `API_KEY_INVALID`, create a new key in AI Studio or apply the Generative Language API restriction to an older standard key, update the secret above, and restart the backend. Never share the key when requesting help.

Providers requiring a key are hidden from the model list until a key is configured. If an unconfigured provider is requested directly, the API returns an error rather than a demo response.

## 📱 UI Pages & Components

### 1. **Main Chat Page** (Primary Interface)
**URL:** http://10.100.22.187:5173

Main chat interface where users interact with AI models.

**Features:**
- Provider selector dropdown (OpenAI, Claude, Gemini, Copilot, Leo AI)
- Model selector dropdown (dynamically populated)
- Chat message display area with full conversation history
- Real-time message bubbles (User vs AI)
- Input textarea for composing messages
- Send button with loading state
- Responsive dark theme UI
- Auto-scroll to latest message

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│ ┌──────────────┐  ┌──────────────────────────────────┐ │
│ │   SIDEBAR    │  │         CHAT WINDOW              │ │
│ │              │  │                                  │ │
│ │ Provider     │  │  AI: Welcome to AI Chat System   │ │
│ │ ┌──────────┐ │  │  ┌──────────────────────────────┐ │
│ │ │ OpenAI ▼ │ │  │                                  │ │
│ │ └──────────┘ │  │  You: Hello!                     │ │
│ │              │  │  ┌──────────────────────────────┐ │
│ │ Model        │  │                                  │ │
│ │ ┌──────────┐ │  │  AI: Hello! How can I help?      │ │
│ │ │gpt-4o ▼  │ │  │  ┌──────────────────────────────┐ │
│ │ └──────────┘ │  │                                  │ │
│ │              │  │  ┌──────────────────────────────┐ │
│ │              │  │  │ Type your message...         │ │
│ │              │  │  │ [Send]                       │ │
│ │              │  │  └──────────────────────────────┘ │
│ └──────────────┘  └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 2. **Sidebar Panel**
Located on the left side of the chat interface.

**Elements:**
- Application title: "AI Chat"
- Provider dropdown selector
- Model dropdown selector (updates based on provider)
- Dark themed styling
- Mobile responsive collapse

### 3. **Chat Window**
Central area displaying conversation history.

**Features:**
- Scrollable message area
- User messages aligned right with blue styling
- AI messages aligned left with gray styling
- Role indicators (You / AI)
- Loading indicator while generating response
- Auto-scroll to latest message
- Full responsive support

### 4. **Message Composer**
Bottom section for message input.

**Features:**
- Multi-line textarea
- Resizable input area
- Send button with loading state
- Disabled state when no model selected
- Clear visual feedback on interaction

### 5. **API Documentation Page**
Swagger UI for backend endpoints.

**Access:** http://10.100.22.187:5001/swagger

**Try It Out:**
- Test `/api/chat/models` endpoint to get available providers
- Test `/api/chat` endpoint to send messages

## 🔌 API Endpoints

### Get Available Models
```http
GET http://10.100.22.187:5001/api/chat/models
```

**Response:**
```json
{
  "providers": [
    {
      "provider": "OpenAI",
      "models": ["gpt-4o-mini", "gpt-4o"]
    },
    {
      "provider": "Claude",
      "models": ["claude-3-5-sonnet-20240620"]
    },
    {
      "provider": "Gemini",
      "models": ["gemini-1.5-flash"]
    }
  ]
}
```

### Send Chat Message
```http
POST http://10.100.22.187:5001/api/chat
Content-Type: application/json

{
  "provider": "OpenAI",
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "maxTokens": 500
}
```

**Response:**
```json
{
  "response": "I'm doing well! How can I help you today?",
  "provider": "OpenAI",
  "model": "gpt-4o-mini"
}
```

## 📊 Supported Providers & Models

| Provider | Type | Base Models |
|----------|------|-------------|
| **OpenAI** | OpenAI-compatible | gpt-4o, gpt-4o-mini, gpt-4.1-mini |
| **Claude** | Anthropic | claude-3-5-sonnet, claude-3-5-haiku |
| **Gemini** | Google Gemini | gemini-1.5-flash, gemini-1.5-pro |
| **Copilot** | OpenAI-compatible | gpt-4o, gpt-4o-mini |
| **Leo AI** | OpenAI-compatible | leo-pro, leo-mini |
| **Custom** | OpenAI-compatible | Any OpenAI-compatible endpoint |

## 🔒 Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Use environment-specific configs** - Separate dev and production
3. **Validate user input** - Backend validates all requests
4. **CORS configuration** - Configured for trusted origins
5. **HTTPS in production** - Always use HTTPS for API calls

## 🚀 Deployment

### Running on Network Machine (10.100.22.187)

**Backend Configuration:**
Update `backend/AIChat.Api/Properties/launchSettings.json`:
```json
{
  "profiles": {
    "AIChat.Api": {
      "applicationUrl": "http://10.100.22.187:5001"
    }
  }
}
```

**Frontend Configuration:**
Update `frontend/vite.config.js`:
```javascript
server: {
  host: '10.100.22.187',
  port: 5173
}
```

### Docker Deployment
```bash
docker build -t ai-chat-backend ./backend/AIChat.Api
docker run -p 5001:5001 -e ASPNETCORE_URLS="http://10.100.22.187:5001" ai-chat-backend

docker build -t ai-chat-frontend ./frontend
docker run -p 5173:5173 ai-chat-frontend
```

## 🧪 Testing the Application

### Test with Demo Mode (No API Keys Required)
1. Start backend: `dotnet run`
2. Start frontend: `npm run dev`
3. Navigate to http://10.100.22.187:5173
4. Select any provider and model
5. Type a message - you'll get a demo response

### Test with Real Provider
1. Add API key to `appsettings.json`
2. Restart backend
3. Send a message - you'll get a real response from the provider

## 🐛 Troubleshooting

### Issue: Cannot access http://10.100.22.187:5173
- Ensure backend is running: `netstat -an | findstr :5001`
- Check firewall allows port 5173
- Verify network connection to machine

### Issue: CORS errors in browser
- Backend CORS is configured for http://10.100.22.187:5173
- Restart backend after configuration changes

### Issue: "No models available"
- Check `appsettings.json` has providers with `"enabled": true`
- Restart backend

### Issue: API key not working
- Verify key format and provider endpoint
- Check provider's API documentation
- Test key directly with provider's API

## 📈 Future Enhancements

- [ ] Persistent chat history with database
- [ ] User authentication and profiles
- [ ] Chat export (PDF/JSON)
- [ ] Model comparison mode
- [ ] Voice input/output
- [ ] Streaming responses
- [ ] Rate limiting
- [ ] Admin dashboard
- [ ] Custom prompt templates
- [ ] Dark/Light theme toggle
- [ ] Message editing and deletion
- [ ] Conversation search

## 🤝 Contributing

Contributions welcome! Steps:
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Vishnu Madnani**
- GitHub: [@vishnumadnanidevin-ctrl](https://github.com/vishnumadnanidevin-ctrl)
- Email: vishnu.madnani.dev.in@gmail.com

## 🙏 Acknowledgments

- OpenAI - ChatGPT and GPT models
- Anthropic - Claude models
- Google - Gemini models
- GitHub - Copilot
- React - UI library
- Vite - Build tool
- ASP.NET Core - Web framework

## 📧 Support

For support, email vishnu.madnani.dev.in@gmail.com or open an issue on GitHub.

---

**Made with ❤️ by Vishnu Madnani**

**Network Access:** http://10.100.22.187:5173
