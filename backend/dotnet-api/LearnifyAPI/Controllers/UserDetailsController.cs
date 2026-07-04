using System.Security.Claims;
using LearnifyAPI.Models.DTO;
using LearnifyAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LearnifyAPI.Controllers;

[ApiController]
[Route("api/user-details")]
[Authorize] // Requires a valid "Authorization: Bearer <firebaseIdToken>" header.
public class UserDetailsController : ControllerBase
{
    private readonly SupabaseUserService _supabaseUserService;

    public UserDetailsController(SupabaseUserService supabaseUserService)
    {
        _supabaseUserService = supabaseUserService;
    }

    // GET /api/user-details/{uid}
    [HttpGet("{uid}")]
    public async Task<IActionResult> GetByUid(string uid)
    {
        // [Authorize] only proves the caller has a valid token — it doesn't
        // prove they're allowed to see *this* uid's data. Compare against
        // the uid embedded in their verified token, not the route value.
        var callerUid = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (callerUid != uid)
            return Forbid();

        try
        {
            var details = await _supabaseUserService.GetByIdAsync(uid);

            if (details is null)
                return NotFound(new { message = "No profile found for this user." });

            return Ok(details);
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach user profile storage." });
        }
    }

    // PUT /api/user-details/{uid}
    [HttpPut("{uid}")]
    public async Task<IActionResult> Update(string uid, [FromBody] UpdateUserDetailsDto req)
    {
        var callerUid = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (callerUid != uid)
            return Forbid();

        try
        {
            var updated = await _supabaseUserService.UpdateAsync(uid, req);

            if (updated is null)
                return NotFound(new { message = "No profile found for this user." });

            return Ok(updated);
        }
        catch (SupabaseRequestException ex)
        {
            Console.WriteLine($"  Supabase error: {ex.Message}");
            return StatusCode(502, new { message = "Could not reach user profile storage." });
        }
    }

    // NOTE: there is intentionally no generic POST/create endpoint here.
    // Profile rows are only ever created as part of /api/auth/register
    // (see AuthController), so the row's id is always guaranteed to be a
    // real Firebase UID rather than something a client could set directly.
}
