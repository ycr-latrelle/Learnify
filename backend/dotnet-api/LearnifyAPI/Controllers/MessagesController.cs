using System.Security.Claims;
using LearnifyAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LearnifyAPI.Controllers;

public record SendMessageRequest(string Text);

[ApiController]
[Authorize] // Requires a valid "Authorization: Bearer <firebaseIdToken>" header.
public class MessagesController : ControllerBase
{
    private readonly FirestoreMessagingService _messaging;

    public MessagesController(FirestoreMessagingService messaging)
    {
        _messaging = messaging;
    }

    private string CallerUid => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/messages/chats
    [HttpGet("api/messages/chats")]
    public async Task<IActionResult> GetChats()
    {
        var chats = await _messaging.GetChatsAsync(CallerUid);
        return Ok(chats);
    }

    // POST /api/messages/chats/{friendUid}
    // Opens (or creates, if it doesn't exist yet) the 1:1 chat with
    // friendUid and returns its id.
    [HttpPost("api/messages/chats/{friendUid}")]
    public async Task<IActionResult> OpenChat(string friendUid)
    {
        if (string.IsNullOrWhiteSpace(friendUid) || friendUid == CallerUid)
            return BadRequest(new { message = "Invalid recipient." });

        var chatId = await _messaging.EnsureDmChatAsync(CallerUid, friendUid);
        return Ok(new { chatId });
    }

    // GET /api/messages/chats/{chatId}/messages
    [HttpGet("api/messages/chats/{chatId}/messages")]
    public async Task<IActionResult> GetMessages(string chatId)
    {
        try
        {
            var messages = await _messaging.GetMessagesAsync(chatId, CallerUid);
            return Ok(messages);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Chat not found." });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    // POST /api/messages/chats/{chatId}/messages
    [HttpPost("api/messages/chats/{chatId}/messages")]
    public async Task<IActionResult> SendMessage(string chatId, [FromBody] SendMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return BadRequest(new { message = "Message text can't be empty." });

        try
        {
            await _messaging.SendMessageAsync(chatId, CallerUid, req.Text);
            return Ok(new { message = "Sent." });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Chat not found." });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}