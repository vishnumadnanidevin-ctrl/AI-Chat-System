using AIChat.Api.Config;
using AIChat.Api.Models;
using AIChat.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AIChat.Api.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly ChatServiceFactory _factory;

    public ChatController(ChatServiceFactory factory)
    {
        _factory = factory;
    }

    [HttpGet("models")]
    public IActionResult GetModels()
    {
        var providers = _factory.GetAvailableModels();
        return Ok(new { providers });
    }

    [HttpPost]
    public async Task<IActionResult> PostAsync([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest("Request body is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Provider))
        {
            request.Provider = "OpenAI";
        }

        if (string.IsNullOrWhiteSpace(request.Model))
        {
            var provider = _factory.GetAvailableModels()
                .FirstOrDefault(x => x.Provider == request.Provider);

            request.Model = provider?.Models.FirstOrDefault()?.Id ?? "gemini-3.8-flash";
        }

        // Intelligent Auto-Routing: If the requested provider does not have an API key configured,
        // automatically route the model through the active OpenRouter gateway (or Gemini) so all models work seamlessly
        var availableConfig = _factory.GetProviderConfig(request.Provider);
        var effectiveProvider = request.Provider;
        var effectiveModel = request.Model;

        if ((availableConfig == null || (availableConfig.RequiresApiKey && string.IsNullOrWhiteSpace(availableConfig.ApiKey) && string.IsNullOrWhiteSpace(request.ApiKey))))
        {
            // Route seamlessly through the active high-capacity free tier model (Qwen 3.8 27B)
            effectiveProvider = "OpenRouter";
            effectiveModel = "qwen/qwen3.8-27b:free";
            Console.WriteLine($"[ChatController] Unkeyed provider '{request.Provider}' auto-routed to free tier '{effectiveProvider}:{effectiveModel}'");
        }

        IChatService providerService;
        try
        {
            providerService = _factory.Create(effectiveProvider, request.ApiKey, request.BaseUrl);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }

        var executionRequest = new ChatRequest
        {
            Provider = effectiveProvider,
            Model = effectiveModel,
            ApiKey = request.ApiKey,
            BaseUrl = request.BaseUrl,
            SystemPrompt = request.SystemPrompt,
            Messages = request.Messages,
            Temperature = request.Temperature,
            MaxTokens = request.MaxTokens
        };

        Console.WriteLine($"[ChatController] Dispatching to provider: '{effectiveProvider}', model: '{effectiveModel}'");
        var response = await providerService.SendAsync(executionRequest, cancellationToken);
        return Ok(new { response, provider = effectiveProvider, model = effectiveModel });
    }
}
