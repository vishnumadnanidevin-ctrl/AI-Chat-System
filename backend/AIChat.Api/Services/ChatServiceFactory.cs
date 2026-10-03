using AIChat.Api.Config;
using AIChat.Api.Models;
using Microsoft.Extensions.Options;

namespace AIChat.Api.Services;

public class ChatServiceFactory
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<AIProviderSettings> _providerSettings;

    public ChatServiceFactory(IHttpClientFactory httpClientFactory, IOptionsMonitor<AIProviderSettings> providerSettings)
    {
        _httpClientFactory = httpClientFactory;
        _providerSettings = providerSettings;
    }

    public ProviderConfig? GetProviderConfig(string providerName)
    {
        var providers = _providerSettings.CurrentValue.Providers;
        return providers.ContainsKey(providerName) ? providers[providerName] : null;
    }

    public List<ModelOption> GetAvailableModels()
    {
        var providerList = new List<ModelOption>();
        var providers = _providerSettings.CurrentValue.Providers;

        foreach (var kvp in providers)
        {
            var provider = kvp.Value;
            if (!provider.Enabled)
            {
                continue;
            }

            var hasKey = !provider.RequiresApiKey || !string.IsNullOrWhiteSpace(provider.ApiKey);

            var modelDetails = (provider.Models.Count > 0 ? provider.Models : new List<string> { "default" })
                .Select(m => BuildModelDetail(kvp.Key, m))
                .ToList();

            providerList.Add(new ModelOption
            {
                Provider = kvp.Key,
                Type = provider.Type,
                Description = string.IsNullOrWhiteSpace(provider.Description) 
                    ? GetDefaultDescription(kvp.Key) 
                    : provider.Description,
                IsConfigured = hasKey,
                Models = modelDetails
            });
        }

        if (providerList.Count == 0)
        {
            providerList.Add(new ModelOption
            {
                Provider = "Demo",
                Type = "Demo",
                Description = "Offline Demo Mode",
                IsConfigured = true,
                Models = new List<ModelDetail>
                {
                    new ModelDetail { Id = "demo-model", Name = "Demo Code Assistant", Category = "Coding", Badge = "Offline Demo", ContextWindow = "32k" }
                }
            });
        }

        return providerList;
    }

    private static string GetDefaultDescription(string provider) => provider switch
    {
        "Gemini" => "Google DeepMind's flagship Gemini models featuring massive context & high-speed reasoning.",
        "DeepSeek" => "Specialized open weights reasoning and deep coding model, top tier for algorithms.",
        "Claude" => "Anthropic Claude 3.7 / 3.5 models optimized for coding, systems architecture & nuance.",
        "OpenAI" => "Industry standard reasoning and coding models from OpenAI (GPT-4o, o1, o3-mini).",
        "Groq" => "Ultra low-latency LPU inference for fast code iteration, debugging and linting.",
        "Ollama" => "Self-hosted local AI models running privately on your machine without API keys.",
        "Mistral" => "Codestral & Mistral Large - European powerhouse models built for multi-language coding.",
        "Qwen" => "Alibaba Qwen 2.5 Coder - one of the highest ranked open coding models in the world.",
        "OpenRouter" => "Unified gateway to 100+ AI models across every creator and pricing tier.",
        "Copilot" => "GitHub Copilot compatible API for developer assistance.",
        _ => "AI Provider for developers and code generation."
    };

    private static ModelDetail BuildModelDetail(string provider, string modelId)
    {
        var category = "Coding";
        var badge = "Code";
        var window = "128k";
        var name = modelId;

        var lower = modelId.ToLowerInvariant();

        if (lower.Contains("reasoner") || lower.Contains("o1") || lower.Contains("o3") || lower.Contains("thinking") || lower.Contains("r1"))
        {
            category = "Reasoning";
            badge = "Deep Thinking";
            window = "128k";
        }
        else if (lower.Contains("coder") || lower.Contains("codestral") || lower.Contains("code"))
        {
            category = "Coding";
            badge = "Code Specialist";
            window = "128k";
        }
        else if (lower.Contains("flash") || lower.Contains("mini") || lower.Contains("turbo") || lower.Contains("haiku") || lower.Contains("fast"))
        {
            category = "Fast";
            badge = "Ultra Fast";
            window = "128k";
        }
        else if (lower.Contains("sonnet") || lower.Contains("opus") || lower.Contains("gpt-4o") || lower.Contains("pro"))
        {
            category = "Flagship";
            badge = "Flagship";
            window = "200k";
        }

        if (lower.Contains("1m") || lower.Contains("gemini-1.5") || lower.Contains("gemini-2.0") || lower.Contains("gemini-3"))
        {
            window = "1M - 2M";
        }

        // Friendly name formatter
        name = modelId
            .Replace("deepseek-coder", "DeepSeek Coder")
            .Replace("deepseek-reasoner", "DeepSeek R1 Reasoner")
            .Replace("deepseek-chat", "DeepSeek V3 Chat")
            .Replace("claude-3-7-sonnet", "Claude 3.7 Sonnet (Hybrid)")
            .Replace("claude-3-5-sonnet", "Claude 3.5 Sonnet")
            .Replace("claude-3-5-haiku", "Claude 3.5 Haiku")
            .Replace("gpt-4o-mini", "GPT-4o Mini")
            .Replace("gpt-4o", "GPT-4o")
            .Replace("o3-mini", "o3-mini (Reasoning)")
            .Replace("o1-mini", "o1-mini (Reasoning)")
            .Replace("codestral", "Mistral Codestral")
            .Replace("gemini-3.8-flash", "Gemini 3.8 Flash (High Speed)")
            .Replace("gemini-2.5-pro", "Gemini 2.5 Pro (Flagship)")
            .Replace("gemini-2.5-flash", "Gemini 2.5 Flash")
            .Replace("gemini-flash-lite-latest", "Gemini Flash-Lite");

        return new ModelDetail
        {
            Id = modelId,
            Name = name,
            Category = category,
            Badge = badge,
            ContextWindow = window
        };
    }

    public IChatService Create(string providerName, string? overrideApiKey = null, string? overrideBaseUrl = null)
    {
        var providerKey = string.IsNullOrWhiteSpace(providerName) ? "OpenAI" : providerName;

        if (string.Equals(providerKey, "Demo", StringComparison.OrdinalIgnoreCase))
        {
            return new DemoChatService();
        }

        var provider = _providerSettings.CurrentValue.Providers.ContainsKey(providerKey)
            ? _providerSettings.CurrentValue.Providers[providerKey]
            : null;

        if (provider is null || !provider.Enabled)
        {
            throw new InvalidOperationException($"Provider '{providerKey}' is not configured or enabled.");
        }

        var effectiveApiKey = !string.IsNullOrWhiteSpace(overrideApiKey) ? overrideApiKey.Trim() : provider.ApiKey;
        var effectiveBaseUrl = !string.IsNullOrWhiteSpace(overrideBaseUrl) ? overrideBaseUrl.Trim() : provider.BaseUrl;

        if (provider.RequiresApiKey && string.IsNullOrWhiteSpace(effectiveApiKey))
        {
            throw new InvalidOperationException($"An API key is required for provider '{providerKey}'. Please configure it in appsettings.json or enter your key in the AI Hub settings.");
        }

        var resolvedConfig = new ProviderConfig
        {
            Enabled = provider.Enabled,
            RequiresApiKey = provider.RequiresApiKey,
            Type = provider.Type,
            Description = provider.Description,
            BaseUrl = effectiveBaseUrl,
            ApiKey = effectiveApiKey,
            Models = provider.Models
        };

        return resolvedConfig.Type switch
        {
            "Anthropic" => new AnthropicChatService(resolvedConfig, _httpClientFactory.CreateClient()),
            "Gemini" => new GeminiChatService(resolvedConfig, _httpClientFactory.CreateClient()),
            _ => new OpenAICompatibleChatService(resolvedConfig, _httpClientFactory.CreateClient())
        };
    }
}
