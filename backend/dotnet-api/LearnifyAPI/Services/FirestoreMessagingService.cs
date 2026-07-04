using Google.Cloud.Firestore;

namespace LearnifyAPI.Services;

public class ChatSummary
{
    public string Id { get; set; } = string.Empty;
    public string OtherUid { get; set; } = string.Empty;
    public string? LastMessageText { get; set; }
    public string? LastMessageSenderId { get; set; }
    public DateTime? LastMessageAt { get; set; }
}

public class MessageDto
{
    public string Id { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
}

// Everything talks to Firestore through here — the frontend never touches
// Firestore directly, it only calls MessagesController, which calls this.
// That means access control is plain C# (compare the caller's verified
// UID, from FirebaseAuthenticationHandler, against participantIds) instead
// of Firestore Security Rules, and there's no separate Firebase client
// sign-in step needed on the frontend at all.
public class FirestoreMessagingService
{
    private readonly FirestoreDb _db;

    public FirestoreMessagingService(IConfiguration config)
    {
        var projectId = config["Firebase:ProjectId"]
            ?? throw new InvalidOperationException("Firebase:ProjectId is not configured.");

        var credentialsJson = Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_JSON");
        var credentialPath = config["Firebase:ServiceAccountPath"];

        var builder = new FirestoreDbBuilder { ProjectId = projectId };

        if (!string.IsNullOrEmpty(credentialsJson))
            builder.JsonCredentials = credentialsJson;  // Production: from env var
        else if (!string.IsNullOrEmpty(credentialPath))
            builder.CredentialsPath = credentialPath;   // Local: from file
        else
            throw new InvalidOperationException("No Firebase credentials configured.");

        _db = builder.Build();
    }

    // Same deterministic-id scheme either side could compute, so opening a
    // chat never needs a query — we already know exactly which doc to read
    // or create.
    private static string DmChatId(string uidA, string uidB)
    {
        var ids = new[] { uidA, uidB };
        Array.Sort(ids, StringComparer.Ordinal);
        return $"dm_{ids[0]}_{ids[1]}";
    }

    public async Task<string> EnsureDmChatAsync(string uidA, string uidB)
    {
        var chatId = DmChatId(uidA, uidB);
        var ids = new[] { uidA, uidB };
        Array.Sort(ids, StringComparer.Ordinal);

        var chatRef = _db.Collection("chats").Document(chatId);
        var existing = await chatRef.GetSnapshotAsync();

        if (!existing.Exists)
        {
            // GetChatsAsync orders by lastMessageAt, and Firestore's
            // orderBy silently excludes any document missing that field
            // entirely — so without setting it here, a brand-new chat
            // would be invisible in the conversation list until someone
            // sent the first message into it.
            var now = Timestamp.GetCurrentTimestamp();
            await chatRef.SetAsync(new Dictionary<string, object>
            {
                ["type"] = "dm",
                ["participantIds"] = ids,
                ["sessionId"] = null!,
                ["createdAt"] = now,
                ["lastMessageAt"] = now,
            });
        }

        return chatId;
    }

    // All of the caller's 1:1 chats, newest activity first. Only chats
    // where `uid` is actually a participant are ever returned — there's no
    // path in this class that reads a chat without that check, so the
    // controller doesn't need to re-verify it here.
    public async Task<List<ChatSummary>> GetChatsAsync(string uid)
    {
        var query = _db.Collection("chats")
            .WhereEqualTo("type", "dm")
            .WhereArrayContains("participantIds", uid)
            .OrderByDescending("lastMessageAt");

        var snapshot = await query.GetSnapshotAsync();

        var results = new List<ChatSummary>();
        foreach (var doc in snapshot.Documents)
        {
            var data = doc.ToDictionary();
            var participantIds = ((IEnumerable<object>)data.GetValueOrDefault("participantIds", new List<object>()))
                .Select(o => o.ToString()!)
                .ToList();
            var otherUid = participantIds.FirstOrDefault(id => id != uid) ?? "";

            var lastMessage = data.GetValueOrDefault("lastMessage") as Dictionary<string, object>;

            results.Add(new ChatSummary
            {
                Id = doc.Id,
                OtherUid = otherUid,
                LastMessageText = lastMessage?.GetValueOrDefault("text")?.ToString(),
                LastMessageSenderId = lastMessage?.GetValueOrDefault("senderId")?.ToString(),
                LastMessageAt = (data.GetValueOrDefault("lastMessageAt") as Timestamp?)?.ToDateTime(),
            });
        }

        return results;
    }

    // Throws if `callerUid` isn't a participant — callers must catch
    // UnauthorizedAccessException and turn it into a 403, same pattern as
    // SupabaseRequestException elsewhere.
    private async Task EnsureParticipantAsync(string chatId, string callerUid)
    {
        var chatRef = _db.Collection("chats").Document(chatId);
        var snapshot = await chatRef.GetSnapshotAsync();

        if (!snapshot.Exists)
            throw new KeyNotFoundException("Chat not found.");

        var participantIds = snapshot.GetValue<List<string>>("participantIds");
        if (!participantIds.Contains(callerUid))
            throw new UnauthorizedAccessException("You're not a participant in this chat.");
    }

    public async Task<List<MessageDto>> GetMessagesAsync(string chatId, string callerUid)
    {
        await EnsureParticipantAsync(chatId, callerUid);

        var query = _db.Collection("chats").Document(chatId)
            .Collection("messages")
            .OrderBy("createdAt");

        var snapshot = await query.GetSnapshotAsync();

        return snapshot.Documents.Select(doc => new MessageDto
        {
            Id = doc.Id,
            SenderId = doc.GetValue<string>("senderId"),
            Text = doc.GetValue<string>("text"),
            CreatedAt = doc.ContainsField("createdAt")
                ? doc.GetValue<Timestamp>("createdAt").ToDateTime()
                : null,
        }).ToList();
    }

    public async Task SendMessageAsync(string chatId, string senderUid, string text)
    {
        await EnsureParticipantAsync(chatId, senderUid);

        var trimmed = text.Trim();
        if (trimmed.Length == 0) return;

        var chatRef = _db.Collection("chats").Document(chatId);
        var now = Timestamp.GetCurrentTimestamp();

        await chatRef.Collection("messages").AddAsync(new Dictionary<string, object>
        {
            ["senderId"] = senderUid,
            ["text"] = trimmed,
            ["type"] = "text",
            ["createdAt"] = now,
        });

        await chatRef.SetAsync(new Dictionary<string, object>
        {
            ["lastMessage"] = new Dictionary<string, object>
            {
                ["text"] = trimmed,
                ["senderId"] = senderUid,
                ["createdAt"] = now,
            },
            ["lastMessageAt"] = now,
        }, SetOptions.MergeAll);
    }
}