import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, SendHorizontal, SquarePen, X, ArrowLeft } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import BottomNav from "../../components/layout/BottomNav";
import { getCurrentUser, getSidebarUser } from "../../services/authApi";
import { getFriends } from "../../services/friendsApi";
import { getChats, openChat, getMessages, sendMessage } from "../../services/messagesApi";

const CHATS_POLL_MS = 4000;
const MESSAGES_POLL_MS = 2500;

function initialsOf(name) {
    return (
        (name || "")
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?"
    );
}

function timeOf(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Left column: one conversation row ───────────────────────────────────
function ConversationRow({ conversation, active, onClick }) {
    const preview = conversation.lastMessageText || "Say hello \u{1F44B}";
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${active ? "bg-[var(--color-forest)]/10 border-r-4 border-[var(--color-forest)]" : "hover:bg-[#f4f4f1]"
                }`}
        >
            <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[14px] font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #a4c96b 0%, #3b5c2e 100%)" }}
            >
                {initialsOf(conversation.friendName)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-[13.5px] font-bold text-[#1a1c1b] truncate">
                        {conversation.friendName}
                    </h3>
                    <span className="text-[10px] text-[#73796c] flex-shrink-0">
                        {timeOf(conversation.lastMessageAt)}
                    </span>
                </div>
                <p className="text-[13px] text-[#73796c] truncate">{preview}</p>
            </div>
        </button>
    );
}

// ── Right column: one message bubble ────────────────────────────────────
function MessageBubble({ message, isOwn }) {
    return (
        <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
                <div
                    className={`px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${isOwn
                        ? "bg-[var(--color-forest)] text-white rounded-[16px_16px_4px_16px]"
                        : "bg-[#f4f4f1] text-[#1a1c1b] rounded-[4px_16px_16px_16px]"
                        }`}
                >
                    {message.text}
                </div>
                <span className="text-[10px] text-[#73796c] px-1">{timeOf(message.createdAt)}</span>
            </div>
        </div>
    );
}

// ── "New Message" friend picker ─────────────────────────────────────────
function NewMessageModal({ friends, onPick, onClose }) {
    const [q, setQ] = useState("");
    const filtered = friends.filter((f) =>
        f.name.toLowerCase().includes(q.toLowerCase()),
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#c3c9ba] overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[#c3c9ba]">
                    <h3 className="text-[18px] font-semibold text-[#1a1c1b]">New Message</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#eeeeeb]">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4">
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search your friends..."
                        className="w-full bg-[#f4f4f1] border border-[#c3c9ba] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[var(--color-forest)]"
                    />
                </div>
                <div className="max-h-80 overflow-y-auto pb-2">
                    {filtered.length === 0 ? (
                        <p className="text-[13px] text-[#73796c] text-center py-6">
                            {friends.length === 0
                                ? "Add some friends first to start messaging."
                                : "No friends match that search."}
                        </p>
                    ) : (
                        filtered.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => onPick(f)}
                                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-[#f4f4f1] text-left"
                            >
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg, #a4c96b 0%, #3b5c2e 100%)" }}
                                >
                                    {initialsOf(f.name)}
                                </div>
                                <span className="text-[14px] font-medium text-[#1a1c1b]">{f.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function MessagesPage() {
    const currentUser = getCurrentUser();
    const uid = currentUser?.uid;
    const sidebarUser = getSidebarUser();

    const [friends, setFriends] = useState([]);
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [error, setError] = useState("");
    const messagesEndRef = useRef(null);

    // Friends list — used to resolve "who is the other person in this
    // chat" (the API only gives back otherUid, not a display name) and to
    // populate the "New Message" picker.
    useEffect(() => {
        getFriends()
            .then(setFriends)
            .catch((err) => console.error("Failed to load friends:", err));
    }, []);

    // Conversation list — there's no push channel between the .NET API and
    // the browser yet, so this polls instead of subscribing. 4s keeps the
    // list feeling current without hammering the API.
    const loadChats = useCallback(() => {
        getChats()
            .then(setChats)
            .catch(() => setError("Couldn't load your conversations."));
    }, []);

    useEffect(() => {
        if (!uid) return;
        loadChats();
        const interval = setInterval(loadChats, CHATS_POLL_MS);
        return () => clearInterval(interval);
    }, [uid, loadChats]);

    const friendsById = useMemo(() => {
        const map = new Map();
        friends.forEach((f) => map.set(f.id, f));
        return map;
    }, [friends]);

    // Attach the other participant's display name onto each raw chat row
    // so ConversationRow doesn't need to know about friends at all.
    const conversations = useMemo(() => {
        return chats.map((chat) => {
            const friend = friendsById.get(chat.otherUid);
            return { ...chat, friendName: friend?.name || "Unknown user" };
        });
    }, [chats, friendsById]);

    const activeConversation = conversations.find((c) => c.id === activeChatId);

    // Messages for whichever chat is open — same polling approach.
    const loadMessages = useCallback((chatId) => {
        getMessages(chatId)
            .then(setMessages)
            .catch(() => setError("Couldn't load messages for this conversation."));
    }, []);

    useEffect(() => {
        if (!activeChatId) {
            setMessages([]);
            return;
        }
        loadMessages(activeChatId);
        const interval = setInterval(() => loadMessages(activeChatId), MESSAGES_POLL_MS);
        return () => clearInterval(interval);
    }, [activeChatId, loadMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handlePickFriend(friend) {
        setPickerOpen(false);
        try {
            const chatId = await openChat(friend.id);
            setActiveChatId(chatId);
            loadChats(); // so the new conversation shows up in the list right away
        } catch (err) {
            console.error("Failed to start conversation:", err);
            setError("Couldn't start that conversation.");
        }
    }

    async function handleSend(e) {
        e.preventDefault();
        if (!draft.trim() || !activeChatId) return;
        const text = draft;
        setDraft("");
        try {
            await sendMessage(activeChatId, text);
            loadMessages(activeChatId); // don't wait for the next poll tick
            loadChats(); // updates this conversation's preview/order immediately
        } catch (err) {
            console.error("Failed to send message:", err);
            setError("Message failed to send.");
            setDraft(text); // give it back so nothing typed is lost
        }
    }

    return (
        <div className="flex h-screen w-full bg-[#f9f9f6] overflow-hidden" style={{ fontFamily: "var(--font-body)" }}>
            <Sidebar user={sidebarUser} />

            <main className="flex-1 h-screen flex overflow-hidden">
                {/* Conversation list — hidden on mobile once a chat is open,
                    so the user isn't stuck seeing the list with no way to
                    reach the chat they just tapped. Always visible at md+. */}
                <div
                    className={`w-full md:w-96 flex-col border-r border-[#c3c9ba] bg-white flex-shrink-0 ${activeChatId ? "hidden md:flex" : "flex"
                        }`}
                >
                    <div className="p-4 space-y-3 border-b border-[#c3c9ba]">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[22px] font-semibold text-[#1a1c1b]" style={{ fontFamily: "var(--font-display)" }}>
                                Messages
                            </h2>
                            <button
                                onClick={() => setPickerOpen(true)}
                                className="bg-[var(--color-forest)] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[12.5px] font-semibold hover:brightness-110 transition-all active:scale-95"
                            >
                                <SquarePen size={15} />
                                New Message
                            </button>
                        </div>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73796c]" />
                            <input
                                placeholder="Search conversations..."
                                className="w-full pl-9 pr-3 py-2 bg-[#f4f4f1] rounded-xl text-[13.5px] outline-none focus:ring-2 focus:ring-[var(--color-forest)]/20"
                                disabled
                                title="Search coming soon"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                        {conversations.length === 0 ? (
                            <p className="text-[13px] text-[#73796c] text-center py-10 px-6">
                                No conversations yet. Tap "New Message" to message a friend.
                            </p>
                        ) : (
                            conversations.map((c) => (
                                <ConversationRow
                                    key={c.id}
                                    conversation={c}
                                    active={c.id === activeChatId}
                                    onClick={() => setActiveChatId(c.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Active chat — on mobile this only shows once a
                    conversation is selected (see the "hidden" toggle
                    above), and includes a back button since there's no
                    sidebar visible to navigate away otherwise. On desktop
                    it's always visible, showing a placeholder until a
                    conversation is picked. */}
                <div className={`flex-1 flex-col bg-[#f9f9f6] ${activeChatId ? "flex" : "hidden md:flex"}`}>
                    {!activeConversation ? (
                        <div className="flex-1 flex items-center justify-center text-[#73796c] text-[14px]">
                            Select a conversation to start chatting.
                        </div>
                    ) : (
                        <>
                            <div className="h-16 flex items-center gap-3 px-5 border-b border-[#c3c9ba] bg-white/80 backdrop-blur-md">
                                <button
                                    onClick={() => setActiveChatId(null)}
                                    className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-[#eeeeeb]"
                                    aria-label="Back to conversations"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                                    style={{ background: "linear-gradient(135deg, #a4c96b 0%, #3b5c2e 100%)" }}
                                >
                                    {initialsOf(activeConversation.friendName)}
                                </div>
                                <h2 className="text-[14.5px] font-bold text-[#1a1c1b]">
                                    {activeConversation.friendName}
                                </h2>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                {messages.length === 0 ? (
                                    <p className="text-[13px] text-[#73796c] text-center mt-8">
                                        Say hello to start the conversation.
                                    </p>
                                ) : (
                                    messages.map((m) => (
                                        <MessageBubble key={m.id} message={m} isOwn={m.senderId === uid} />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSend} className="p-4 border-t border-[#c3c9ba] bg-white flex items-center gap-2.5">
                                <input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-[#f4f4f1] rounded-2xl px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[var(--color-forest)]/20"
                                />
                                <button
                                    type="submit"
                                    disabled={!draft.trim()}
                                    className="w-11 h-11 bg-[var(--color-forest)] text-white rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
                                >
                                    <SendHorizontal size={18} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>

            {!activeChatId && <BottomNav />}

            {pickerOpen && (
                <NewMessageModal
                    friends={friends}
                    onPick={handlePickFriend}
                    onClose={() => setPickerOpen(false)}
                />
            )}

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-2.5 rounded-xl shadow-lg">
                    {error}
                </div>
            )}
        </div>
    );
}