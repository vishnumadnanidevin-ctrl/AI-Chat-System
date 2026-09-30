using AIChat.Api.Config;
using AIChat.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.Configure<AIProviderSettings>(options =>
{
    builder.Configuration.GetSection("AIProviders").Bind(options.Providers);
    // Also support direct environment variable or fallback
    var envKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    if (!string.IsNullOrWhiteSpace(envKey) && options.Providers.ContainsKey("Gemini"))
    {
        options.Providers["Gemini"].ApiKey = envKey;
    }
});

builder.Services.AddHttpClient();
builder.Services.AddSingleton<ChatServiceFactory>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseRouting();
app.MapControllers();

app.Run();
