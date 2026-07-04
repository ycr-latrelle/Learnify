using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using LearnifyAPI.Models.DTO;

namespace LearnifyAPI.Services;

// Talks to Supabase's auto-generated REST API (PostgREST) for the
// "user_details" table. Uses the service role key, so this must only ever
// be called from the server — never expose this key to the frontend.
public class SupabaseUserService
{
    private readonly HttpClient _client;
    private readonly string _baseUrl;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public SupabaseUserService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _client = httpClientFactory.CreateClient();

        var url = config["Supabase:Url"]
            ?? throw new InvalidOperationException("Supabase:Url is not configured.");
        var serviceRoleKey = config["Supabase:ServiceRoleKey"]
            ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is not configured.");

        _baseUrl = $"{url.TrimEnd('/')}/rest/v1/user_details";

        _client.DefaultRequestHeaders.Add("apikey", serviceRoleKey);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", serviceRoleKey);
    }

    // Inserts a new row. "id" is the Firebase UID — this is what ties the
    // Supabase profile to the Firebase Auth user.
    public async Task<UserDetailsDto?> CreateAsync(string uid, CreateUserDetailsDto details)
    {
        var payload = new Dictionary<string, object?>
        {
            ["id"] = uid,
            ["full_name"] = details.FullName,
            ["email"] = details.Email,
            ["bio"] = details.Bio,
            ["avatar_url"] = details.AvatarUrl,
            ["dob"] = details.Dob,
            ["gender"] = details.Gender,
            ["university"] = details.University,
            ["course"] = details.Course,
        };

        var request = new HttpRequestMessage(HttpMethod.Post, _baseUrl)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        // Ask PostgREST to hand back the row it just created.
        request.Headers.Add("Prefer", "return=representation");

        var response = await _client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new SupabaseRequestException(response.StatusCode, body);

        var rows = JsonSerializer.Deserialize<List<UserDetailsDto>>(body, _jsonOptions);
        return rows?.FirstOrDefault();
    }

    public async Task<UserDetailsDto?> GetByIdAsync(string uid)
    {
        var url = $"{_baseUrl}?id=eq.{Uri.EscapeDataString(uid)}&select=*";
        var response = await _client.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new SupabaseRequestException(response.StatusCode, body);

        var rows = JsonSerializer.Deserialize<List<UserDetailsDto>>(body, _jsonOptions);
        return rows?.FirstOrDefault();
    }

    public async Task<UserDetailsDto?> UpdateAsync(string uid, UpdateUserDetailsDto details)
    {
        // Only include fields that were actually provided, so a PATCH with
        // just "bio" set doesn't overwrite full_name/avatar_url with null.
        var payload = new Dictionary<string, object?>();
        if (details.FullName is not null) payload["full_name"] = details.FullName;
        if (details.Bio is not null) payload["bio"] = details.Bio;
        if (details.AvatarUrl is not null) payload["avatar_url"] = details.AvatarUrl;
        if (details.Dob is not null) payload["dob"] = details.Dob;
        if (details.Gender is not null) payload["gender"] = details.Gender;
        if (details.University is not null) payload["university"] = details.University;
        if (details.Course is not null) payload["course"] = details.Course;

        var url = $"{_baseUrl}?id=eq.{Uri.EscapeDataString(uid)}";
        var request = new HttpRequestMessage(HttpMethod.Patch, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Prefer", "return=representation");

        var response = await _client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new SupabaseRequestException(response.StatusCode, body);

        var rows = JsonSerializer.Deserialize<List<UserDetailsDto>>(body, _jsonOptions);
        return rows?.FirstOrDefault();
    }
}

public class SupabaseRequestException(System.Net.HttpStatusCode statusCode, string body)
    : Exception($"Supabase request failed ({(int)statusCode}): {body}")
{
    public System.Net.HttpStatusCode StatusCode { get; } = statusCode;
}