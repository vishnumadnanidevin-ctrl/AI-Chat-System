using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AIChat.Api.Config;
using AIChat.Api.Models;

namespace AIChat.Api.Services;

public class DemoChatService : IChatService
{
    public Task<string> SendAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        var prompt = request.Messages.LastOrDefault()?.Content ?? "Hello";
        var answer = $"Demo response for model '{request.Model}' using provider '{request.Provider}'.\n\nYou asked: {prompt}\n\nThis app is set up for real provider integration. Add your API keys in appsettings.json to enable live chat.";
        return Task.FromResult(answer);
    }
}

public class OpenAICompatibleChatService : IChatService
{
    private readonly ProviderConfig _provider;
    private readonly HttpClient _httpClient;

    public OpenAICompatibleChatService(ProviderConfig provider, HttpClient httpClient)
    {
        _provider = provider;
        _httpClient = httpClient;
    }

    public async Task<string> SendAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        var endpoint = string.IsNullOrWhiteSpace(_provider.BaseUrl)
            ? "https://api.openai.com/v1/chat/completions"
            : _provider.BaseUrl.TrimEnd('/') + "/chat/completions";

        var messagesPayload = new List<object>();
        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            messagesPayload.Add(new { role = "system", content = request.SystemPrompt });
        }
        foreach (var m in request.Messages)
        {
            if (m.Attachments != null && m.Attachments.Count > 0)
            {
                var contentParts = new List<object>();
                if (!string.IsNullOrWhiteSpace(m.Content))
                {
                    contentParts.Add(new { type = "text", text = m.Content });
                }

                foreach (var att in m.Attachments)
                {
                    if (att.Type == "image" || att.Data.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
                    {
                        contentParts.Add(new
                        {
                            type = "image_url",
                            image_url = new { url = att.Data }
                        });
                    }
                    else
                    {
                        contentParts.Add(new
                        {
                            type = "text",
                            text = $"\n--- File Attachment: {att.Name} ---\n{att.Data}\n--- End File ---"
                        });
                    }
                }

                messagesPayload.Add(new { role = m.Role, content = contentParts });
            }
            else
            {
                messagesPayload.Add(new { role = m.Role, content = m.Content });
            }
        }

        var payload = new
        {
            model = request.Model,
            temperature = request.Temperature,
            max_tokens = request.MaxTokens,
            messages = messagesPayload
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(_provider.ApiKey))
        {
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _provider.ApiKey);
        }

        if (endpoint.Contains("openrouter.ai", StringComparison.OrdinalIgnoreCase))
        {
            httpRequest.Headers.TryAddWithoutValidation("HTTP-Referer", "http://localhost:5173");
            httpRequest.Headers.TryAddWithoutValidation("X-Title", "AI Code Assistant");
        }

        try
        {
            using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return $"Provider request failed: {response.StatusCode}. Details: {content}";
            }

            using var json = JsonDocument.Parse(content);
            return json.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "No response content returned.";
        }
        catch (Exception ex)
        {
            return $"OpenAI-compatible provider error: {ex.Message}";
        }
    }
}

public class AnthropicChatService : IChatService
{
    private readonly ProviderConfig _provider;
    private readonly HttpClient _httpClient;

    public AnthropicChatService(ProviderConfig provider, HttpClient httpClient)
    {
        _provider = provider;
        _httpClient = httpClient;
    }

    public async Task<string> SendAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        var endpoint = "https://api.anthropic.com/v1/messages";

        var payloadDict = new Dictionary<string, object>
        {
            ["model"] = request.Model,
            ["max_tokens"] = request.MaxTokens,
            ["temperature"] = request.Temperature,
            ["messages"] = request.Messages.Select(m => new { role = m.Role, content = m.Content }).ToList()
        };

        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            payloadDict["system"] = request.SystemPrompt;
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payloadDict), Encoding.UTF8, "application/json")
        };

        httpRequest.Headers.Add("x-api-key", _provider.ApiKey);
        httpRequest.Headers.Add("anthropic-version", "2023-06-01");

        try
        {
            using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return $"Anthropic request failed: {response.StatusCode}. Details: {content}";
            }

            using var json = JsonDocument.Parse(content);
            return json.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "No response content returned.";
        }
        catch (Exception ex)
        {
            return $"Anthropic provider error: {ex.Message}";
        }
    }
}

public class GeminiChatService : IChatService
{
    private readonly ProviderConfig _provider;
    private readonly HttpClient _httpClient;

    // Models tried in order on 503 overload
    private static readonly string[] FallbackChain = new[]
    {
        "gemini-flash-lite-latest",
        "gemini-3.8-flash"
    };

    public GeminiChatService(ProviderConfig provider, HttpClient httpClient)
    {
        _provider = provider;
        _httpClient = httpClient;
    }

