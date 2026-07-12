using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LearnifyAPI.Services;

public class FileAnalysisResult
{
    [JsonPropertyName("filename")]
    public string Filename { get; set; } = string.Empty;

    [JsonPropertyName("fileType")]
    public string FileType { get; set; } = string.Empty;

    [JsonPropertyName("wordCount")]
    public int WordCount { get; set; }

    [JsonPropertyName("pageCount")]
    public int? PageCount { get; set; }

    [JsonPropertyName("slideCount")]
    public int? SlideCount { get; set; }

    [JsonPropertyName("truncated")]
    public bool Truncated { get; set; }

    [JsonPropertyName("preview")]
    public string Preview { get; set; } = string.Empty;

    [JsonPropertyName("extractedText")]
    public string ExtractedText { get; set; } = string.Empty;
}

// What Qwen (via OpenRouter) comes back with for a piece of text — see
// ai_client.py's ANALYSIS_SYSTEM_PROMPT on the Flask side for the exact
// contract.
public class ContentAnalysisResult
{
    [JsonPropertyName("topic")]
    public string Topic { get; set; } = string.Empty;

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("keyConcepts")]
    public List<string> KeyConcepts { get; set; } = new();

    [JsonPropertyName("difficulty")]
    public string Difficulty { get; set; } = string.Empty;

    [JsonPropertyName("suggestedQuestions")]
    public List<string> SuggestedQuestions { get; set; } = new();

    [JsonPropertyName("truncatedForAnalysis")]
    public bool TruncatedForAnalysis { get; set; }
}

// A single multiple-choice quiz question, matching what
// ActiveRecallQuiz.jsx expects on the frontend and what
// ai_client.py's QUIZ_SYSTEM_PROMPT instructs Qwen to produce.
public class QuizChoice
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class QuizQuestion
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("question")]
    public string Question { get; set; } = string.Empty;

    [JsonPropertyName("choices")]
    public List<QuizChoice> Choices { get; set; } = new();

    [JsonPropertyName("correctChoiceId")]
    public string CorrectChoiceId { get; set; } = string.Empty;
}

public class GenerateQuizResult
{
    [JsonPropertyName("questions")]
    public List<QuizQuestion> Questions { get; set; } = new();
}

// Thrown when Flask rejects a request to /analyze-file, /analyze-content,
// or /generate-quiz. Carries Flask's own message straight through, since
// all three Flask routes already write their messages to be shown to the
// end user as-is.
public class AiServiceException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

