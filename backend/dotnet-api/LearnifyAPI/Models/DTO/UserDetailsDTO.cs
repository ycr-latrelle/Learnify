using System.Text.Json.Serialization;

namespace LearnifyAPI.Models.DTO;

// Sent by the client when creating a profile right after Firebase registration.
// "Id" is deliberately NOT included here — it always comes from the Firebase UID
// on the server side, never from client input, so a caller can't write another
// user's row by passing a different id.
public class CreateUserDetailsDto
{
    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("bio")]
    public string? Bio { get; set; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("dob")]
    public string? Dob { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("university")]
    public string? University { get; set; }

    [JsonPropertyName("course")]
    public string? Course { get; set; }
}

// Sent by the client when updating an existing profile. All fields optional
// so callers can patch just one field without clobbering the rest.
public class UpdateUserDetailsDto
{
    [JsonPropertyName("full_name")]
    public string? FullName { get; set; }

    [JsonPropertyName("bio")]
    public string? Bio { get; set; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("dob")]
    public string? Dob { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("university")]
    public string? University { get; set; }

    [JsonPropertyName("course")]
    public string? Course { get; set; }
}

// What we return to the client and what we deserialize Supabase's response into.
// Property names map to the user_details table's column names.
public class UserDetailsDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty; // Firebase UID

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("bio")]
    public string? Bio { get; set; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("dob")]
    public string? Dob { get; set; }

    [JsonPropertyName("gender")]
    public string? Gender { get; set; }

    [JsonPropertyName("university")]
    public string? University { get; set; }

    [JsonPropertyName("course")]
    public string? Course { get; set; }

    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }
}

// A profile row plus how the caller currently relates to that person, so
// the frontend can render the right button ("Add Friend" vs "Request
// Sent") without a second round trip per row.
public class UserSearchResultDto : UserDetailsDto
{
    // "none" | "pending_outgoing" — people who already have an incoming
    // request from the caller are excluded from search results entirely
    // (they show up in the Friend Requests list instead), so those two
    // values are the only ones this endpoint returns.
    [JsonPropertyName("relationship_status")]
    public string RelationshipStatus { get; set; } = "none";
}

// A pending incoming friend request, shown in the Friend Requests list.
public class FriendRequestDto
{
    // The requester's Firebase UID — pass this back to the accept/decline
    // endpoints.
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("university")]
    public string? University { get; set; }

    [JsonPropertyName("course")]
    public string? Course { get; set; }

    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; set; }
}