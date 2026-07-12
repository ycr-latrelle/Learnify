using System.Linq;
using System.Security.Claims;
using System.Text.Json.Serialization;
using Grpc.Core;
using LearnifyAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LearnifyAPI.Controllers;

public class StudyAnalysisResponse
{
    [JsonPropertyName("file")]
    public FileAnalysisResult File { get; set; } = new();

    [JsonPropertyName("analysis")]
    public ContentAnalysisResult? Analysis { get; set; }
}

public class CreateTutorSessionRequest
{
    public string? Topic { get; set; }
    public string? Difficulty { get; set; }
    // Optional: if the person just had a file analyzed, its summary makes
    // the opening greeting reference actual material instead of being
    // generic. Not persisted — only used to phrase this one message.
    public string? Summary { get; set; }
}

public class TutorSessionResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? Difficulty { get; set; }
    public List<TutorMessageDto> Messages { get; set; } = new();
}

public class SendTutorMessageRequest
{
    public string Text { get; set; } = string.Empty;
}

// POST /api/study/active-recall/generate body. SourceText is optional —
// pass along an already-analyzed file's ExtractedText (from
// StudyAnalysisResponse.File) to ground the quiz in real material instead
// of the model's general knowledge of the topic.
public class GenerateQuizRequest
{
    public string Topic { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "intermediate";
    public int QuestionCount { get; set; } = 10;
    public string? SourceText { get; set; }
}

// POST /api/study/active-recall/attempts body — a completed quiz's
// summary (not the full question/answer transcript, just enough to show
// in history and compute a score).
public class SaveAttemptRequest
{
    public string Topic { get; set; } = string.Empty;
    public string? Difficulty { get; set; }
    public int QuestionCount { get; set; }
    public int CorrectCount { get; set; }
}

[ApiController]
[Authorize] // Requires a valid "Authorization: Bearer <firebaseIdToken>" header.
public class StudyController : ControllerBase
{
    private readonly AiServiceClient _aiService;
    private readonly FirestoreTutorService _tutorService;
    private readonly FirestoreActiveRecallService _recallService;
    private readonly AiRateLimiter _rateLimiter;

    // Mirrors Flask's own MAX_CONTENT_LENGTH (see ai-service/app.py) so a
    // too-large file is rejected here, before ever opening a connection to
    // Flask, instead of relying solely on the downstream service to say no.
    private const long MaxFileSizeBytes = 20 * 1024 * 1024;

    private const int MaxTutorMessageLength = 4000;
    private const int MaxQuizQuestionCount = 20;

    public StudyController(
        AiServiceClient aiService,
        FirestoreTutorService tutorService,
        FirestoreActiveRecallService recallService,
        AiRateLimiter rateLimiter)
    {
        _aiService = aiService;
        _tutorService = tutorService;
        _recallService = recallService;
        _rateLimiter = rateLimiter;
    }

