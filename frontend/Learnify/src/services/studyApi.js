import { getAuthHeader } from "./authApi";
import { API_ROOT } from "./apiConfig";

const API_BASE_URL = `${API_ROOT}/api/study`;

// Sends `file` to StudyController.AnalyzeFile, which forwards it to the
// Flask AI service for text extraction. Nothing is persisted anywhere in
// this pipeline — the response is the only place the extracted text ever
// exists, so the caller is responsible for holding onto it (e.g. in React
// state) if it's needed after this call returns.
//
// Returns:
//   {
//     filename, fileType,
//     wordCount, pageCount, slideCount,   // page/slideCount are null
//                                          // unless the file type has them
//     truncated,                          // true if extractedText was cut
//                                          // off at Flask's length cap
//     preview,                            // short excerpt, safe to render
//                                          // immediately without a "show
//                                          // more"
//     extractedText,                      // full text (up to the cap)
//   }
// Throws Error with a user-facing message on failure (unsupported type,
// corrupted file, no readable text, file too large, service unreachable).
export async function analyzeFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE_URL}/analyze-file`;
  console.log(`[studyApi] -> POST ${url}`, file.name);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        // No Content-Type here on purpose — the browser sets
        // "multipart/form-data; boundary=..." itself from the FormData
        // body. Setting it manually breaks the boundary and every upload
        // fails to parse server-side.
        ...getAuthHeader(),
      },
      body: formData,
    });
  } catch (networkError) {
    console.error("[studyApi] network error on analyze-file:", networkError);
    throw new Error("Couldn't reach the server. Is the .NET API running?");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body — body stays null.
  }

  console.log(`[studyApi] <- ${response.status} analyze-file`, body);

  if (!response.ok) {
    const message = body?.message || `Upload failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

async function tutorRequest(method, path, payload) {
  const url = `${API_BASE_URL}/tutor${path}`;
  console.log(`[studyApi] -> ${method} ${url}`, payload);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
  } catch (networkError) {
    console.error(`[studyApi] network error on tutor${path}:`, networkError);
    throw new Error("Couldn't reach the server. Is the .NET API running?");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body — body stays null.
  }

  console.log(`[studyApi] <- ${response.status} tutor${path}`, body);

  if (!response.ok) {
    const error = new Error(body?.message || `Request failed (${response.status})`);
    error.status = response.status;
    // Only meaningful on 429 — how many seconds until the next message is
    // allowed. Lets the UI show a real countdown instead of a static message.
    const retryAfterHeader = response.headers.get("Retry-After");
    if (retryAfterHeader) error.retryAfterSeconds = Number(retryAfterHeader);
    throw error;
  }

  return body;
}

// Every session belonging to the current person, most-recently-active
// first. Returns [{ sessionId, topic, difficulty, createdAt, lastMessageAt,
// durationMinutes, isActive }, ...] — note the .NET side serializes
// TutorSessionSummaryDto's PascalCase properties as camelCase by default.
export function listTutorSessions() {
  return tutorRequest("GET", "/sessions");
}

// Starts a new AI Tutor session. `topic` and `difficulty` seed the
// session's context; `summary` (e.g. from a just-analyzed file) only
// shapes the one-time opening greeting, it isn't stored.
// Returns { sessionId, topic, difficulty, messages: [{ role, text }] }.
export function createTutorSession({ topic, difficulty, summary } = {}) {
  return tutorRequest("POST", "/sessions", { topic, difficulty, summary });
}

// Reloads a session's full message history.
// Returns { sessionId, topic, difficulty, messages: [{ role, text }] }.
export function getTutorSession(sessionId) {
  return tutorRequest("GET", `/sessions/${sessionId}`);
}

// Sends one message and returns the AI's reply: { role: "ai", text }.
// Throws on failure; on a 429 the thrown Error has `.status` and
// `.retryAfterSeconds` set so the UI can show a countdown.
export function sendTutorMessage(sessionId, text) {
  return tutorRequest("POST", `/sessions/${sessionId}/messages`, { text });
}

// Generates a set of multiple-choice quiz questions for Active Recall via
// StudyController.GenerateQuiz -> Flask's /generate-quiz -> Qwen.
// Shares the same AI rate-limit bucket as the tutor chat server-side, so a
// 429 here behaves the same way as sendTutorMessage's: the thrown Error
// has `.status` and `.retryAfterSeconds` set for a real countdown in the UI.
//
// sourceText is optional — pass an already-analyzed file's extractedText
// to ground questions in real material instead of the model's general
// knowledge of the topic.
//
// Returns questions in the shape ActiveRecallQuiz expects:
//   [{ id, question, choices: [{ id, text }], correctChoiceId }]
export async function generateActiveRecallQuestions({ topic, difficulty, questionCount, sourceText }) {
  const url = `${API_BASE_URL}/active-recall/generate`;
  console.log(`[studyApi] -> POST ${url}`, { topic, difficulty, questionCount });

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        topic,
        difficulty,
        questionCount,
        sourceText: sourceText || null,
      }),
    });
  } catch (networkError) {
    console.error("[studyApi] network error on active-recall/generate:", networkError);
    throw new Error("Couldn't reach the server. Is the .NET API running?");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body — body stays null.
  }

  console.log(`[studyApi] <- ${response.status} active-recall/generate`, body);

  if (!response.ok) {
    const error = new Error(body?.message || `Request failed (${response.status})`);
    error.status = response.status;
    const retryAfterHeader = response.headers.get("Retry-After");
    if (retryAfterHeader) error.retryAfterSeconds = Number(retryAfterHeader);
    throw error;
  }

  return body?.questions ?? [];
}

async function recallRequest(method, path, payload) {
  const url = `${API_BASE_URL}/active-recall${path}`;
  console.log(`[studyApi] -> ${method} ${url}`, payload);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
  } catch (networkError) {
    console.error(`[studyApi] network error on active-recall${path}:`, networkError);
    throw new Error("Couldn't reach the server. Is the .NET API running?");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body — expected for DELETE's 204, body stays null.
  }

  console.log(`[studyApi] <- ${response.status} active-recall${path}`, body);

  if (!response.ok) {
    throw new Error(body?.message || `Request failed (${response.status})`);
  }

  return body;
}

// Saves a completed quiz's score into history. Call this once
// ActiveRecallResults has the final tally — not an AI call, so it's not
// rate limited and safe to call even if the person immediately navigates
// away right after.
// Returns { id, topic, difficulty, questionCount, correctCount, createdAt }.
export function saveActiveRecallAttempt({ topic, difficulty, questionCount, correctCount }) {
  return recallRequest("POST", "/attempts", { topic, difficulty, questionCount, correctCount });
}

// Every Active Recall attempt belonging to the current person, most
// recent first.
// Returns [{ id, topic, difficulty, questionCount, correctCount, createdAt }, ...].
export function listActiveRecallAttempts() {
  return recallRequest("GET", "/attempts");
}

// Deletes one attempt from history. Throws on failure (404 if it's
// already gone, 403 if it belongs to someone else).
export function deleteActiveRecallAttempt(attemptId) {
  return recallRequest("DELETE", `/attempts/${attemptId}`);
} 