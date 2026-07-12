"""
Centralized configuration for the AI service.

Everything that varies between environments — API keys, model choice,
upload/text limits — lives here instead of being scattered across app.py,
ai_client.py, and file_extraction.py as individual os.environ.get() calls.
One place to look when setting up a new environment or rotating a key.

Loaded from a local .env file via python-dotenv in dev (see .env.example
for the full list of variables), or from real environment variables set
directly on the host in production (Render, etc.) — python-dotenv is a
no-op if no .env file exists, so this works unmodified either way.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    # --- OpenRouter / Qwen ---
    OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "qwen/qwen3-8b")
    OPENROUTER_SITE_URL = os.environ.get("OPENROUTER_SITE_URL", "https://learnify.app")
    OPENROUTER_SITE_NAME = os.environ.get("OPENROUTER_SITE_NAME", "Learnify")

    # --- Server ---
    PORT = int(os.environ.get("PORT", 5001))
    # Defaults to OFF. Werkzeug's debug mode includes an interactive
    # in-browser Python console on unhandled exceptions — genuinely remote
    # code execution if this service is ever reachable from outside the
    # network Render/your host puts it on. Opt IN with FLASK_DEBUG=true
    # for local dev; a missing env var in production should never silently
    # turn this on.
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

    # Shared secret between this service and the ASP.NET gateway. This
    # service has no Firebase auth of its own by design (ASP.NET already
    # verified the caller before forwarding), but that assumption only
    # holds if this service is genuinely unreachable from outside — and
    # a public Render URL doesn't guarantee that on its own. If this is
    # set, every request must include a matching X-Internal-Api-Key header
    # or get rejected before touching any real logic. Left empty by
    # default so local dev (where AiServiceClient doesn't send the header
    # either unless configured) keeps working without extra setup — but
    # set this in any environment reachable from the public internet.
    INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

    # --- Uploads ---
    MAX_CONTENT_LENGTH_MB = int(os.environ.get("MAX_CONTENT_LENGTH_MB", 20))
    MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH_MB * 1024 * 1024

    # --- Text extraction / analysis ---
    # Full extracted text is capped here (file_extraction.py); a shorter
    # cap is applied again in ai_client.py before sending to the model —
    # the two are intentionally separate so the frontend can still show
    # more extracted text than what actually got analyzed.
    MAX_TEXT_CHARS = int(os.environ.get("MAX_TEXT_CHARS", 50_000))
    MAX_INPUT_CHARS = int(os.environ.get("MAX_INPUT_CHARS", 15_000))

    @classmethod
    def validate(cls):
        """Called once at startup so a missing key is a loud warning in
        the console immediately, rather than a confusing 502 the first
        time someone happens to upload a file."""
        if not cls.OPENROUTER_API_KEY:
            print(
                "  WARNING: OPENROUTER_API_KEY is not set. "
                "/analyze-content will fail until it's configured — "
                "see .env.example."
            )