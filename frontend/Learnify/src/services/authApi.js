// Base URL for the .NET auth API (LearnifyAPI/Controllers/AuthController.cs,
// [Route("api/auth")]). Comes from apiConfig.js so this points at Render in
// production and localhost:5257 in dev without any code change.
import { API_ROOT } from "./apiConfig";
const API_BASE_URL = `${API_ROOT}/api/auth`;
const STORAGE_KEY = "learnify_user";

async function post(endpoint, payload) {
  const url = `${API_BASE_URL}/${endpoint}`;
  console.log(`[authApi] -> POST ${url}`, payload);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    console.error(`[authApi] network error on ${endpoint}:`, networkError);
    throw new Error(
      "Couldn't reach the server. Is the .NET API running on port 5257?",
    );
  }

  // AuthController returns flat JSON directly from each action
  // (e.g. `Ok(new { uid, email })`, `BadRequest(new { message })`) —
  // there's no { success, data } envelope to unwrap here.
  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body (e.g. empty response) — body stays null.
  }

  console.log(`[authApi] <- ${response.status} ${endpoint}`, body);

  if (!response.ok) {
    const message = body?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

// Persists everything the rest of the app needs after a successful
// login/register in one place: the uid, the Firebase ID token (required on
// every subsequent /api/user-details call), and the profile row the backend
// already fetched — so the app has data to show immediately, with no extra
// round trip just to populate the dashboard/profile page.
function persistSession(data) {
  if (!data?.uid || !data?.idToken) {
    // Registration/login technically "succeeded" server-side but no usable
    // token came back (e.g. immediate sign-in after register failed) —
    // don't store a half-formed session that later calls would fail on.
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      uid: data.uid,
      email: data.email,
      fullName: data.fullName ?? data.profile?.full_name ?? null,
      idToken: data.idToken,
      profile: data.profile ?? null,
    }),
  );
}

export async function loginUser({ email, password }) {
  // AuthController.Login now returns { uid, email, idToken, profile } —
  // the profile is already loaded from Supabase server-side, so the caller
  // doesn't need a second request just to know who they're looking at.
  const data = await post("login", { email, password });
  persistSession(data);
  return data;
}

export async function registerUser({ email, password, fullName }) {
  // AuthController.Register returns { uid, email, fullName, idToken, profile }.
  const data = await post("register", {
    email,
    password,
    fullName,
  });
  persistSession(data);
  return data;
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_KEY);
}

// Everything the app stored about the signed-in user, or null if no one's
// logged in / the session is missing its token.
export function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const user = JSON.parse(raw);
    return user?.idToken ? user : null;
  } catch {
    return null;
  }
}

// Header object to spread into any authenticated fetch call, e.g.:
//   fetch(url, { headers: { ...getAuthHeader() } })
export function getAuthHeader() {
  const user = getCurrentUser();
  return user?.idToken ? { Authorization: `Bearer ${user.idToken}` } : {};
}

// Kept for any existing callers that just want a truthy/falsy "is someone
// logged in" check.
export function getStoredToken() {
  return getCurrentUser()?.idToken ?? null;
}

// Sidebar (and any other chrome that just needs a display name/email) wants
// { name, email }, but the stored session uses fullName/profile.full_name —
// this is the one place that mapping happens, so every page that renders
// Sidebar shows the same name instead of each page re-deriving it slightly
// differently (or forgetting to, and falling back to "Your Account").
export function getSidebarUser() {
  const user = getCurrentUser();
  if (!user) return null;

  return {
    name: user.fullName ?? user.profile?.full_name ?? "",
    email: user.email ?? "",
  };
}