    private string CallerUid => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // POST /api/study/analyze-file
    // multipart/form-data with a "file" field. Extracts the file's text
    // (Flask #1), then feeds that text to Qwen for AI analysis (Flask #2),
    // and returns both in one response — so the frontend only has to make
    // one call per upload.
    //
    // Nothing is persisted here either; this stays purely read-and-return.
    [HttpPost("api/study/analyze-file")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<IActionResult> AnalyzeFile(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file was uploaded." });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { message = "File is too large — the limit is 20MB." });

        FileAnalysisResult extraction;
        try
        {
            extraction = await _aiService.AnalyzeFileAsync(file, cancellationToken);
        }
        catch (AiServiceException ex)
        {
            // Extraction itself failed (bad file type, corrupted, empty,
            // no readable text) — nothing to analyze, so this is a hard
            // failure for the whole request.
            Console.WriteLine($"  File extraction failed: {ex.Message}");
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }

        try
        {
            var analysis = await _aiService.AnalyzeContentAsync(extraction.ExtractedText, cancellationToken);
            return Ok(new StudyAnalysisResponse { File = extraction, Analysis = analysis });
        }
        catch (AiServiceException ex)
        {
            // Extraction succeeded but the AI step didn't (OpenRouter down,
            // rate-limited, API key not configured yet, etc). Still return
            // what we have — 207 Multi-Status, which `fetch` treats as
            // response.ok — so the frontend can show the extracted text
            // and let the person retry analysis instead of losing the
            // upload entirely.
            Console.WriteLine($"  Content analysis failed: {ex.Message}");
            return StatusCode(207, new
            {
                message = $"File was processed, but AI analysis failed: {ex.Message}",
                file = extraction,
                analysis = (ContentAnalysisResult?)null,
            });
        }
    }

    // POST /api/study/active-recall/generate
    // Generates a set of multiple-choice quiz questions for the Active
    // Recall feature. Shares the same AI rate-limit bucket as the tutor
    // chat's per-turn calls, since both cost real OpenRouter usage — a
    // 20-question quiz is a much bigger single call than one tutor
    // message, so it counts against the same budget rather than getting
    // its own, more generous one.
    [HttpPost("api/study/active-recall/generate")]
    public async Task<IActionResult> GenerateQuiz([FromBody] GenerateQuizRequest request, CancellationToken cancellationToken)
    {
        var topic = request.Topic?.Trim() ?? "";
        if (topic.Length == 0)
            return BadRequest(new { message = "A topic is required to generate a quiz." });

        var difficulty = request.Difficulty?.Trim().ToLowerInvariant();
        if (difficulty is not ("beginner" or "intermediate" or "advanced"))
            difficulty = "intermediate";

        var questionCount = Math.Clamp(request.QuestionCount <= 0 ? 10 : request.QuestionCount, 1, MaxQuizQuestionCount);

        var (allowed, retryAfter) = _rateLimiter.TryConsume(CallerUid, bucket: "tutor-chat");
        if (!allowed)
        {
            Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
            return StatusCode(429, new
            {
                message = $"You've hit the AI usage limit for now — try again in about {Math.Ceiling(retryAfter.TotalMinutes)} minute(s).",
            });
        }

        try
        {
            var result = await _aiService.GenerateQuizAsync(topic, difficulty, questionCount, request.SourceText, cancellationToken);
            return Ok(result);
        }
        catch (AiServiceException ex)
        {
            Console.WriteLine($"  Quiz generation failed: {ex.Message}");
            return StatusCode(ex.StatusCode == 502 ? 502 : ex.StatusCode, new { message = ex.Message });
        }
    }

    // POST /api/study/active-recall/attempts
    // Called once a quiz finishes (ActiveRecallResults mounting) to save
    // its score into history. Not an AI call, not rate limited — this is
    // pure persistence of a result that already happened client-side.
    [HttpPost("api/study/active-recall/attempts")]
    public async Task<IActionResult> SaveAttempt([FromBody] SaveAttemptRequest request)
    {
        var topic = request.Topic?.Trim() ?? "";
        if (topic.Length == 0)
            return BadRequest(new { message = "Topic is required." });

        if (request.QuestionCount <= 0)
            return BadRequest(new { message = "questionCount must be greater than 0." });

        if (request.CorrectCount < 0 || request.CorrectCount > request.QuestionCount)
            return BadRequest(new { message = "correctCount must be between 0 and questionCount." });

        var attempt = await _recallService.SaveAttemptAsync(
            CallerUid, topic, request.Difficulty, request.QuestionCount, request.CorrectCount);

        return Ok(attempt);
    }

    // GET /api/study/active-recall/attempts
    // Every attempt belonging to the caller, most recent first — powers
    // the "Active Recall" filter on MySessionsPage the same way
    // GET /api/study/tutor/sessions powers the "AI Tutor" one.
    [HttpGet("api/study/active-recall/attempts")]
    public async Task<IActionResult> ListAttempts()
    {
        var attempts = await _recallService.ListAttemptsAsync(CallerUid);
        return Ok(attempts);
    }

    // DELETE /api/study/active-recall/attempts/{attemptId}
    [HttpDelete("api/study/active-recall/attempts/{attemptId}")]
    public async Task<IActionResult> DeleteAttempt(string attemptId)
    {
        try
        {
            var deleted = await _recallService.DeleteAttemptAsync(attemptId, CallerUid);
            if (!deleted)
                return NotFound(new { message = "That quiz result doesn't exist." });

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    // GET /api/study/tutor/sessions
    // Every session belonging to the caller, most-recently-active first —
    // powers MySessionsPage. Deliberately separate from
    // GET /api/study/tutor/sessions/{id} (which loads one session's full
    // message history) since the list view only needs summary fields, not
    // every message ever sent.
    [HttpGet("api/study/tutor/sessions")]
    public async Task<IActionResult> ListSessions()
    {
        try
        {
            var sessions = await _tutorService.ListSessionsForUserAsync(CallerUid);
            return Ok(sessions);
        }
        catch (RpcException ex)
        {
            Console.WriteLine($"  Firestore error listing tutor sessions: {ex.Status}");
            return StatusCode(502, new { message = "Couldn't reach study session storage right now. Please try again in a moment." });
        }
    }

    // POST /api/study/tutor/sessions
    // Creates a new AI Tutor session and returns its opening greeting.
    // The greeting is generated locally (not an AI call) — it's cheap,
    // deterministic, and doesn't need to burn a rate-limit slot just to
    // say hello.
    [HttpPost("api/study/tutor/sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateTutorSessionRequest request)
    {
        var topic = string.IsNullOrWhiteSpace(request.Topic) ? "General Study Session" : request.Topic.Trim();

        try
        {
            var (sessionId, session) = await _tutorService.CreateSessionAsync(CallerUid, topic, request.Difficulty);

            var greeting = BuildGreeting(topic, request.Summary);
            await _tutorService.AppendMessageAsync(sessionId, "ai", greeting);

            return Ok(new TutorSessionResponse
            {
                SessionId = sessionId,
                Topic = session.Topic,
                Difficulty = session.Difficulty,
                Messages = new List<TutorMessageDto> { new() { Role = "ai", Text = greeting } },
            });
        }
        catch (RpcException ex)
        {
            // Firestore itself is unreachable (network/DNS issue, or a real
            // outage) rather than anything about this particular request —
            // same "infra problem, not the caller's fault" shape as
            // AiServiceException elsewhere in this controller.
            Console.WriteLine($"  Firestore error creating tutor session: {ex.Status}");
            return StatusCode(502, new { message = "Couldn't reach study session storage right now. Please try again in a moment." });
        }
    }

    // GET /api/study/tutor/sessions/{sessionId}
    // Reloads a session's full history — e.g. after a page refresh.
    [HttpGet("api/study/tutor/sessions/{sessionId}")]
    public async Task<IActionResult> GetSession(string sessionId)
    {
        try
        {
            var session = await _tutorService.GetSessionAsync(sessionId);
            if (session is null)
                return NotFound(new { message = "That study session doesn't exist." });

            if (session.OwnerUid != CallerUid)
                return Forbid();

            var messages = await _tutorService.GetAllMessagesAsync(sessionId);
            return Ok(new TutorSessionResponse
            {
                SessionId = sessionId,
                Topic = session.Topic,
                Difficulty = session.Difficulty,
                Messages = messages,
            });
        }
        catch (RpcException ex)
        {
            Console.WriteLine($"  Firestore error loading tutor session: {ex.Status}");
            return StatusCode(502, new { message = "Couldn't reach study session storage right now. Please try again in a moment." });
        }
    }

    // POST /api/study/tutor/sessions/{sessionId}/messages
    // One turn: save the person's message, ask Qwen for a reply grounded
    // in the session's recent history, save that too, and return it.
    [HttpPost("api/study/tutor/sessions/{sessionId}/messages")]
    public async Task<IActionResult> SendMessage(string sessionId, [FromBody] SendTutorMessageRequest request, CancellationToken cancellationToken)
    {
        var text = request.Text?.Trim() ?? "";
        if (text.Length == 0)
            return BadRequest(new { message = "Message can't be empty." });
        if (text.Length > MaxTutorMessageLength)
            return BadRequest(new { message = $"Message is too long — the limit is {MaxTutorMessageLength} characters." });

        TutorSession? session;
        try
        {
            session = await _tutorService.GetSessionAsync(sessionId);
        }
        catch (RpcException ex)
        {
            Console.WriteLine($"  Firestore error loading tutor session: {ex.Status}");
            return StatusCode(502, new { message = "Couldn't reach study session storage right now. Please try again in a moment." });
        }

        if (session is null)
            return NotFound(new { message = "That study session doesn't exist." });

        if (session.OwnerUid != CallerUid)
            return Forbid();

        var (allowed, retryAfter) = _rateLimiter.TryConsume(CallerUid, bucket: "tutor-chat");
        if (!allowed)
        {
            Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
            return StatusCode(429, new
            {
                message = $"You've hit the AI Tutor's message limit for now — try again in about {Math.Ceiling(retryAfter.TotalMinutes)} minute(s).",
            });
        }

        try
        {
            await _tutorService.AppendMessageAsync(sessionId, "user", text);

            var history = await _tutorService.GetRecentMessagesAsync(sessionId);
            var reply = await _aiService.TutorReplyAsync(
                history.Select(m => (m.Role, m.Text)),
                session.Topic,
                session.Difficulty,
                cancellationToken);

            await _tutorService.AppendMessageAsync(sessionId, "ai", reply);
            return Ok(new { role = "ai", text = reply });
        }
        catch (RpcException ex)
        {
            // Same Firestore-unreachable case as above — can happen at any
            // of the three Firestore calls in this block (saving the
            // person's message, reading history, or saving the reply).
            Console.WriteLine($"  Firestore error during tutor turn: {ex.Status}");
            return StatusCode(502, new { message = "Couldn't reach study session storage right now. Please try again in a moment." });
        }
        catch (AiServiceException ex)
        {
            // The person's message is already saved either way — they
            // won't lose it and can just try sending again. Nothing
            // synthetic gets written as the AI's turn on failure.
            Console.WriteLine($"  Tutor reply failed: {ex.Message}");
            return StatusCode(ex.StatusCode == 502 ? 502 : ex.StatusCode, new { message = ex.Message });
        }
    }

    private static string BuildGreeting(string topic, string? summary)
    {
        var intro = $"Hi! Ready to dig into **{topic}**?";
        if (!string.IsNullOrWhiteSpace(summary))
        {
            return $"{intro}\n\nHere's what I've got from your material: {summary}\n\nWhat would you like to start with?";
        }
        return $"{intro}\n\nAsk me anything, or tell me what's tripping you up and we'll work through it together.";
    }
}