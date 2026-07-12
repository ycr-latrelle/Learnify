"""
Turns an uploaded file's *bytes* into plain text — nothing here ever writes
to disk. Every function takes raw bytes (already read into memory by the
caller) and a few in-memory libraries (pypdf, python-docx, python-pptx) that
accept file-like objects, so a BytesIO wrapper is as far as this ever gets
from RAM.

Supported so far, matching what the "Drop PDFs, notes, or lecture slides
here" widget advertises:
    .pdf   -> pypdf
    .docx  -> python-docx   (legacy .doc is NOT supported — see note below)
    .pptx  -> python-pptx   (legacy .ppt is NOT supported)
    .txt   -> decoded directly
"""

import io

from config import Config
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from docx import Document
from pptx import Presentation

# Old binary Office formats (.doc, .ppt) use a completely different file
# format (OLE compound files) that python-docx/python-pptx can't read at
# all — they'd fail with a confusing zip error, not a helpful message. It's
# better to reject these up front with a clear reason than to let the
# library exception leak through.
UNSUPPORTED_LEGACY_EXTENSIONS = {"doc", "ppt"}

SUPPORTED_EXTENSIONS = {"pdf", "docx", "pptx", "txt"}

# Comes from Config (MAX_TEXT_CHARS in .env) rather than a bare constant,
# so it's set in the same place as every other limit in this service.


class ExtractionError(Exception):
    """Raised for any problem turning the file into text — the route
    handler catches this and turns it into a 422 with `str(err)` as the
    user-facing message, so messages here should be safe to show as-is."""


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()


def extract_text(filename: str, file_bytes: bytes) -> dict:
    """
    Returns a dict with the shape:
        {
            "extractedText": str,   # truncated to MAX_TEXT_CHARS
            "truncated": bool,
            "wordCount": int,
            "pageCount": int | None,   # PDFs only
            "slideCount": int | None,  # PPTX only
        }
    Raises ExtractionError with a user-safe message on any failure
    (unsupported type, corrupted file, password-protected PDF, etc).
    """
    extension = get_extension(filename)

    if extension in UNSUPPORTED_LEGACY_EXTENSIONS:
        raise ExtractionError(
            f".{extension} files (the old pre-2007 Office format) aren't "
            f"supported yet — please re-save this as .{extension}x and "
            f"try again."
        )

    if extension not in SUPPORTED_EXTENSIONS:
        raise ExtractionError(
            f".{extension or 'unknown'} isn't a supported file type. "
            f"Upload a PDF, .docx, .pptx, or .txt file."
        )

    if extension == "pdf":
        text, page_count = _extract_pdf(file_bytes)
        slide_count = None
    elif extension == "docx":
        text = _extract_docx(file_bytes)
        page_count = None
        slide_count = None
    elif extension == "pptx":
        text, slide_count = _extract_pptx(file_bytes)
        page_count = None
    else:  # txt
        text = _extract_txt(file_bytes)
        page_count = None
        slide_count = None

    text = text.strip()
    if not text:
        raise ExtractionError(
            "No readable text was found in this file — it might be a "
            "scanned/image-only document, which isn't supported yet."
        )

    truncated = len(text) > Config.MAX_TEXT_CHARS
    if truncated:
        text = text[:Config.MAX_TEXT_CHARS]

    return {
        "extractedText": text,
        "truncated": truncated,
        "wordCount": len(text.split()),
        "pageCount": page_count,
        "slideCount": slide_count,
    }


def _extract_pdf(file_bytes: bytes):
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except PdfReadError as exc:
        raise ExtractionError(f"Couldn't read this PDF — it may be corrupted. ({exc})") from exc

    if reader.is_encrypted:
        raise ExtractionError("This PDF is password-protected — remove the password and try again.")

    pages_text = []
    for page in reader.pages:
        pages_text.append(page.extract_text() or "")

    return "\n\n".join(pages_text), len(reader.pages)


def _extract_docx(file_bytes: bytes) -> str:
    try:
        document = Document(io.BytesIO(file_bytes))
    except Exception as exc:  # python-docx raises plain Exception/PackageNotFoundError for bad zips
        raise ExtractionError(f"Couldn't read this Word document — it may be corrupted. ({exc})") from exc

    parts = [p.text for p in document.paragraphs]

    # Paragraphs alone miss table content, and lecture notes often have
    # tables (schedules, comparison charts) — worth the extra pass.
    for table in document.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text for cell in row.cells))

    return "\n".join(parts)


def _extract_pptx(file_bytes: bytes):
    try:
        presentation = Presentation(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ExtractionError(f"Couldn't read this presentation — it may be corrupted. ({exc})") from exc

    slides_text = []
    for slide in presentation.slides:
        slide_parts = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                slide_parts.append(shape.text_frame.text)
            # Speaker notes often carry the actual explanation for a slide's
            # bullet points, so a lecture-slide upload is much more useful
            # to an AI tutor if these are included too.
            if shape.has_table:
                for row in shape.table.rows:
                    slide_parts.append(" | ".join(cell.text for cell in row.cells))
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            notes = slide.notes_slide.notes_text_frame.text
            if notes.strip():
                slide_parts.append(f"[Speaker notes: {notes}]")
        slides_text.append("\n".join(slide_parts))

    return "\n\n".join(slides_text), len(presentation.slides)


def _extract_txt(file_bytes: bytes) -> str:
    # `errors="replace"` rather than raising on the first non-UTF-8 byte —
    # notes files exported from Word/Notepad on Windows are often
    # Windows-1252, and losing a handful of curly-quote characters is a
    # much better outcome than rejecting the whole upload.
    return file_bytes.decode("utf-8", errors="replace")