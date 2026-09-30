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

        IChatService providerService;
        try
        {
            providerService = _factory.Create(request.Provider, request.ApiKey, request.BaseUrl);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }

        Console.WriteLine($"[ChatController] Dispatching to provider: '{request.Provider}', model: '{request.Model}'");
        var response = await providerService.SendAsync(request, cancellationToken);
        return Ok(new { response, provider = request.Provider, model = request.Model });
    }
}
