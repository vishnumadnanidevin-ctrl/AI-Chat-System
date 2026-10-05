using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AIChat.Api.Config;
using AIChat.Api.Data;
using AIChat.Api.Models;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AIChat.Api.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly AuthSettings _authSettings;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AppDbContext db, IOptions<AuthSettings> authSettings, ILogger<AuthService> logger)
    {
        _db = db;
        _authSettings = authSettings.Value;
        _logger = logger;
    }

    public async Task<GoogleJsonWebSignature.Payload> ValidateGoogleTokenAsync(string idToken)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings();
        if (!string.IsNullOrWhiteSpace(_authSettings.GoogleClientId))
        {
            settings.Audience = new[] { _authSettings.GoogleClientId };
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            return payload;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google ID token validation failed.");
            throw;
        }
    }

    public bool IsEmailAllowed(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;

        var allowedEmails = _authSettings.AllowedEmails;
        var allowedDomains = _authSettings.AllowedDomains;

        // If no restrictions are configured, allow all
        if ((allowedEmails == null || allowedEmails.Count == 0) &&
            (allowedDomains == null || allowedDomains.Count == 0))
        {
            return true;
        }

        var lowerEmail = email.Trim().ToLowerInvariant();

        if (allowedEmails != null && allowedEmails.Any(e => e.Trim().ToLowerInvariant() == lowerEmail))
        {
            return true;
        }

        if (allowedDomains != null)
        {
            var domain = lowerEmail.Contains('@') ? lowerEmail.Split('@')[1] : "";
            if (allowedDomains.Any(d => d.Trim().TrimStart('@').ToLowerInvariant() == domain))
            {
                return true;
            }
        }

        return false;
    }

    public async Task<User> GetOrCreateUserAsync(GoogleJsonWebSignature.Payload payload)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleSubjectId == payload.Subject || u.Email == payload.Email);

        if (user == null)
        {
            user = new User
            {
                GoogleSubjectId = payload.Subject,
                Email = payload.Email,
                Name = payload.Name ?? payload.Email,
                PictureUrl = payload.Picture,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow,
                IsActive = true,
                RequestsUsedToday = 0,
                LastRequestDate = DateTime.UtcNow.Date
            };
            _db.Users.Add(user);
        }
        else
        {
            user.GoogleSubjectId = payload.Subject;
            user.Name = payload.Name ?? user.Name;
            user.PictureUrl = payload.Picture ?? user.PictureUrl;
            user.LastLoginAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return user;
    }

    public string GenerateJwtToken(User user, out string jti, out DateTime expiresAt)
    {
        jti = Guid.NewGuid().ToString("N");
        expiresAt = DateTime.UtcNow.AddHours(_authSettings.JwtExpiryHours > 0 ? _authSettings.JwtExpiryHours : 8);

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_authSettings.JwtKey);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name ?? user.Email),
            new Claim(ClaimTypes.Role, user.Role ?? "User")
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = _authSettings.JwtIssuer,
            Audience = _authSettings.JwtAudience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public async Task<bool> IsTokenRevokedAsync(string jti)
    {
        if (string.IsNullOrWhiteSpace(jti)) return true;
        return await _db.RevokedTokens.AnyAsync(r => r.TokenId == jti);
    }

    public async Task RevokeTokenAsync(string jti, string userId, DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(jti)) return;

        var existing = await _db.RevokedTokens.FindAsync(jti);
        if (existing == null)
        {
            _db.RevokedTokens.Add(new RevokedToken
            {
                TokenId = jti,
                UserId = userId,
                RevokedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt > DateTime.UtcNow ? expiresAt : DateTime.UtcNow.AddHours(8)
            });
            await _db.SaveChangesAsync();
        }
    }

    public async Task<User?> GetUserByIdAsync(string userId)
    {
        return await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<(bool Allowed, int Remaining, int Limit)> CheckAndIncrementDailyQuotaAsync(string userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return (false, 0, 0);

        var today = DateTime.UtcNow.Date;
        if (user.LastRequestDate.Date < today)
        {
            user.RequestsUsedToday = 0;
            user.LastRequestDate = today;
        }

        var limit = _authSettings.DailyRequestsLimit > 0 ? _authSettings.DailyRequestsLimit : 50;

        if (user.RequestsUsedToday >= limit)
        {
            return (false, 0, limit);
        }

        user.RequestsUsedToday++;
        await _db.SaveChangesAsync();

        var remaining = Math.Max(0, limit - user.RequestsUsedToday);
        return (true, remaining, limit);
    }

    public async Task<(int Remaining, int Limit)> GetUserQuotaAsync(string userId)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        var limit = _authSettings.DailyRequestsLimit > 0 ? _authSettings.DailyRequestsLimit : 50;
        if (user == null) return (0, limit);

        var today = DateTime.UtcNow.Date;
        var used = (user.LastRequestDate.Date == today) ? user.RequestsUsedToday : 0;
        var remaining = Math.Max(0, limit - used);
        return (remaining, limit);
    }
}
