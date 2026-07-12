using System.Text.Json.Serialization;

namespace LearnifyAPI.Models.DTO;

public class FirebaseLoginResponseDto
{
    [JsonPropertyName("localId")]
    public string LocalId { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("idToken")]
    public string IdToken { get; set; } = string.Empty;

    [JsonPropertyName("refreshToken")]
    public string RefreshToken { get; set; } = string.Empty;

    // Firebase returns this as a string ("3600"), not a number — that's
    // the Identity Toolkit REST API's own quirk, not a typo here.
    [JsonPropertyName("expiresIn")]
    public string ExpiresIn { get; set; } = string.Empty;
}

// Shape of https://securetoken.googleapis.com/v1/token's response — this
// endpoint (used to refresh an expired idToken) uses snake_case field
// names, unlike signInWithPassword's camelCase above, so it gets its own
// small DTO rather than trying to reuse FirebaseLoginResponseDto for both.
public class FirebaseRefreshResponseDto
{
    [JsonPropertyName("id_token")]
    public string IdToken { get; set; } = string.Empty;

    [JsonPropertyName("refresh_token")]
    public string RefreshToken { get; set; } = string.Empty;

    [JsonPropertyName("expires_in")]
    public string ExpiresIn { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;
}