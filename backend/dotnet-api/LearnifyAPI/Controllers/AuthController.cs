using System.Net.Http.Json;
using System.Text.Json;
using FirebaseAdmin.Auth;
using LearnifyAPI.Models.DTO;
using LearnifyAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace LearnifyAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly SupabaseUserService _supabaseUserService;

    public AuthController(
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        SupabaseUserService supabaseUserService)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _supabaseUserService = supabaseUserService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto req)
    {
        Console.WriteLine("Received /register request:");
        Console.WriteLine($"  Full Name: {req.FullName}");
        Console.WriteLine($"  Email:     {req.Email}");

        var args = new UserRecordArgs
        {
            Email = req.Email,
            Password = req.Password,
            DisplayName = req.FullName,
        };

        UserRecord? userRecord = null;

        try
        {
            userRecord = await FirebaseAuth.DefaultInstance.CreateUserAsync(args);
            Console.WriteLine($"  Created Firebase user with UID: {userRecord.Uid}");
        }
        catch (FirebaseAuthException ex)
        {
            Console.WriteLine($"  Firebase error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }

        // The Firebase UID becomes the primary key for this user's Supabase
        // row, so the two records are tied together with no separate mapping
        // table needed.
        try
        {
            var userDetails = await _supabaseUserService.CreateAsync(userRecord.Uid, new CreateUserDetailsDto
            {
                FullName = req.FullName,
                Email = req.Email
            });

            // Registering only creates the account — the client still needs an
            // ID token to call any authenticated endpoint (like saving more
            // profile fields right after signup), so sign the new user in
            // immediately rather than making them submit the login form again.
            var signIn = await SignInWithFirebaseAsync(req.Email, req.Password);
            if (signIn is null)
            {
                Console.WriteLine("  Warning: account created but immediate sign-in failed.");
            }

            return Ok(new
            {
                uid = userRecord.Uid,
                email = userRecord.Email,
                fullName = userRecord.DisplayName,
                idToken = signIn?.IdToken,
                refreshToken = signIn?.RefreshToken,
                expiresIn = signIn?.ExpiresIn,
                profile = userDetails
            });
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error, rolling back Firebase user: {ex.Message}");

            // Don't leave a Firebase Auth account with no matching profile row.
            try
            {
                await FirebaseAuth.DefaultInstance.DeleteUserAsync(userRecord.Uid);
            }
            catch (Exception cleanupEx)
            {
                Console.WriteLine($"  Failed to roll back Firebase user {userRecord.Uid}: {cleanupEx.Message}");
            }

            return StatusCode(500, new { message = "Failed to create user profile. Please try registering again." });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto req)
    {
        Console.WriteLine("Received /login request:");
        Console.WriteLine($"  Email: {req.Email}");

        if (!req.Email.Contains('@'))
        {
            return BadRequest(new { message = "Please enter a valid email." });
        }

        var signIn = await SignInWithFirebaseAsync(req.Email, req.Password);
        if (signIn is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        Console.WriteLine($"  Login success. UID: {signIn.LocalId}");

        // Every login now loads the caller's profile row from Supabase too,
        // instead of handing back just { uid, email } and leaving the
        // frontend to make a second round trip before it has anything to
        // show. If the profile fetch itself fails, the login still succeeds
        // — the client can retry loading the profile separately — but we
        // log it so it's visible server-side.
        UserDetailsDto? profile = null;
        try
        {
            profile = await _supabaseUserService.GetByIdAsync(signIn.LocalId);
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error while loading profile on login: {ex.Message}");
        }

        return Ok(new
        {
            uid = signIn.LocalId,
            email = signIn.Email,
            idToken = signIn.IdToken,
            refreshToken = signIn.RefreshToken,
            expiresIn = signIn.ExpiresIn,
            profile
        });
    }

    public record RefreshRequest(string RefreshToken);

    // POST /api/auth/refresh
    // Firebase ID tokens expire after exactly 1 hour — this is what lets a
    // session outlive that without forcing a re-login. The frontend calls
    // this proactively (see authApi.js's getValidIdToken) whenever the
    // stored token is close to expiring, using the refreshToken that came
    // back from the original login/register.
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
        {
            return BadRequest(new { message = "Missing refresh token." });
        }

        var apiKey = _config["Firebase:WebApiKey"];
        var url = $"https://securetoken.googleapis.com/v1/token?key={apiKey}";

        var client = _httpClientFactory.CreateClient();

        // This endpoint wants x-www-form-urlencoded, not JSON — unlike
        // every other Firebase REST call this controller makes.
        var response = await client.PostAsync(url, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = req.RefreshToken,
        }));

        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            // Most common cause: the refresh token itself was revoked
            // (password changed, account disabled, or it's just very old).
            // Either way there's no path back to a valid session without
            // the person logging in again.
            Console.WriteLine($"  Firebase token refresh failed: {body}");
            return Unauthorized(new { message = "Your session has expired. Please log in again." });
        }

        var refreshed = JsonSerializer.Deserialize<FirebaseRefreshResponseDto>(
            body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (refreshed is null || string.IsNullOrEmpty(refreshed.IdToken))
        {
            return StatusCode(502, new { message = "Couldn't refresh the session — unreadable response from Firebase." });
        }

        return Ok(new
        {
            uid = refreshed.UserId,
            idToken = refreshed.IdToken,
            refreshToken = refreshed.RefreshToken,
            expiresIn = refreshed.ExpiresIn,
        });
    }

    // Shared by Login and Register (Register calls it right after creating
    // the account so the client gets a usable ID token without a second
    // form submission). Returns null on bad credentials/HTTP failure rather
    // than throwing, so callers can turn that into the right status code.
    private async Task<FirebaseLoginResponseDto?> SignInWithFirebaseAsync(string email, string password)
    {
        var apiKey = _config["Firebase:WebApiKey"];
        var url = $"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={apiKey}";

        var client = _httpClientFactory.CreateClient();
        var response = await client.PostAsJsonAsync(url, new
        {
            email,
            password,
            returnSecureToken = true
        });

        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"  Firebase sign-in failed: {body}");
            return null;
        }

        return JsonSerializer.Deserialize<FirebaseLoginResponseDto>(
            body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }
}
