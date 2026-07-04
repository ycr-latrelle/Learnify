using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using LearnifyAPI.Models.DTO;

namespace LearnifyAPI.Services;

// Talks to Supabase's REST API for the "friendships" table (one row per
// friend request — see migration_friend_requests.sql) and reuses the
// "user_details" table to turn requester/addressee/search-match IDs into
// full profile rows. Uses the service role key, same as SupabaseUserService
// — this must only ever be called from the server.
public class FriendService
{
    private readonly HttpClient _client;
    private readonly string _friendshipsUrl;
    private readonly string _userDetailsUrl;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Mirrors the "friendships" table's snake_case columns — explicit
    // [JsonPropertyName] is required here because PropertyNameCaseInsensitive
    // only ignores case, it doesn't bridge "requester_id" to "RequesterId".
    private class FriendshipRow
    {
        [System.Text.Json.Serialization.JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("requester_id")]
        public string RequesterId { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("addressee_id")]
        public string AddresseeId { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("created_at")]
        public string? CreatedAt { get; set; }
    }

    public FriendService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _client = httpClientFactory.CreateClient();

        var url = config["Supabase:Url"]
            ?? throw new InvalidOperationException("Supabase:Url is not configured.");
        var serviceRoleKey = config["Supabase:ServiceRoleKey"]
            ?? throw new InvalidOperationException("Supabase:ServiceRoleKey is not configured.");

        _friendshipsUrl = $"{url.TrimEnd('/')}/rest/v1/friendships";
        _userDetailsUrl = $"{url.TrimEnd('/')}/rest/v1/user_details";

