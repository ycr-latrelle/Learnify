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
}