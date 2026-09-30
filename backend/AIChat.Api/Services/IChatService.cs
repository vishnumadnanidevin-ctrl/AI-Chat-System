using AIChat.Api.Models;

namespace AIChat.Api.Services;

public interface IChatService
{
    Task<string> SendAsync(ChatRequest request, CancellationToken cancellationToken = default);
}
