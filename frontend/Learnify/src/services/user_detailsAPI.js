import { getAuthHeader } from "./authApi";
import { API_ROOT } from "./apiConfig";

const API_BASE_URL = `${API_ROOT}/api/user-details`;

async function request(method, uid, payload) {
  const url = `${API_BASE_URL}/${uid}`;
  console.log(`[user_detailsApi] -> ${method} ${url}`, payload);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        // The backend now requires a verified Firebase ID token and checks
        // it matches the :uid in the path — without this header every call
        // gets a 401, and with a token for a *different* user it gets a 403.
        ...getAuthHeader(),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
  } catch (networkError) {
    console.error(
      `[user_detailsApi] network error on ${method} ${uid}:`,
      networkError,
    );
    throw new Error("Couldn't reach the server. Is the API running?");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body (e.g. empty response) — body stays null.
  }

  console.log(`[user_detailsApi] <- ${response.status} ${method} ${uid}`, body);

  if (!response.ok) {
    const message = body?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

// Fetches the profile row for a given Firebase UID.
// Returns null if no profile exists yet (404), rather than throwing —
// callers can decide how to handle "not found" without wrapping every
// call in try/catch.
export async function getUserDetails(uid) {
  try {
    return await request("GET", uid);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// Updates fields on an existing profile. Only include the fields you want
// to change — omitted fields are left untouched on the backend.
export async function updateUserDetails(
  uid,
  { fullName, bio, avatarUrl, dob, gender, university, course } = {},
) {
  const payload = {};
  if (fullName !== undefined) payload.full_name = fullName;
  if (bio !== undefined) payload.bio = bio;
  if (avatarUrl !== undefined) payload.avatar_url = avatarUrl;
  if (dob !== undefined) payload.dob = dob;
  if (gender !== undefined) payload.gender = gender;
  if (university !== undefined) payload.university = university;
  if (course !== undefined) payload.course = course;

  return request("PUT", uid, payload);
}

// There is intentionally no createUserDetails() here — profile rows are
// created server-side as part of registerUser() in authApi.js, using the
// Firebase UID that Firebase Auth just issued. Creating profiles from the
// client would let a caller pick an arbitrary id.
