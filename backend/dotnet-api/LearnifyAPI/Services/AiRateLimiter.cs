using System.Collections.Concurrent;

namespace LearnifyAPI.Services;

// Gates calls to the AI provider specifically — file uploads, extraction,
// and cache hits (if/when a cache exists) aren't limited by this, only
// requests that actually reach OpenRouter/Qwen and cost money: content
// analysis and each AI Tutor turn.
//
// In-memory and per-process: correct as long as the API runs as a single
// instance (true today on Render's free/starter tiers). If this ever scales
// to multiple instances, swap the backing store for something shared
// (Redis, or a Firestore counter doc) — the TryConsume contract below
// wouldn't need to change, just what's behind it.
//
// One shared instance (registered as a Singleton) but callers pass a
// `bucket` key so different features (file analysis vs. tutor chat) don't
// compete for the same quota.
public class AiRateLimiter
{
    private readonly int _maxRequests;
    private readonly TimeSpan _window;
    private readonly ConcurrentDictionary<string, Queue<DateTime>> _requestsByKey = new();
    private readonly object _lock = new();

    public AiRateLimiter(IConfiguration config)
    {
        _maxRequests = config.GetValue<int?>("AiRateLimit:MaxRequestsPerWindow") ?? 5;
        var windowMinutes = config.GetValue<int?>("AiRateLimit:WindowMinutes") ?? 10;
        _window = TimeSpan.FromMinutes(windowMinutes);
    }

    // Returns (allowed, retryAfter). retryAfter is only meaningful when
    // allowed is false — how long until the oldest request in the window
    // ages out and frees up a slot.
    public (bool Allowed, TimeSpan RetryAfter) TryConsume(string uid, string bucket = "default")
    {
        var now = DateTime.UtcNow;
        var key = $"{bucket}:{uid}";
        var queue = _requestsByKey.GetOrAdd(key, _ => new Queue<DateTime>());

        lock (_lock)
        {
            while (queue.Count > 0 && now - queue.Peek() > _window)
                queue.Dequeue();

            if (queue.Count >= _maxRequests)
            {
                var retryAfter = _window - (now - queue.Peek());
                return (false, retryAfter > TimeSpan.Zero ? retryAfter : TimeSpan.Zero);
            }

            queue.Enqueue(now);
            return (true, TimeSpan.Zero);
        }
    }
}