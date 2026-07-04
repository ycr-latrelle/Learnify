using System.Security.Claims;
using LearnifyAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LearnifyAPI.Controllers;

[ApiController]
[Authorize] // Requires a valid "Authorization: Bearer <firebaseIdToken>" header.
public class FriendsController : ControllerBase
{
    private readonly FriendService _friendService;

    public FriendsController(FriendService friendService)
    {
        _friendService = friendService;
    }

    // GET /api/friends
    // Only accepted friendships. The caller's own UID always comes from
    // their verified token, never from the URL/body — there's no {uid}
    // route param here on purpose.
    [HttpGet("api/friends")]
    public async Task<IActionResult> GetFriends()
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            var friends = await _friendService.GetFriendsAsync(uid);
            return Ok(friends);
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error loading friends: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach friends storage." });
        }
    }

    // GET /api/friends/requests
    // Pending requests other people have sent to the caller.
    [HttpGet("api/friends/requests")]
    public async Task<IActionResult> GetIncomingRequests()
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            var requests = await _friendService.GetIncomingRequestsAsync(uid);
            return Ok(requests);
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error loading friend requests: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach friends storage." });
        }
    }

    // GET /api/users/search?q=...
    [HttpGet("api/users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(Array.Empty<object>());

        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            var results = await _friendService.SearchUsersAsync(uid, q.Trim());
            return Ok(results);
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error searching users: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach user search." });
        }
    }

    // DELETE /api/friends/{friendUid}
    [HttpDelete("api/friends/{friendUid}")]
    public async Task<IActionResult> RemoveFriend(string friendUid)
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            var removed = await _friendService.RemoveFriendAsync(uid, friendUid);
            if (!removed)
                return NotFound(new { message = "You're not friends with this user." });

            return Ok(new { message = "Friend removed." });
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error removing friend: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach friends storage." });
        }
    }

    // POST /api/friends/requests/{targetUid}
    // Sends a friend request. If targetUid already requested the caller,
    // this accepts theirs instead of creating a duplicate — see
    // FriendService.SendRequestAsync.
    [HttpPost("api/friends/requests/{targetUid}")]
    public async Task<IActionResult> SendRequest(string targetUid)
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        if (string.IsNullOrWhiteSpace(targetUid) || uid == targetUid)
            return BadRequest(new { message = "You can't send yourself a friend request." });

        try
        {
            var result = await _friendService.SendRequestAsync(uid, targetUid);
            return result switch
            {
                FriendService.SendRequestResult.Created =>
                    Ok(new { message = "Friend request sent.", status = "pending" }),
                FriendService.SendRequestResult.AutoAccepted =>
                    Ok(new { message = "You're now friends.", status = "accepted" }),
                FriendService.SendRequestResult.AlreadyFriends =>
                    Ok(new { message = "You're already friends.", status = "accepted" }),
                FriendService.SendRequestResult.AlreadyPending =>
                    Ok(new { message = "Request already sent.", status = "pending" }),
                _ => Ok(new { message = "Request sent." }),
            };
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error sending friend request: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach friends storage." });
        }
    }

    // POST /api/friends/requests/{requesterUid}/accept
    [HttpPost("api/friends/requests/{requesterUid}/accept")]
    public async Task<IActionResult> AcceptRequest(string requesterUid)
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            var handled = await _friendService.RespondToRequestAsync(uid, requesterUid, accept: true);
            if (!handled)
                return NotFound(new { message = "No pending request from this user." });

            return Ok(new { message = "Friend request accepted." });
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error accepting friend request: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach friends storage." });
        }
    }

    // POST /api/friends/requests/{requesterUid}/decline
    [HttpPost("api/friends/requests/{requesterUid}/decline")]
    public async Task<IActionResult> DeclineRequest(string requesterUid)
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        try
        {
            var handled = await _friendService.RespondToRequestAsync(uid, requesterUid, accept: false);
            if (!handled)
                return NotFound(new { message = "No pending request from this user." });

            return Ok(new { message = "Friend request declined." });
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error declining friend request: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach friends storage." });
        }
    }
}