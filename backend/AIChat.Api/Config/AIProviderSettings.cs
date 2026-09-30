namespace AIChat.Api.Config;

public class AIProviderSettings
{
    public Dictionary<string, ProviderConfig> Providers { get; set; } = new();
}

public class ProviderConfig
{
    public bool Enabled { get; set; } = true;
    public bool RequiresApiKey { get; set; } = true;
    public string Type { get; set; } = "OpenAICompatible";
    public string Description { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public List<string> Models { get; set; } = new();
}
