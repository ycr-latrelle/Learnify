using System.Security.Claims;
using System.Text.Encodings.Web;
using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LearnifyAPI.Authentication;

public class FirebaseAuthenticationOptions : AuthenticationSchemeOptions
{
}

// Verifies the Firebase ID token sent as "Authorization: Bearer <idToken>"
// on every request and turns it into a ClaimsPrincipal whose
// NameIdentifier claim is the caller's Firebase UID. Controllers use this
// UID (not anything the client sends in the body/route) to decide what the
// caller is allowed to read or write.
public class FirebaseAuthenticationHandler : AuthenticationHandler<FirebaseAuthenticationOptions>
{
    public const string SchemeName = "FirebaseBearer";

    public FirebaseAuthenticationHandler(
        IOptionsMonitor<FirebaseAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return AuthenticateResult.NoResult();

        var headerValue = authHeader.ToString();
        if (!headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var idToken = headerValue["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(idToken))
            return AuthenticateResult.Fail("Missing bearer token.");

        try
        {
            var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, decoded.Uid),
            };

            if (decoded.Claims.TryGetValue("email", out var email) && email is not null)
                claims.Add(new Claim(ClaimTypes.Email, email.ToString()!));

            var identity = new ClaimsIdentity(claims, SchemeName);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, SchemeName);

            return AuthenticateResult.Success(ticket);
        }
        catch (FirebaseAuthException ex)
        {
            Logger.LogWarning("Firebase token verification failed: {Message}", ex.Message);
            return AuthenticateResult.Fail("Invalid or expired token.");
        }
    }
}