    public async Task<string> SendAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        var apiKey = _provider.ApiKey?.Trim() ?? string.Empty;

        // Build the ordered list of models to try: requested first, then fallbacks
        var candidates = new List<string> { request.Model };
        foreach (var fb in FallbackChain)
        {
            if (!candidates.Contains(fb))
                candidates.Add(fb);
        }

        foreach (var modelId in candidates)
        {
            Console.WriteLine($"[GeminiChatService] Trying model: '{modelId}'");
            var result = await TrySendAsync(modelId, request, apiKey, cancellationToken);
            if (result.success)
                return result.text;

            // Only retry with fallback on 503 overload
            if (!result.isOverloaded)
                return result.text;

            Console.WriteLine($"[GeminiChatService] Model '{modelId}' overloaded, trying next fallback...");
        }

        return "Gemini is currently at capacity across all models. Please try again in a moment.";
    }

    private async Task<(bool success, bool isOverloaded, string text)> TrySendAsync(
        string modelId, ChatRequest request, string apiKey, CancellationToken cancellationToken)
    {
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{modelId}:generateContent?key={apiKey}";

        var contents = request.Messages.Select(m =>
        {
            var partsList = new List<object>();
            if (!string.IsNullOrWhiteSpace(m.Content))
            {
                partsList.Add(new { text = m.Content });
            }

            if (m.Attachments != null)
            {
                foreach (var att in m.Attachments)
                {
                    if (att.Type == "image" || att.Data.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
                    {
                        var commaIdx = att.Data.IndexOf(',');
                        var base64Part = commaIdx >= 0 ? att.Data.Substring(commaIdx + 1) : att.Data;
                        var mime = "image/png";
                        if (att.Data.StartsWith("data:") && commaIdx > 5)
                        {
                            var header = att.Data.Substring(5, commaIdx - 5);
                            var semi = header.IndexOf(';');
                            if (semi > 0) mime = header.Substring(0, semi);
                        }

                        partsList.Add(new
                        {
                            inline_data = new
                            {
                                mime_type = mime,
                                data = base64Part
                            }
                        });
                    }
                    else
                    {
                        partsList.Add(new
                        {
                            text = $"\n--- File Attachment: {att.Name} ---\n{att.Data}\n--- End File ---"
                        });
                    }
                }
            }

            if (partsList.Count == 0)
            {
                partsList.Add(new { text = " " });
            }

            return new
            {
                role = m.Role == "assistant" ? "model" : "user",
                parts = partsList
            };
        }).ToList();

        var payload = new Dictionary<string, object>
        {
            ["contents"] = contents
        };

        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
        {
            payload["system_instruction"] = new
            {
                parts = new[] { new { text = request.SystemPrompt } }
            };
        }

        // Enable Google Search grounding for real-time internet access
        payload["tools"] = new[]
        {
            new Dictionary<string, object>
            {
                ["google_search"] = new Dictionary<string, object>()
            }
        };

        var genConfig = new Dictionary<string, object>();
        if (request.Temperature > 0)
        {
            genConfig["temperature"] = request.Temperature;
        }
        if (request.MaxTokens > 0)
        {
            genConfig["maxOutputTokens"] = request.MaxTokens;
        }

        if (genConfig.Count > 0)
        {
            payload["generationConfig"] = genConfig;
        }

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            httpRequest.Headers.TryAddWithoutValidation("x-goog-api-key", apiKey);
        }

        try
        {
            using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var statusCode = (int)response.StatusCode;
                // Retry on overload (503) or rate-limit/quota (429)
                var shouldRetry = statusCode == 503 || statusCode == 429;
                var errorText = $"Gemini request failed: {response.StatusCode}. Details: {content}";
                return (false, shouldRetry, errorText);
            }

            using var json = JsonDocument.Parse(content);

            // Extract main answer text
            var candidateEl = json.RootElement.GetProperty("candidates")[0];
            var text = candidateEl
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? string.Empty;

            // Append grounding sources if Google Search was used
            if (json.RootElement.TryGetProperty("candidates", out var cands) &&
                cands[0].TryGetProperty("groundingMetadata", out var meta) &&
                meta.TryGetProperty("groundingChunks", out var chunks))
            {
                var sources = new List<string>();
                foreach (var chunk in chunks.EnumerateArray())
                {
                    if (chunk.TryGetProperty("web", out var web) &&
                        web.TryGetProperty("uri", out var uri) &&
                        web.TryGetProperty("title", out var title))
                    {
                        sources.Add($"- [{title.GetString()}]({uri.GetString()})");
                    }
                }

                if (sources.Count > 0)
                {
                    text += "\n\n---\n**🌐 Sources (Google Search):**\n" + string.Join("\n", sources);
                }
            }

            return (true, false, text);
        }
        catch (Exception ex)
        {
            return (false, false, $"Gemini provider error: {ex.Message}");
        }
    }
}
