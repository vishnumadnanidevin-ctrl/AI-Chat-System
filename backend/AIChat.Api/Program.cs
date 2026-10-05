using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using AIChat.Api.Config;
using AIChat.Api.Data;
using AIChat.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Controllers & Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuration Settings
var authSettingsSection = builder.Configuration.GetSection("AuthSettings");
var authSettings = authSettingsSection.Get<AuthSettings>() ?? new AuthSettings();
builder.Services.Configure<AuthSettings>(authSettingsSection);

// Database Context (SQLite)
var dbPath = Path.Combine(builder.Environment.ContentRootPath, "aichat.db");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Auth & Chat Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ChatServiceFactory>();

// Configure CORS for dev and LAN origins with credentials
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            var uri = new Uri(origin);
            return uri.Host == "localhost" ||
                   uri.Host == "127.0.0.1" ||
                   uri.Host.StartsWith("192.168.") ||
                   uri.Host.StartsWith("10.") ||
                   uri.Host.StartsWith("172.");
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// Configure JWT Bearer Authentication (supports both Bearer header and httpOnly cookie)
var jwtKey = Encoding.UTF8.GetBytes(authSettings.JwtKey);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(jwtKey),
        ValidateIssuer = !string.IsNullOrWhiteSpace(authSettings.JwtIssuer),
        ValidIssuer = authSettings.JwtIssuer,
        ValidateAudience = !string.IsNullOrWhiteSpace(authSettings.JwtAudience),
        ValidAudience = authSettings.JwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(5)
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // If Authorization header is missing, attempt to extract JWT from httpOnly cookie
            if (string.IsNullOrEmpty(context.Token))
            {
                if (context.Request.Cookies.TryGetValue("ai_hub_session", out var cookieToken))
                {
                    context.Token = cookieToken;
                }
            }
            return Task.CompletedTask;
        },
        OnTokenValidated = async context =>
        {
            // Check if token has been revoked / logged out
            var authService = context.HttpContext.RequestServices.GetRequiredService<AuthService>();
            var jti = context.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
            if (!string.IsNullOrWhiteSpace(jti) && await authService.IsTokenRevokedAsync(jti))
            {
                context.Fail("Token has been revoked.");
            }
        }
    };
});

builder.Services.AddAuthorization();

// Rate limiting for /api/auth/*
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("AuthRateLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 15,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
});

builder.Services.Configure<AIProviderSettings>(options =>
{
    builder.Configuration.GetSection("AIProviders").Bind(options.Providers);
    var envKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    if (!string.IsNullOrWhiteSpace(envKey) && options.Providers.ContainsKey("Gemini"))
    {
        options.Providers["Gemini"].ApiKey = envKey;
    }
});

var app = builder.Build();

// Ensure Database is created and migrations/schema are up to date
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseRouting();

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireRateLimiting("AuthRateLimit");

app.Run();
