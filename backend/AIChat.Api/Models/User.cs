using System.ComponentModel.DataAnnotations;

namespace AIChat.Api.Models;

public class User
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    [Required]
    public string GoogleSubjectId { get; set; } = string.Empty;

    [Required]
    public string Email { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? PictureUrl { get; set; }

    public string Role { get; set; } = "User";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    // Per-user daily request tracking
    public int RequestsUsedToday { get; set; } = 0;

    public DateTime LastRequestDate { get; set; } = DateTime.UtcNow.Date;
}
