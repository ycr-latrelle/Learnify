import { getAuthHeader } from "./authApi";
import { API_ROOT } from "./apiConfig";

const API_BASE_URL = `${API_ROOT}/api`;

async function request(method, path) {
  const url = `${API_BASE_URL}${path}`;
  console.log(`[friendsApi] -> ${method} ${url}`);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });
  } catch (networkError) {
    console.error(
      `[friendsApi] network error on ${method} ${path}:`,
      networkError,
    );
    throw new Error("Couldn't reach the server. Is the .NET API running?");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body — body stays null.
  }

  console.log(`[friendsApi] <- ${response.status} ${method} ${path}`, body);

  if (!response.ok) {
    const message = body?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

// Maps a Supabase user_details row (snake_case, as returned by the API)
// onto the shape FriendsPage's PersonRow expects. Note: there's no online
// "status" here yet — that would need real-time presence, which isn't
// implemented — so PersonRow just won't show a status dot/badge.
function toPerson(row) {
  return {
    id: row.id,
    name: row.full_name || "Unnamed user",
    avatarUrl: row.avatar_url || undefined,
    school: row.university || undefined,
    course: row.course || undefined,
    // "none" | "pending_outgoing" — only present on search results.
    relationshipStatus: row.relationship_status || "none",
  };
}

export async function getFriends() {
  const rows = await request("GET", "/friends");
  return (rows ?? []).map(toPerson);
}

// Pending requests other people have sent to the current user.
export async function getIncomingRequests() {
  const rows = await request("GET", "/friends/requests");
  return (rows ?? []).map(toPerson);
}

export async function searchUsers(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = await request(
    "GET",
    `/users/search?q=${encodeURIComponent(trimmed)}`,
  );
  return (rows ?? []).map(toPerson);
}

// Sends a friend request. If the target already requested *you*, the
// backend auto-accepts theirs instead of creating a duplicate — the
// response's `status` tells the caller which happened ("pending" vs
// "accepted") so the UI can react appropriately either way.
export async function sendFriendRequest(targetUid) {
  return request("POST", `/friends/requests/${encodeURIComponent(targetUid)}`);
}

export async function acceptFriendRequest(requesterUid) {
  return request(
    "POST",
    `/friends/requests/${encodeURIComponent(requesterUid)}/accept`,
  );
}

export async function declineFriendRequest(requesterUid) {
  return request(
    "POST",
    `/friends/requests/${encodeURIComponent(requesterUid)}/decline`,
  );
}

export async function unfriend(friendUid) {
  return request("DELETE", `/friends/${encodeURIComponent(friendUid)}`);
}
