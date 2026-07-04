namespace LearnifyAPI.Models;

public record RegisterRequest(string Username, string Email, string Password);
public record LoginRequest(string Identifier, string Password);