        _client.DefaultRequestHeaders.Add("apikey", serviceRoleKey);
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", serviceRoleKey);
    }

    // --- low-level helpers -------------------------------------------------

    private async Task<List<FriendshipRow>> GetRowsAsync(string filter)
    {
        var url = $"{_friendshipsUrl}?{filter}";
        var response = await _client.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new SupabaseRequestException(response.StatusCode, body);

        return JsonSerializer.Deserialize<List<FriendshipRow>>(body, _jsonOptions) ?? new();
    }

    private async Task<List<UserDetailsDto>> GetProfilesAsync(IEnumerable<string> ids)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return new List<UserDetailsDto>();

        var joined = string.Join(",", idList.Select(Uri.EscapeDataString));
        var url = $"{_userDetailsUrl}?id=in.({joined})&select=*";

        var response = await _client.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new SupabaseRequestException(response.StatusCode, body);

        return JsonSerializer.Deserialize<List<UserDetailsDto>>(body, _jsonOptions) ?? new();
    }

    // The single pending/accepted row between two people, if any, checked
    // in both directions since a request could have gone either way.
    private async Task<FriendshipRow?> GetRelationshipAsync(string uidA, string uidB)
    {
        var filter =
            $"or=(and(requester_id.eq.{Uri.EscapeDataString(uidA)},addressee_id.eq.{Uri.EscapeDataString(uidB)})," +
            $"and(requester_id.eq.{Uri.EscapeDataString(uidB)},addressee_id.eq.{Uri.EscapeDataString(uidA)}))";
        var rows = await GetRowsAsync(filter);
        return rows.FirstOrDefault();
    }

    // --- friends list --------------------------------------------------

    // The other person's UID for every accepted friendship `uid` is part of.
    public async Task<List<string>> GetFriendIdsAsync(string uid)
    {
        var filter = $"status=eq.accepted&or=(requester_id.eq.{Uri.EscapeDataString(uid)},addressee_id.eq.{Uri.EscapeDataString(uid)})&select=requester_id,addressee_id";
        var rows = await GetRowsAsync(filter);
        return rows.Select(r => r.RequesterId == uid ? r.AddresseeId : r.RequesterId).ToList();
    }

    public async Task<List<UserDetailsDto>> GetFriendsAsync(string uid)
    {
        var friendIds = await GetFriendIdsAsync(uid);
        var profiles = await GetProfilesAsync(friendIds);
        return profiles.OrderBy(p => p.FullName).ToList();
    }

    // --- incoming requests ----------------------------------------------

    public async Task<List<FriendRequestDto>> GetIncomingRequestsAsync(string uid)
    {
        var filter = $"status=eq.pending&addressee_id=eq.{Uri.EscapeDataString(uid)}&select=requester_id,created_at&order=created_at.desc";
        var rows = await GetRowsAsync(filter);
        if (rows.Count == 0) return new List<FriendRequestDto>();

        var profiles = await GetProfilesAsync(rows.Select(r => r.RequesterId));
        var byId = profiles.ToDictionary(p => p.Id);

        // Preserve request order (most recent first); skip any row whose
        // profile has since disappeared rather than throwing.
        return rows
            .Where(r => byId.ContainsKey(r.RequesterId))
            .Select(r =>
            {
                var p = byId[r.RequesterId];
                return new FriendRequestDto
                {
                    Id = p.Id,
                    FullName = p.FullName,
                    AvatarUrl = p.AvatarUrl,
                    University = p.University,
                    Course = p.Course,
                    CreatedAt = r.CreatedAt,
                };
            })
            .ToList();
    }

    // --- sending / responding ---------------------------------------------

    public enum SendRequestResult { Created, AlreadyPending, AlreadyFriends, AutoAccepted }

    // Creates a pending request from `uid` to `targetUid`. If `targetUid`
    // already sent *us* a pending request, this accepts theirs instead of
    // creating a redundant second row in the opposite direction — there's
    // no point making both people click separately when they both already
    // wanted to connect.
    public async Task<SendRequestResult> SendRequestAsync(string uid, string targetUid)
    {
        var existing = await GetRelationshipAsync(uid, targetUid);

        if (existing is not null)
        {
            if (existing.Status == "accepted")
                return SendRequestResult.AlreadyFriends;

            if (existing.Status == "pending" && existing.RequesterId == targetUid)
            {
                // They already requested us — accept it instead of duplicating.
                await UpdateStatusAsync(existing.Id, "accepted");
                return SendRequestResult.AutoAccepted;
            }

            if (existing.Status == "pending")
                return SendRequestResult.AlreadyPending;

            // A previously declined request between these two — let them
            // try again by falling through to create a fresh row below,
            // but first remove the old declined row (unique constraint on
            // the pair would otherwise block the insert).
            await DeleteRowAsync(existing.Id);
        }

        var payload = new Dictionary<string, object?>
        {
            ["requester_id"] = uid,
            ["addressee_id"] = targetUid,
            ["status"] = "pending",
        };

        var request = new HttpRequestMessage(HttpMethod.Post, _friendshipsUrl)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Prefer", "return=minimal");

        var response = await _client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new SupabaseRequestException(response.StatusCode, body);
        }

        return SendRequestResult.Created;
    }

    // Accepts or declines a pending request that `requesterUid` sent to
    // `currentUid`. Returns false if there's no such pending request to
    // act on (already handled, wrong direction, or never existed).
    public async Task<bool> RespondToRequestAsync(string currentUid, string requesterUid, bool accept)
    {
        var filter = $"status=eq.pending&requester_id=eq.{Uri.EscapeDataString(requesterUid)}&addressee_id=eq.{Uri.EscapeDataString(currentUid)}&select=id";
        var rows = await GetRowsAsync(filter);
        var row = rows.FirstOrDefault();
        if (row is null) return false;

        if (accept)
            await UpdateStatusAsync(row.Id, "accepted");
        else
            // Delete rather than mark "declined" so the requester is free
            // to send another request later without hitting the unique
            // pair constraint.
            await DeleteRowAsync(row.Id);

        return true;
    }

    private async Task UpdateStatusAsync(string rowId, string status)
    {
        var payload = new Dictionary<string, object?>
        {
            ["status"] = status,
            ["responded_at"] = DateTime.UtcNow.ToString("O"),
        };
        var url = $"{_friendshipsUrl}?id=eq.{Uri.EscapeDataString(rowId)}";
        var request = new HttpRequestMessage(HttpMethod.Patch, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Prefer", "return=minimal");

        var response = await _client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new SupabaseRequestException(response.StatusCode, body);
        }
    }

    private async Task DeleteRowAsync(string rowId)
    {
        var url = $"{_friendshipsUrl}?id=eq.{Uri.EscapeDataString(rowId)}";
        var response = await _client.DeleteAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new SupabaseRequestException(response.StatusCode, body);
        }
    }

    // Removes an existing accepted friendship between the two people, in
    // whichever direction the row was originally created. Returns false if
    // they weren't friends to begin with (nothing to remove).
    public async Task<bool> RemoveFriendAsync(string uid, string friendUid)
    {
        var existing = await GetRelationshipAsync(uid, friendUid);
        if (existing is null || existing.Status != "accepted") return false;

        await DeleteRowAsync(existing.Id);
        return true;
    }

    // --- search --------------------------------------------------------

    // Finds people whose name, university, or course matches `query`,
    // excluding the caller, existing friends, and anyone who already sent
    // *us* a pending request (they belong in the Friend Requests list
    // instead). People `uid` has already requested are included but
    // flagged "pending_outgoing" so the frontend can disable their button.
    public async Task<List<UserSearchResultDto>> SearchUsersAsync(string uid, string query, int limit = 20)
    {
        var relFilter = $"or=(requester_id.eq.{Uri.EscapeDataString(uid)},addressee_id.eq.{Uri.EscapeDataString(uid)})&select=requester_id,addressee_id,status";
        var relationships = await GetRowsAsync(relFilter);

        var friendIds = new HashSet<string>();
        var pendingOutgoingIds = new HashSet<string>();
        var pendingIncomingIds = new HashSet<string>();

        foreach (var r in relationships)
        {
            var other = r.RequesterId == uid ? r.AddresseeId : r.RequesterId;
            if (r.Status == "accepted") friendIds.Add(other);
            else if (r.Status == "pending" && r.RequesterId == uid) pendingOutgoingIds.Add(other);
            else if (r.Status == "pending" && r.AddresseeId == uid) pendingIncomingIds.Add(other);
        }

        // PostgREST treats "," and "*" as syntax inside an or=() filter, so
        // strip them from the caller's input rather than trying to escape
        // them — the user is searching plain names/courses, not writing a
        // filter expression.
        var safe = query.Replace(",", " ").Replace("*", " ").Trim();
        if (safe.Length == 0) return new List<UserSearchResultDto>();

        var or = $"full_name.ilike.*{safe}*,university.ilike.*{safe}*,course.ilike.*{safe}*";
        var url = $"{_userDetailsUrl}?or=({or})&select=*&limit={limit}";

        var response = await _client.GetAsync(url);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new SupabaseRequestException(response.StatusCode, body);

        var rows = JsonSerializer.Deserialize<List<UserDetailsDto>>(body, _jsonOptions) ?? new();

        return rows
            .Where(r => r.Id != uid && !friendIds.Contains(r.Id) && !pendingIncomingIds.Contains(r.Id))
            .Select(r => new UserSearchResultDto
            {
                Id = r.Id,
                FullName = r.FullName,
                Email = r.Email,
                Bio = r.Bio,
                AvatarUrl = r.AvatarUrl,
                Dob = r.Dob,
                Gender = r.Gender,
                University = r.University,
                Course = r.Course,
                CreatedAt = r.CreatedAt,
                RelationshipStatus = pendingOutgoingIds.Contains(r.Id) ? "pending_outgoing" : "none",
            })
            .ToList();
    }
}