// Talks to the Flask AI service for all three of its jobs: extracting text
// from an uploaded file, running AI analysis over text, and generating
// quiz questions. Per the architecture doc, Flask is never exposed to the
// browser directly, only reachable from this gateway.
//
// Nothing on this side saves the file either: it's read into a byte array
// from the incoming multipart request and immediately re-wrapped into a
// new outgoing multipart request to Flask — it never touches this
// process's disk any more than Flask's does.
public class AiServiceClient
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public AiServiceClient(HttpClient client, IConfiguration config)
    {
        var baseUrl = config["AiService:BaseUrl"]
            ?? throw new InvalidOperationException("AiService:BaseUrl is not configured.");
        client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");

        // Matches Flask's Config.INTERNAL_API_KEY / before_request check.
        // Empty by default (local dev, matching Flask's own default) — set
        // AiService:InternalApiKey on both services once Flask is deployed
        // somewhere with a public URL.
        var internalApiKey = config["AiService:InternalApiKey"];
        if (!string.IsNullOrEmpty(internalApiKey))
        {
            client.DefaultRequestHeaders.Add("X-Internal-Api-Key", internalApiKey);
        }

        _client = client;
    }

    public async Task<FileAnalysisResult> AnalyzeFileAsync(IFormFile file, CancellationToken cancellationToken)
    {
        using var content = new MultipartFormDataContent();
        using var stream = file.OpenReadStream();
        using var streamContent = new StreamContent(stream);

        if (!string.IsNullOrEmpty(file.ContentType))
            streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(file.ContentType);

        content.Add(streamContent, "file", file.FileName);

        HttpResponseMessage response;
        try
        {
            response = await _client.PostAsync("analyze-file", content, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            // Flask being unreachable is an infra problem, not a bad file —
            // 502 rather than surfacing this as if the file was invalid.
            throw new AiServiceException(502, $"Couldn't reach the AI service: {ex.Message}");
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw new AiServiceException((int)response.StatusCode, ExtractMessage(body, response.StatusCode, "File analysis"));

        return JsonSerializer.Deserialize<FileAnalysisResult>(body, _jsonOptions)
            ?? throw new AiServiceException(502, "The AI service returned an unreadable response.");
    }

    // Sends extracted text to Flask's /analyze-content, which forwards it
    // to Qwen (via OpenRouter) and returns a structured summary.
    public async Task<ContentAnalysisResult> AnalyzeContentAsync(string text, CancellationToken cancellationToken)
    {
        var body = await PostJsonAsync("analyze-content", new { text }, cancellationToken);

        return JsonSerializer.Deserialize<ContentAnalysisResult>(body, _jsonOptions)
            ?? throw new AiServiceException(502, "The AI service returned an unreadable response.");
    }

    // Sends a topic (and optionally source text, e.g. from an
    // already-analyzed file) to Flask's /generate-quiz, which asks Qwen
    // for a set of multiple-choice questions for Active Recall.
    public async Task<GenerateQuizResult> GenerateQuizAsync(
        string topic, string difficulty, int questionCount, string? sourceText, CancellationToken cancellationToken)
    {
        var payload = new
        {
            topic,
            difficulty,
            questionCount,
            sourceText,
        };

        var body = await PostJsonAsync("generate-quiz", payload, cancellationToken);

        var result = JsonSerializer.Deserialize<GenerateQuizResult>(body, _jsonOptions)
            ?? throw new AiServiceException(502, "The AI service returned an unreadable response.");

        if (result.Questions.Count == 0)
            throw new AiServiceException(502, "The AI service didn't return any questions.");

        return result;
    }

    // Sends the tutor session's recent history to Flask's /tutor-reply,
    // which asks Qwen for the next reply grounded in that conversation.
    public async Task<string> TutorReplyAsync(
        IEnumerable<(string Role, string Text)> history,
        string topic,
        string? difficulty,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(new
        {
            history = history.Select(h => new { role = h.Role, text = h.Text }),
            topic,
            difficulty
        });

        HttpResponseMessage response;
        try
        {
            response = await _client.PostAsync(
                "tutor-reply",
                new StringContent(payload, Encoding.UTF8, "application/json"),
                cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new AiServiceException(502, $"Couldn't reach the AI service: {ex.Message}");
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new AiServiceException((int)response.StatusCode, ExtractMessage(body, response.StatusCode, "Tutor reply"));
        }

        var result = JsonSerializer.Deserialize<TutorReplyResult>(body, _jsonOptions);
        if (string.IsNullOrEmpty(result?.Reply))
            throw new AiServiceException(502, "The AI service returned an unreadable response.");

        return result.Reply;
    }

    private class TutorReplyResult
    {
        [JsonPropertyName("reply")]
        public string? Reply { get; set; }
    }

    private async Task<string> PostJsonAsync(string path, object payload, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload);

        HttpResponseMessage response;
        try
        {
            response = await _client.PostAsync(
                path,
                new StringContent(json, Encoding.UTF8, "application/json"),
                cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new AiServiceException(502, $"Couldn't reach the AI service: {ex.Message}");
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            throw new AiServiceException((int)response.StatusCode, ExtractMessage(body, response.StatusCode, "Request"));

        return body;
    }

    // Flask always returns { "message": "..." } on error responses
    // (400/413/415/422/502) — fall back to a generic message only if that
    // shape isn't there for some unexpected reason (e.g. a raw 413 from a
    // proxy sitting in front of Flask that never reached the app code).
    private string ExtractMessage(string body, System.Net.HttpStatusCode statusCode, string action)
    {
        try
        {
            var errorDoc = JsonSerializer.Deserialize<Dictionary<string, string>>(body, _jsonOptions);
            if (errorDoc?.TryGetValue("message", out var m) == true)
                return m;
        }
        catch (JsonException)
        {
            // Body wasn't JSON — fall through to the generic message below.
        }

        return $"{action} failed ({(int)statusCode}).";
    }
}