using System.Security.Claims;
using AIChat.Api.Config;
using AIChat.Api.Models;
using AIChat.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AIChat.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly ChatServiceFactory _factory;
    private readonly AuthService _authService;

    public ChatController(ChatServiceFactory factory, AuthService authService)
    {
        _factory = factory;
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpGet("models")]
    public IActionResult GetModels()
    {
        var providers = _factory.GetAvailableModels();
        return Ok(new { providers });
    }

    [HttpPost]
    public async Task<IActionResult> PostAsync([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!string.IsNullOrWhiteSpace(userId))
        {
            var (allowed, remaining, limit) = await _authService.CheckAndIncrementDailyQuotaAsync(userId);
            if (!allowed)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, new 
                { 
                    error = $"Daily request limit of {limit} requests reached. Quota resets at 00:00 UTC.",
                    quota = new { remaining, limit }
                });
            }
        }
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

        // If Gemini or other provider returned an API key invalid or authorization error, auto-fallback to free tier
        if (response.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase) ||
            response.Contains("API key not valid", StringComparison.OrdinalIgnoreCase) ||
            response.Contains("401 Unauthorized", StringComparison.OrdinalIgnoreCase) ||
            response.Contains("403 Forbidden", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine($"[ChatController] Provider '{effectiveProvider}' encountered key error. Auto-fallback to OpenRouter free model...");
            try
            {
                var fallbackService = _factory.Create("OpenRouter", null, null);
                var fallbackRequest = new ChatRequest
                {
                    Provider = "OpenRouter",
                    Model = "qwen/qwen3.8-27b:free",
                    Messages = request.Messages,
                    SystemPrompt = request.SystemPrompt,
                    Temperature = request.Temperature,
                    MaxTokens = request.MaxTokens
                };
                response = await fallbackService.SendAsync(fallbackRequest, cancellationToken);
                effectiveProvider = "OpenRouter";
                effectiveModel = "qwen/qwen3.8-27b:free";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ChatController] Fallback failed: {ex.Message}");
            }
        }

        return Ok(new { response, provider = effectiveProvider, model = effectiveModel });
    }
}
