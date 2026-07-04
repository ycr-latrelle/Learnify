# Render builds/runs .NET apps via Docker — there's no native .NET
# buildpack the way there is for Node or Python, so this file is required
# for the Render deploy to work at all, not just an optional optimization.

# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY LearnifyAPI.csproj .
RUN dotnet restore LearnifyAPI.csproj

COPY . .
RUN dotnet publish LearnifyAPI.csproj -c Release -o /app/publish --no-restore

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render injects PORT at runtime; Program.cs reads it and binds Kestrel
# to 0.0.0.0:$PORT. This default just keeps `docker run` usable locally
# without having to pass -e PORT every time.
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "LearnifyAPI.dll"]
