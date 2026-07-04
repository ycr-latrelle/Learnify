using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using LearnifyAPI.Authentication;
using LearnifyAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// Render assigns a random port at runtime and expects the app to listen on
// it via the PORT env var — it does NOT use launchSettings.json's
// "applicationUrl" (that's dev-only, dotnet run reads it locally). Without
// this, the app binds to Kestrel's default (localhost:5000/5001, or
// whatever ASPNETCORE_URLS happens to be) and Render's health check can
// never reach it, so the deploy just times out.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Firebase must exist before the authentication handler can verify tokens
// against it, so this is created before the DI container is built rather
// than in the request pipeline below.
if (FirebaseApp.DefaultInstance == null)
{
    var serviceAccountPath = builder.Configuration["Firebase:ServiceAccountPath"]
        ?? throw new InvalidOperationException("Firebase:ServiceAccountPath is not configured.");

    FirebaseApp.Create(new AppOptions
    {
        Credential = GoogleCredential.FromFile(serviceAccountPath)
    });
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();
builder.Services.AddScoped<SupabaseUserService>();
builder.Services.AddScoped<FriendService>();
builder.Services.AddScoped<FirestoreMessagingService>();

// Every request's "Authorization: Bearer <firebaseIdToken>" header is
// verified by FirebaseAuthenticationHandler; controllers read the caller's
// UID from User.FindFirstValue(ClaimTypes.NameIdentifier) instead of
// trusting a uid supplied in the URL or body.
builder.Services
    .AddAuthentication(FirebaseAuthenticationHandler.SchemeName)
    .AddScheme<FirebaseAuthenticationOptions, FirebaseAuthenticationHandler>(
        FirebaseAuthenticationHandler.SchemeName, _ => { });
builder.Services.AddAuthorization();

// Allowed origins come from config (Cors:AllowedOrigins, comma-separated)
// instead of being hardcoded, so the same build works locally against
// Vite's dev server AND in production against the deployed Netlify site —
// set Cors__AllowedOrigins as an env var on Render rather than editing
// this file per environment.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"]
        ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Render terminates HTTPS at its edge/load balancer and forwards plain
// HTTP internally — UseHttpsRedirection() would otherwise see every
// request as "not HTTPS" and try to redirect it, which just loops. Only
// redirect when NOT running behind that kind of proxy (i.e. in local dev).
if (string.IsNullOrEmpty(port))
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();