using System.ComponentModel.DataAnnotations;

namespace AIChat.Api.Models;

public class RevokedToken
{
    [Key]
    public string TokenId { get; set; } = string.Empty; // Jti or token signature

    public string UserId { get; set; } = string.Empty;

    public DateTime RevokedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; }
}
