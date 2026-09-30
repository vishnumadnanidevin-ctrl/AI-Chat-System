using System.Text.Json.Serialization;

namespace AIChat.Api.Models;

public class ChatMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

public class ModelOption
{
    [JsonPropertyName("provider")]
    public string Provider { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "OpenAICompatible";

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("isConfigured")]
    public bool IsConfigured { get; set; } = true;

    [JsonPropertyName("models")]
    public List<ModelDetail> Models { get; set; } = new();
}

public class ModelDetail
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = "General"; // Coding, Reasoning, Fast, Vision, Open-Source

    [JsonPropertyName("badge")]
    public string Badge { get; set; } = "Code"; // e.g. "Best for Code", "Fast", "Ultra Reasoning"

    [JsonPropertyName("contextWindow")]
    public string ContextWindow { get; set; } = "128k";
}

public class ChatRequest
{
    [JsonPropertyName("provider")]
    public string Provider { get; set; } = "Gemini";

    [JsonPropertyName("model")]
    public string Model { get; set; } = "gemini-3.8-flash";

    [JsonPropertyName("messages")]
    public List<ChatMessage> Messages { get; set; } = new();

    [JsonPropertyName("systemPrompt")]
    public string? SystemPrompt { get; set; }

    [JsonPropertyName("apiKey")]
    public string? ApiKey { get; set; }

    [JsonPropertyName("baseUrl")]
    public string? BaseUrl { get; set; }

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; } = 0.7;

    [JsonPropertyName("maxTokens")]
    public int MaxTokens { get; set; } = 2048;
}
