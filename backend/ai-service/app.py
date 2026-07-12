"""
Learnify AI service — Flask layer.

Per the architecture doc, this service is only ever called by the ASP.NET
gateway, never directly by the browser. It has no auth of its own (no
Firebase token verification) because ASP.NET already did that before
forwarding the request — this only needs to trust its own network, not the
public internet. Don't expose this port publicly in deployment.

Three endpoints, three separate concerns:
  - /analyze-file    : upload -> extracted text + basic stats (no AI call)
  - /analyze-content : text -> AI-generated summary/concepts/questions
  - /generate-quiz   : topic (+ optional source text) -> multiple-choice
                        quiz questions, for the Active Recall feature

ASP.NET's StudyController calls these as needed, but they're kept separate
here so each can be used independently (e.g. generating a quiz on a topic
with no file involved at all).

Nothing here ever calls file.save() or writes an upload to disk. The file
is read into memory (`file.read()`), handed to file_extraction as bytes,
and goes out of scope — and therefore garbage-collected — as soon as the
request finishes. On disk, the extracted text is never written or cached
anywhere on this service.
"""

import os

from flask import Flask, jsonify, request
from werkzeug.utils import secure_filename

from ai_client import AiAnalysisError, analyze_content, generate_quiz, tutor_reply
from config import Config
from file_extraction import (
    SUPPORTED_EXTENSIONS,
    UNSUPPORTED_LEGACY_EXTENSIONS,
    ExtractionError,
    extract_text,
    get_extension,
)

app = Flask(__name__)

# Rejects oversized uploads before they're even fully read into memory —
# Flask returns a 413 automatically once the request body exceeds this.
# 20MB comfortably covers a scanned-lecture-slides PDF without letting
# someone accidentally (or deliberately) tie up the process on a huge file.
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/analyze-file")
def analyze_file():
    if "file" not in request.files:
        return jsonify({"message": "No file was uploaded."}), 400

    upload = request.files["file"]

    if upload.filename == "":
        return jsonify({"message": "No file was selected."}), 400

    filename = secure_filename(upload.filename)
    extension = get_extension(filename)

    if extension in UNSUPPORTED_LEGACY_EXTENSIONS:
        return jsonify({
            "message": f".{extension} files (the old pre-2007 Office format) aren't "
                       f"supported yet — please re-save this as .{extension}x and try again."
        }), 415

    if extension not in SUPPORTED_EXTENSIONS:
        return jsonify({
            "message": f".{extension or 'unknown'} isn't a supported file type. "
                       f"Upload a PDF, .docx, .pptx, or .txt file."
        }), 415

    # .read() pulls the whole upload into memory as `bytes` — no path on
    # this stream ever touches disk. (Werkzeug may itself spool very large
    # request bodies to a temp file internally before this handler even
    # runs, purely as its own request-parsing implementation detail — that
    # temp file, if any, is Werkzeug's, is deleted automatically once the
    # request completes, and is never something this app code writes,
    # reads back, or has a path to.)
    file_bytes = upload.read()

    if len(file_bytes) == 0:
        return jsonify({"message": "That file appears to be empty."}), 400

    try:
        result = extract_text(filename, file_bytes)
    except ExtractionError as exc:
        return jsonify({"message": str(exc)}), 422

    preview_length = 500
    preview = result["extractedText"][:preview_length]
    if len(result["extractedText"]) > preview_length:
        preview = preview.rstrip() + "..."

    return jsonify({
        "filename": filename,
        "fileType": extension,
        "wordCount": result["wordCount"],
        "pageCount": result["pageCount"],
        "slideCount": result["slideCount"],
        "truncated": result["truncated"],
        "preview": preview,
        "extractedText": result["extractedText"],
    })


@app.post("/analyze-content")
def analyze_content_route():
    body = request.get_json(silent=True) or {}
    text = body.get("text", "")

    if not isinstance(text, str) or not text.strip():
        return jsonify({"message": "No text was provided to analyze."}), 400

    try:
        result = analyze_content(text)
    except AiAnalysisError as exc:
        return jsonify({"message": str(exc)}), 502

    return jsonify(result)


@app.post("/generate-quiz")
def generate_quiz_route():
    body = request.get_json(silent=True) or {}
    topic = body.get("topic", "")
    difficulty = body.get("difficulty", "intermediate")
    question_count = body.get("questionCount", 10)
    source_text = body.get("sourceText")

    if not isinstance(topic, str) or not topic.strip():
        return jsonify({"message": "A topic is required to generate a quiz."}), 400

    try:
        result = generate_quiz(topic, difficulty, question_count, source_text)
    except AiAnalysisError as exc:
        return jsonify({"message": str(exc)}), 502

    return jsonify(result)


@app.post("/tutor-reply")
def tutor_reply_route():
    body = request.get_json(silent=True) or {}
    history = body.get("history")
    topic = body.get("topic", "")
    difficulty = body.get("difficulty")

    if not isinstance(history, list) or len(history) == 0:
        return jsonify({"message": "No conversation history was provided."}), 400

    try:
        reply = tutor_reply(history, topic, difficulty)
    except AiAnalysisError as exc:
        return jsonify({"message": str(exc)}), 502

    return jsonify({"reply": reply})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)