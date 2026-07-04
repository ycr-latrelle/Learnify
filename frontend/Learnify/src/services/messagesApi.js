import { getAuthHeader } from "./authApi";
import { API_ROOT } from "./apiConfig";

const API_BASE_URL = `${API_ROOT}/api/messages`;

async function request(method, path, payload) {
  const url = `${API_BASE_URL}${path}`;
  console.log(`[messagesApi] -> ${method} ${url}`, payload);

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
    console.error(
      `[messagesApi] network error on ${method} ${path}:`,
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

  console.log(`[messagesApi] <- ${response.status} ${method} ${path}`, body);

  if (!response.ok) {
    const message = body?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

// Every 1:1 chat the current user is part of, newest activity first.
// { id, otherUid, lastMessageText, lastMessageSenderId, lastMessageAt }
export async function getChats() {
  const rows = await request("GET", "/chats");
  return rows ?? [];
}

// Opens (creating if needed) the 1:1 chat with friendUid. Returns its id —
// call this when the user picks a friend from "New Message", then use the
// id to load/poll messages.
export async function openChat(friendUid) {
  const data = await request("POST", `/chats/${encodeURIComponent(friendUid)}`);
  return data.chatId;
}

// All messages in a chat, oldest first. { id, senderId, text, createdAt }
export async function getMessages(chatId) {
  const rows = await request(
    "GET",
    `/chats/${encodeURIComponent(chatId)}/messages`,
  );
  return rows ?? [];
}

export async function sendMessage(chatId, text) {
  return request("POST", `/chats/${encodeURIComponent(chatId)}/messages`, {
    text,
  });
}
