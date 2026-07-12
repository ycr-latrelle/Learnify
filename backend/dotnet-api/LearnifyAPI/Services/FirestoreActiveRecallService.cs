using Google.Cloud.Firestore;
using System.Linq;

namespace LearnifyAPI.Services;

[FirestoreData]
public class ActiveRecallAttempt
{
    [FirestoreProperty] public string OwnerUid { get; set; } = string.Empty;
    [FirestoreProperty] public string Topic { get; set; } = string.Empty;
    [FirestoreProperty] public string? Difficulty { get; set; }
    [FirestoreProperty] public int QuestionCount { get; set; }
    [FirestoreProperty] public int CorrectCount { get; set; }
    [FirestoreProperty] public Timestamp CreatedAt { get; set; }
}

public class ActiveRecallAttemptDto
{
    public string Id { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? Difficulty { get; set; }
    public int QuestionCount { get; set; }
    public int CorrectCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty; // ISO 8601, same convention as TutorSession's timestamps going to the frontend
}

// Stores completed Active Recall quiz results (a summary — topic,
// difficulty, score — not the full question/answer transcript) so they
// show up in My Sessions history and can be revisited or removed later.
// Same ownership-per-document shape as FirestoreTutorService: one attempt
// belongs to exactly one person, gated by comparing the verified caller
// UID against OwnerUid on every read/write.
public class FirestoreActiveRecallService
{
    private const string CollectionName = "active_recall_attempts";

    private readonly FirestoreDb _db;

    public FirestoreActiveRecallService(IConfiguration config)
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

    public async Task<ActiveRecallAttemptDto> SaveAttemptAsync(
        string ownerUid, string topic, string? difficulty, int questionCount, int correctCount)
    {
        var attempt = new ActiveRecallAttempt
        {
            OwnerUid = ownerUid,
            Topic = topic,
            Difficulty = difficulty,
            QuestionCount = questionCount,
            CorrectCount = correctCount,
            CreatedAt = Timestamp.GetCurrentTimestamp(),
        };

        var docRef = await _db.Collection(CollectionName).AddAsync(attempt);
        return ToDto(docRef.Id, attempt);
    }

    public async Task<List<ActiveRecallAttemptDto>> ListAttemptsAsync(string ownerUid)
    {
        var snapshot = await _db.Collection(CollectionName)
            .WhereEqualTo("OwnerUid", ownerUid)
            .OrderByDescending("CreatedAt")
            .GetSnapshotAsync();

        return snapshot.Documents
            .Select(d => ToDto(d.Id, d.ConvertTo<ActiveRecallAttempt>()))
            .ToList();
    }

    // Returns: true if deleted, false if it didn't exist, throws
    // UnauthorizedAccessException if it exists but belongs to someone else
    // — the controller maps that to a 403 without needing to fetch the
    // document itself first just to check ownership.
    public async Task<bool> DeleteAttemptAsync(string attemptId, string callerUid)
    {
        var docRef = _db.Collection(CollectionName).Document(attemptId);
        var snapshot = await docRef.GetSnapshotAsync();

        if (!snapshot.Exists)
            return false;

        var attempt = snapshot.ConvertTo<ActiveRecallAttempt>();
        if (attempt.OwnerUid != callerUid)
            throw new UnauthorizedAccessException();

        await docRef.DeleteAsync();
        return true;
    }

    private static ActiveRecallAttemptDto ToDto(string id, ActiveRecallAttempt a) => new()
    {
        Id = id,
        Topic = a.Topic,
        Difficulty = a.Difficulty,
        QuestionCount = a.QuestionCount,
        CorrectCount = a.CorrectCount,
        CreatedAt = a.CreatedAt.ToDateTime().ToString("o"),
    };
}