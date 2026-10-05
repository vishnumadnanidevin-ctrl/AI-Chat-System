using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AIChat.Api.Models;
using AIChat.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AIChat.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    public class GoogleAuthRequest
    {
        public string? IdToken { get; set; }
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleAuthRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.IdToken))
        {
            return BadRequest(new { error = "Google ID token is required." });
        }

        try
        {
            var payload = await _authService.ValidateGoogleTokenAsync(request.IdToken);

            if (!_authService.IsEmailAllowed(payload.Email))
            {
                _logger.LogWarning("Access denied for email: {Email} (not in allowed list)", payload.Email);
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Access restricted: email or domain not authorized." });
            }

            var user = await _authService.GetOrCreateUserAsync(payload);

            if (!user.IsActive)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = "Your account has been deactivated." });
            }

            var token = _authService.GenerateJwtToken(user, out var jti, out var expiresAt);

            // Set httpOnly cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = expiresAt,
                Path = "/"
            };
            Response.Cookies.Append("ai_hub_session", token, cookieOptions);

            var (remainingQuota, totalLimit) = await _authService.GetUserQuotaAsync(user.Id);

            return Ok(new
            {
                token,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    name = user.Name,
                    pictureUrl = user.PictureUrl,
                    role = user.Role,
                    quota = new
                    {
                        remaining = remainingQuota,
                        limit = totalLimit
                    }
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed Google authentication");
            return BadRequest(new { error = "Google authentication failed: " + ex.Message });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { error = "Invalid session." });
        }

        var user = await _authService.GetUserByIdAsync(userId);
        if (user == null || !user.IsActive)
        {
            return Unauthorized(new { error = "User not found or inactive." });
        }

        var (remainingQuota, totalLimit) = await _authService.GetUserQuotaAsync(user.Id);

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            name = user.Name,
            pictureUrl = user.PictureUrl,
            role = user.Role,
            quota = new
            {
                remaining = remainingQuota,
                limit = totalLimit
            }
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        var jti = User.FindFirstValue(JwtRegisteredClaimNames.Jti);
        var expClaim = User.FindFirstValue("exp");

        if (!string.IsNullOrWhiteSpace(jti) && !string.IsNullOrWhiteSpace(userId))
        {
            var expiresAt = DateTime.UtcNow.AddHours(8);
            if (long.TryParse(expClaim, out var expSeconds))
            {
                expiresAt = DateTimeOffset.FromUnixTimeSeconds(expSeconds).UtcDateTime;
            }
            await _authService.RevokeTokenAsync(jti, userId, expiresAt);
        }

        // Clear the cookie
        Response.Cookies.Delete("ai_hub_session", new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });

        return Ok(new { message = "Logged out successfully." });
    }
}
