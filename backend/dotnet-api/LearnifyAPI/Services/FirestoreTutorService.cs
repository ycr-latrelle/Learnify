using Google.Cloud.Firestore;
using System.Linq;

namespace LearnifyAPI.Services;

[FirestoreData]
public class TutorSession
{
    [FirestoreProperty] public string OwnerUid { get; set; } = string.Empty;
    [FirestoreProperty] public string Topic { get; set; } = string.Empty;
    [FirestoreProperty] public string? Difficulty { get; set; }
    [FirestoreProperty] public Timestamp CreatedAt { get; set; }
    [FirestoreProperty] public Timestamp LastMessageAt { get; set; }
}

[FirestoreData]
public class TutorMessage
{
    // "user" | "ai" — deliberately not "assistant", so this stays decoupled
    // from whatever role names any particular AI provider's API happens to
    // use. AiServiceClient/Flask do that role-name translation instead.
    [FirestoreProperty] public string Role { get; set; } = string.Empty;
    [FirestoreProperty] public string Text { get; set; } = string.Empty;
    [FirestoreProperty] public Timestamp CreatedAt { get; set; }
}

public class TutorMessageDto
{
    public string Role { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

// Shaped for MySessionsPage's list view rather than mirroring TutorSession
// 1:1 — DurationMinutes and IsActive are both *derived* (from
// LastMessageAt - CreatedAt, and "updated recently", respectively) since
// there's no explicit start/stop action in the UI yet. Good enough for a
// "roughly how long did I study" figure; swap for real elapsed-active-time
// tracking later if that precision starts to matter.
public class TutorSessionSummaryDto
{
    public string SessionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? Difficulty { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastMessageAt { get; set; }
    public double DurationMinutes { get; set; }
    public bool IsActive { get; set; }
}

// Owns AI Tutor sessions and their message history. One session belongs to
// exactly one person (unlike DM chats in FirestoreMessagingService, there's
// no second participant to share access with), so every read/write here is
// gated by comparing the verified caller UID against Session.OwnerUid —
// same access-control shape as everywhere else in this app, just with a
// single owner instead of a participant list.
public class FirestoreTutorService
{
    private const string SessionsCollection = "tutor_sessions";
    private const string MessagesSubcollection = "messages";

    // How much history gets sent to the AI provider on each turn. Keeps
    // token usage (and cost) bounded on long-running sessions without
    // needing real summarization yet — the full history still lives in
    // Firestore regardless, only what's *sent to the model* is capped.
    private const int MaxHistoryMessages = 20;

    private readonly FirestoreDb _db;

    public FirestoreTutorService(IConfiguration config)
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

    public async Task<(string SessionId, TutorSession Session)> CreateSessionAsync(
        string ownerUid, string topic, string? difficulty)
    {
        var now = Timestamp.GetCurrentTimestamp();
        var session = new TutorSession
        {
            OwnerUid = ownerUid,
            Topic = topic,
            Difficulty = difficulty,
            CreatedAt = now,
            LastMessageAt = now,
        };

        // Auto-generated doc ID: sessions aren't looked up by any
        // deterministic key (a person can have many sessions on the same
        // topic over time), so there's nothing to compute here the way
        // FirestoreMessagingService computes a DM chat ID.
        var docRef = await _db.Collection(SessionsCollection).AddAsync(session);
        return (docRef.Id, session);
    }

    public async Task<TutorSession?> GetSessionAsync(string sessionId)
    {
        var snapshot = await _db.Collection(SessionsCollection).Document(sessionId).GetSnapshotAsync();
        return snapshot.Exists ? snapshot.ConvertTo<TutorSession>() : null;
    }

    public async Task AppendMessageAsync(string sessionId, string role, string text)
    {
        var now = Timestamp.GetCurrentTimestamp();
        var sessionRef = _db.Collection(SessionsCollection).Document(sessionId);

        await sessionRef.Collection(MessagesSubcollection).AddAsync(new TutorMessage
        {
            Role = role,
            Text = text,
            CreatedAt = now,
        });

        // So a future "list my recent sessions" view can order by recency
        // without reading every message subcollection to find it.
        await sessionRef.UpdateAsync(new Dictionary<string, object> { { "LastMessageAt", now } });
    }

    public async Task<List<TutorMessageDto>> GetAllMessagesAsync(string sessionId)
    {
        var snapshot = await _db.Collection(SessionsCollection).Document(sessionId)
            .Collection(MessagesSubcollection)
            .OrderBy("CreatedAt")
            .GetSnapshotAsync();

        return snapshot.Documents
            .Select(d => d.ConvertTo<TutorMessage>())
            .Select(m => new TutorMessageDto { Role = m.Role, Text = m.Text })
            .ToList();
    }

    // Same as GetAllMessagesAsync, but capped to the most recent
    // MaxHistoryMessages — this is what actually gets sent to the AI
    // provider on each turn, not the full history.
    public async Task<List<TutorMessageDto>> GetRecentMessagesAsync(string sessionId)
    {
        var snapshot = await _db.Collection(SessionsCollection).Document(sessionId)
            .Collection(MessagesSubcollection)
            .OrderByDescending("CreatedAt")
            .Limit(MaxHistoryMessages)
            .GetSnapshotAsync();

        return snapshot.Documents
            .Select(d => d.ConvertTo<TutorMessage>())
            .Reverse() // back to oldest-first for the AI provider
            .Select(m => new TutorMessageDto { Role = m.Role, Text = m.Text })
            .ToList();
    }

    // Powers MySessionsPage — every session belonging to this person,
    // most-recently-active first. Requires a Firestore composite index on
    // (OwnerUid ==, LastMessageAt desc); the first call after this ships
    // will throw with a direct console link to create it — same one-time
    // setup step as the DM-chats query in FirestoreMessagingService, not a
    // bug. Takes 1–5 minutes to build.
    //
    // A session counts as "active" if it's had a message in the last 15
    // minutes — arbitrary but reasonable given there's no explicit
    // end-session action yet to mark one "completed" for certain.
    private static readonly TimeSpan ActiveWindow = TimeSpan.FromMinutes(15);

    public async Task<List<TutorSessionSummaryDto>> ListSessionsForUserAsync(string ownerUid)
    {
        var snapshot = await _db.Collection(SessionsCollection)
            .WhereEqualTo("OwnerUid", ownerUid)
            .OrderByDescending("LastMessageAt")
            .GetSnapshotAsync();

        var now = DateTime.UtcNow;

        return snapshot.Documents
            .Select(d =>
            {
                var s = d.ConvertTo<TutorSession>();
                var created = s.CreatedAt.ToDateTime();
                var lastMessage = s.LastMessageAt.ToDateTime();
                return new TutorSessionSummaryDto
                {
                    SessionId = d.Id,
                    Topic = s.Topic,
                    Difficulty = s.Difficulty,
                    CreatedAt = created,
                    LastMessageAt = lastMessage,
                    DurationMinutes = Math.Max(0, (lastMessage - created).TotalMinutes),
                    IsActive = now - lastMessage < ActiveWindow,
                };
            })
            .ToList();
    }
}