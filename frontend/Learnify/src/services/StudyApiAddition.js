/**
 * ADD THIS to your existing studyApi.js — don't overwrite the whole file
 * with this, since I don't have your current version and it likely
 * already has analyzeFile() and other exports in it.
 *
 * This assumes studyApi.js already has something equivalent to:
 *   - an API_BASE_URL constant pointing at http://localhost:5257/api
 *   - a helper that attaches the Firebase auth header (e.g. getAuthHeader()
 *     from authApi.js, same as friendsApi.js uses)
 * Adjust the request() call below to match whatever helper your file
 * already uses for authenticated POSTs, if the name differs.
 */

import { getAuthHeader } from "./authApi";

const API_BASE_URL = "http://localhost:5257/api";

/**
 * Generates a set of multiple-choice quiz questions for Active Recall.
 *
 * @param {object} config
 * @param {string} config.topic
 * @param {"beginner"|"intermediate"|"advanced"} config.difficulty
 * @param {number} config.questionCount
 * @param {string} [config.sourceText] - optional extracted text from an
 *   already-analyzed file, to ground questions in real material instead
 *   of the model's general knowledge of the topic.
 * @returns {Promise<Array>} questions in the shape ActiveRecallQuiz expects:
 *   [{ id, question, choices: [{id, text}], correctChoiceId }]
 */
export async function generateActiveRecallQuestions({ topic, difficulty, questionCount, sourceText }) {
    const url = `${API_BASE_URL}/study/active-recall/generate`;

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
        throw new Error("Couldn't reach the server. Is the .NET API running?");
    }

    let body = null;
    try {
        body = await response.json();
    } catch {
        // No JSON body — body stays null.
    }

    if (!response.ok) {
        const message = body?.message || `Request failed (${response.status})`;
        throw new Error(message);
    }

    return body?.questions ?? [];
}