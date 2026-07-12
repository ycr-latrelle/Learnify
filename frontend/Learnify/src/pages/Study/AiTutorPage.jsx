import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Bot,
    RefreshCw,
    Settings,
    Sparkles,
    Mic,
    Send,
    AlertCircle,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import BottomNav from "../../components/layout/BottomNav";
import { getSidebarUser } from "../../services/authApi";
import { createTutorSession, getTutorSession, sendTutorMessage } from "../../services/studyApi";

// Seeded from whatever the person came here with: a topic they typed on
// the Study page, and/or the file they just had analyzed (topic,
// difficulty, keyConcepts, suggestedQuestions all come straight out of
// that analysis instead of being re-typed here) — or, if they clicked
// "Resume" on an existing session from MySessionsPage, its sessionId.
function useSessionSeed() {
    const { state } = useLocation();
    const resumeSessionId = state?.sessionId || null;
    const topic = state?.topic || state?.analysis?.topic || "General Study Session";
    const difficulty = state?.analysis?.difficulty || null;
    const keyConcepts = state?.analysis?.keyConcepts || [];
    const suggestedQuestions = state?.analysis?.suggestedQuestions || [];
    const summary = state?.analysis?.summary || null;
    return { resumeSessionId, topic, difficulty, keyConcepts, suggestedQuestions, summary };
}

let messageId = 0;
const nextId = () => `msg-${++messageId}-${Date.now()}`;

