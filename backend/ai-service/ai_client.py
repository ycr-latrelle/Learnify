"""
Learnify AI service — AI analysis and quiz generation (QwenAI via
OpenRouter).

Kept as a separate module from file_extraction.py on purpose: extraction is
"get the raw text out of a PDF/DOCX/PPTX", this module is "ask a model to
do something with that text or a topic". Both analyze_content() and
generate_quiz() share one _chat_completion() helper for the actual
OpenRouter call — only the prompt and response shape differ between them.
"""

import json
import os
import re

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# qwen/qwen3-8b — confirmed working on this OpenRouter account already.
# Cheap enough that cost isn't a real concern for occasional study-material
# analysis or quiz generation.
MODEL = os.environ.get("OPENROUTER_MODEL", "qwen/qwen3-8b")

# ~15,000 characters is roughly 4,000 tokens — plenty to summarize lecture
# notes/slides well (or ground quiz questions in them) without paying to
# send an entire textbook chapter on every call.
MAX_INPUT_CHARS = 15_000


class AiAnalysisError(Exception):
    """Raised whenever OpenRouter/Qwen can't be reached or returns
    something unusable. The message is written to be safe to show directly
    to the end user."""


def _chat_completion(system_prompt: str, user_content: str, temperature: float = 0.3) -> str:
    """Sends one system+user message pair to OpenRouter and returns the raw
    text of the model's reply. Callers are responsible for parsing that
    text into whatever shape they expect."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise AiAnalysisError("AI analysis isn't configured on the server yet.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", "https://learnify.app"),
        "X-Title": os.environ.get("OPENROUTER_SITE_NAME", "Learnify"),
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": temperature,
    }

    try:
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)
    except requests.RequestException as exc:
        raise AiAnalysisError(f"Couldn't reach the AI provider: {exc}") from exc

    if response.status_code == 401:
        raise AiAnalysisError("The AI provider rejected the request (invalid API key).")
    if response.status_code == 402:
        raise AiAnalysisError("The AI provider rejected the request (no credits available for this model).")
    if response.status_code == 429:
        raise AiAnalysisError("The AI provider is rate-limiting requests right now — try again shortly.")
    if not response.ok:
        raise AiAnalysisError(f"The AI provider returned an error ({response.status_code}).")

    try:
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as exc:
        raise AiAnalysisError("The AI provider's response was in an unexpected format.") from exc


def _parse_json_response(raw: str) -> dict:
    """Qwen is instructed to return raw JSON, but chat models occasionally
    wrap it in ```json fences or add a stray sentence before/after — this
    pulls out the first {...} block rather than trusting json.loads on the
    whole string blindly."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise AiAnalysisError("The AI provider's response couldn't be parsed as JSON.")


TUTOR_SYSTEM_PROMPT_TEMPLATE = """You are a friendly, patient AI study tutor helping a student with the \
topic "{topic}"{difficulty_clause}.

Explain clearly, check understanding, and encourage the student rather \
than just handing over answers — ask a guiding question when it helps \
them think it through themselves. Keep replies conversational and not \
overly long. Respond in plain text (markdown formatting like **bold** is \
fine, but no JSON)."""


def tutor_reply(history, topic: str, difficulty: str | None = None) -> str:
    """`history` is a list of {"role": "user"|"ai", "text": str} dicts,
    oldest first. Returns the tutor's next reply as plain text (not JSON —
    this is a conversational endpoint, unlike analyze_content/generate_quiz)."""
    topic = (topic or "General Study Session").strip()
    difficulty_clause = f" at a {difficulty} level" if difficulty else ""
    system_prompt = TUTOR_SYSTEM_PROMPT_TEMPLATE.format(topic=topic, difficulty_clause=difficulty_clause)

    conversation = "\n\n".join(
        f"{'Student' if m.get('role') == 'user' else 'Tutor'}: {m.get('text', '')}"
        for m in history
    )

    if not conversation.strip():
        raise AiAnalysisError("There's no conversation to reply to.")

    reply = _chat_completion(system_prompt, conversation, temperature=0.6)
    return reply.strip()



ANALYSIS_SYSTEM_PROMPT = """You are a study assistant helping a student understand \
material they've uploaded (lecture notes, slides, or textbook excerpts).

Read the provided content carefully, then respond with ONLY a JSON object \
(no markdown fences, no commentary before or after) matching exactly this \
shape:

{
  "topic": "short label for what this material covers, e.g. 'Cellular Respiration'",
  "summary": "a clear 3-5 sentence summary of the material's main points",
  "keyConcepts": ["concept 1", "concept 2", "..."],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "suggestedQuestions": ["a question a student should be able to answer after studying this", "..."]
}

Keep keyConcepts to 4-8 items and suggestedQuestions to 3-5 items. Base \
everything strictly on the given content — don't invent facts that aren't \
in it. If the content is too short or unclear to analyze meaningfully, \
still return the JSON shape above with your best honest attempt, setting \
"summary" to explain what's missing."""


def analyze_content(text: str) -> dict:
    trimmed = text.strip()
    if not trimmed:
        raise AiAnalysisError("There's no text to analyze.")

    content_for_model = trimmed[:MAX_INPUT_CHARS]
    was_truncated_for_analysis = len(trimmed) > MAX_INPUT_CHARS

    raw_content = _chat_completion(ANALYSIS_SYSTEM_PROMPT, content_for_model, temperature=0.3)
    analysis = _parse_json_response(raw_content)
    analysis["truncatedForAnalysis"] = was_truncated_for_analysis
    return analysis


QUIZ_SYSTEM_PROMPT = """You are a quiz generator creating multiple-choice \
questions for active recall study practice.

You'll be given a topic, a difficulty level, how many questions to write, \
and optionally source material the questions should be grounded in.

Respond with ONLY a JSON object (no markdown fences, no commentary before \
or after) matching exactly this shape:

{
  "questions": [
    {
      "id": "1",
      "question": "the question text",
      "choices": [
        {"id": "a", "text": "choice text"},
        {"id": "b", "text": "choice text"},
        {"id": "c", "text": "choice text"},
        {"id": "d", "text": "choice text"}
      ],
      "correctChoiceId": "b"
    }
  ]
}

Rules:
- Generate exactly the requested number of questions, each with a unique
  sequential "id" ("1", "2", "3", ...).
- Every question needs exactly 4 choices with ids "a", "b", "c", "d".
- Exactly one choice per question is correct; "correctChoiceId" must match
  one of that question's choice ids.
- Wrong choices (distractors) should be plausible and related to the
  topic, not obviously silly — this is meant to actually test recall.
- If source material is provided, base every question strictly on it —
  don't test facts that aren't in the material. If no source material is
  given, write questions from your own general knowledge of the topic.
- Difficulty guide: "beginner" = foundational definitions and basic
  terminology; "intermediate" = applying concepts and moderate reasoning;
  "advanced" = complex problem-solving, edge cases, and synthesizing
  multiple ideas together."""


def generate_quiz(topic: str, difficulty: str, question_count, source_text: str | None = None) -> dict:
    topic = (topic or "").strip()
    if not topic:
        raise AiAnalysisError("A topic is required to generate a quiz.")

    if difficulty not in ("beginner", "intermediate", "advanced"):
        difficulty = "intermediate"

    try:
        question_count = int(question_count)
    except (TypeError, ValueError):
        question_count = 10
    question_count = max(1, min(question_count, 20))  # sane bounds either direction

    user_content = f"Topic: {topic}\nDifficulty: {difficulty}\nNumber of questions: {question_count}"
    if source_text and source_text.strip():
        user_content += f"\n\nSource material to base questions on:\n{source_text.strip()[:MAX_INPUT_CHARS]}"

    raw_content = _chat_completion(QUIZ_SYSTEM_PROMPT, user_content, temperature=0.5)
    result = _parse_json_response(raw_content)

    questions = result.get("questions")
    if not isinstance(questions, list) or len(questions) == 0:
        raise AiAnalysisError("The AI provider didn't return any questions.")

    return {"questions": questions}