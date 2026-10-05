namespace AIChat.Api.Config;

public class AuthSettings
{
    public string GoogleClientId { get; set; } = string.Empty;
    public string JwtKey { get; set; } = "AIHub_Super_Secret_Jwt_Key_For_Developer_Environment_Min_32_Chars!";
    public string JwtIssuer { get; set; } = "AIHubApi";
    public string JwtAudience { get; set; } = "AIHubClient";
    public int JwtExpiryHours { get; set; } = 8;
    public int DailyRequestsLimit { get; set; } = 50;
    public List<string> AllowedDomains { get; set; } = new();
    public List<string> AllowedEmails { get; set; } = new();
}