export default function AiTutorPage() {
    const navigate = useNavigate();
    const user = getSidebarUser();
    const seed = useSessionSeed();

    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [isStarting, setIsStarting] = useState(true);
    const [startError, setStartError] = useState("");
    const [sendError, setSendError] = useState("");
    const [startedAt] = useState(() => new Date());
    const scrollRef = useRef(null);

    async function startSession() {
        setIsStarting(true);
        setStartError("");
        try {
            if (seed.resumeSessionId) {
                // Resuming: load the real history instead of creating a
                // fresh session and losing everything that was said before.
                const session = await getTutorSession(seed.resumeSessionId);
                setSessionId(session.sessionId);
                setMessages(session.messages.map((m) => ({ id: nextId(), role: m.role, text: m.text })));
            } else {
                const session = await createTutorSession({
                    topic: seed.topic,
                    difficulty: seed.difficulty,
                    summary: seed.summary,
                });
                setSessionId(session.sessionId);
                setMessages(session.messages.map((m) => ({ id: nextId(), role: m.role, text: m.text })));
            }
        } catch (err) {
            setStartError(err.message || "Couldn't start a tutor session.");
        } finally {
            setIsStarting(false);
        }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { startSession(); }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isThinking]);

    async function sendMessage(text) {
        const trimmed = text.trim();
        if (!trimmed || isThinking || !sessionId) return;

        setMessages((m) => [...m, { id: nextId(), role: "user", text: trimmed }]);
        setInput("");
        setSendError("");
        setIsThinking(true);

        try {
            const reply = await sendTutorMessage(sessionId, trimmed);
            setMessages((m) => [...m, { id: nextId(), role: "ai", text: reply.text }]);
        } catch (err) {
            // The message the person sent stays in the list (it was saved
            // server-side too) — only the reply is missing, so this shows
            // as an inline error rather than losing their message.
            setSendError(err.message || "Couldn't get a reply. Try sending again.");
        } finally {
            setIsThinking(false);
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        sendMessage(input);
    }

    function handleNewSession() {
        setInput("");
        setSendError("");
        startSession();
    }

    return (
        <div className="flex min-h-screen bg-[var(--color-page-bg)]" style={{ fontFamily: "var(--font-body)" }}>
            <Sidebar user={user} />

            <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Top bar */}
                <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-neutral-200/70 bg-white/70 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            aria-label="Back"
                            className="p-2 hover:bg-[var(--color-input-bg)] rounded-full transition-colors"
                        >
                            <ArrowLeft size={18} className="text-[var(--color-forest)]" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Bot size={20} className="text-[var(--color-forest)]" />
                            <h2
                                className="text-[18px] font-semibold text-[var(--color-forest-dark,var(--color-forest))]"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                AI Tutor
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewSession}
                            disabled={isStarting}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 border border-[var(--color-forest)] text-[var(--color-forest)] rounded-lg text-[13px] font-semibold hover:bg-[var(--color-forest)]/5 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isStarting ? "animate-spin" : ""} />
                            New Session
                        </button>
                        <button
                            onClick={() => navigate("/settings")}
                            aria-label="Settings"
                            className="p-2 text-neutral-500 hover:bg-[var(--color-input-bg)] rounded-full transition-colors"
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 min-h-0 overflow-hidden p-4 md:p-6 gap-6">
                    {/* Side panel — desktop only */}
                    <div className="hidden lg:flex flex-col gap-6 w-80 flex-shrink-0 overflow-y-auto">
                        <section className="bg-white rounded-2xl p-6 border border-neutral-100" style={{ boxShadow: "var(--shadow-card)" }}>
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-forest)]/60 mb-4">
                                Session Overview
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[12px] text-neutral-400 mb-1">Topic</p>
                                    <p className="text-[14px] font-bold text-[var(--color-ink)]">{seed.topic}</p>
                                </div>
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-[12px] text-neutral-400 mb-1">Difficulty</p>
                                        <p className="text-[13px] font-semibold text-neutral-600">
                                            {seed.difficulty || "Not set"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[12px] text-neutral-400 mb-1">Started</p>
                                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                                            {startedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl p-6 flex-1 border border-neutral-100 overflow-hidden flex flex-col" style={{ boxShadow: "var(--shadow-card)" }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-forest)]/60">
                                    Insights
                                </h3>
                                <Sparkles size={18} className="text-[var(--color-forest)]" />
                            </div>
                            <div className="overflow-y-auto pr-1 space-y-3 flex-1">
                                {seed.keyConcepts.length > 0 ? (
                                    seed.keyConcepts.map((concept) => (
                                        <div key={concept} className="p-3 bg-[var(--color-input-bg)] rounded-xl">
                                            <p className="text-[13px] font-semibold text-[var(--color-ink)]">{concept}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[13px] text-neutral-400 leading-relaxed">
                                        Upload a file on the Study page first and its key concepts will show up
                                        here alongside the chat.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Chat panel */}
                    <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl overflow-hidden border border-neutral-100" style={{ boxShadow: "var(--shadow-card)" }}>
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6">
                            {isStarting && messages.length === 0 && !startError && (
                                <div className="flex justify-center pt-10">
                                    <TypingBubble />
                                </div>
                            )}

                            {startError && (
                                <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[13px]">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <div>
                                        <p>{startError}</p>
                                        <button
                                            onClick={startSession}
                                            className="mt-2 font-semibold underline underline-offset-2"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <ChatBubble key={msg.id} message={msg} userInitial={(user?.name || "?")[0]} />
                            ))}
                            {isThinking && <TypingBubble />}

                            {sendError && (
                                <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[13px] max-w-[85%]">
                                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                    {sendError}
                                </div>
                            )}
                        </div>

                        {seed.suggestedQuestions.length > 0 && (
                            <div className="px-5 md:px-8 pb-3 flex flex-wrap gap-2">
                                {seed.suggestedQuestions.slice(0, 3).map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => sendMessage(q)}
                                        disabled={isThinking || isStarting}
                                        className="px-3.5 py-1.5 rounded-full border border-[var(--color-forest)] text-[var(--color-forest)] text-[12.5px] font-semibold hover:bg-[var(--color-forest)] hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-4 md:p-6 border-t border-neutral-100 bg-white">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={
                                        isStarting
                                            ? "Starting your session..."
                                            : `Ask anything about ${seed.topic}...`
                                    }
                                    disabled={isStarting || !!startError}
                                    className="w-full bg-[var(--color-input-bg)] border-none rounded-2xl py-3.5 pl-5 pr-24 text-[14px] outline-none focus:ring-2 focus:ring-[var(--color-forest)]/30 transition-all disabled:opacity-60"
                                />
                                <div className="absolute right-2.5 flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        aria-label="Voice input (not available yet)"
                                        disabled
                                        className="p-2 text-neutral-300 cursor-not-allowed"
                                    >
                                        <Mic size={18} />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isThinking || isStarting || !sessionId}
                                        aria-label="Send message"
                                        className="p-2.5 bg-[var(--color-forest)] text-white rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:hover:brightness-100"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}

function ChatBubble({ message, userInitial }) {
    const isUser = message.role === "user";
    return (
        <div className={`flex gap-3 max-w-[92%] md:max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[12px] font-semibold"
                style={{ background: isUser ? "#566342" : "var(--color-forest)" }}
            >
                {isUser ? userInitial : <Bot size={15} />}
            </div>
            <div
                className={`p-4 md:p-5 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap ${isUser
                    ? "rounded-br-md text-[var(--color-ink)]"
                    : "rounded-bl-md bg-[var(--color-input-bg)]/60 text-[var(--color-ink)] border-l-4 border-[var(--color-forest)]"
                    }`}
                style={isUser ? { background: "#d7e5bb" } : undefined}
            >
                {message.text}
            </div>
        </div>
    );
}

function TypingBubble() {
    return (
        <div className="flex gap-3 max-w-[85%]">
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                style={{ background: "var(--color-forest)" }}
            >
                <Bot size={15} />
            </div>
            <div className="px-5 py-4 rounded-2xl rounded-bl-md bg-[var(--color-input-bg)]/60 flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[var(--color-forest)]/50 animate-bounce"
                        style={{ animationDelay: `${i * 120}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}