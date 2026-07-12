import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    Brain,
    BookMarked,
    ListChecks,
    NotebookPen,
    CalendarDays,
    Clock,
    CircleDot,
    TrendingUp,
    Flame,
    Sparkles,
    ArrowUpRight,
    History,
    Loader2,
    AlertCircle,
    Trash2,
    Target,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import BottomNav from "../../components/layout/BottomNav";
import { getSidebarUser } from "../../services/authApi";
import { listTutorSessions, listActiveRecallAttempts, deleteActiveRecallAttempt } from "../../services/studyApi";

const FILTERS = ["All", "AI Tutor", "Active Recall", "Notes"];

const TYPE_ICONS = {
    "AI Tutor": Brain,
    "Active Recall": ListChecks,
    Notes: NotebookPen,
};

function formatDuration(minutes) {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Every session currently comes from either the AI Tutor or Active Recall
// (Notes isn't built yet) — kept as separate mapper functions per source
// so each stays a straightforward field-for-field mapping instead of one
// function branching on shape.
function toTutorSessionCard(session) {
    return {
        id: session.sessionId,
        source: "tutor",
        title: session.topic,
        subject: session.difficulty || "General",
        type: "AI Tutor",
        date: formatDate(session.lastMessageAt),
        duration: formatDuration(session.durationMinutes),
        status: session.isActive ? "active" : "completed",
    };
}

function toRecallSessionCard(attempt) {
    const pct = attempt.questionCount > 0
        ? Math.round((attempt.correctCount / attempt.questionCount) * 100)
        : 0;
    return {
        id: attempt.id,
        source: "recall",
        title: attempt.topic,
        subject: attempt.difficulty || "General",
        type: "Active Recall",
        date: formatDate(attempt.createdAt),
        // Recall attempts don't have a duration — the score fills the same
        // slot in the card instead, since it's the more meaningful summary
        // for a quiz result than how long it took.
        duration: `${attempt.correctCount}/${attempt.questionCount} correct (${pct}%)`,
        status: "completed",
    };
}

function SessionCard({ session, onOpen, onDelete, isDeleting }) {
    const Icon = TYPE_ICONS[session.type] || BookMarked;
    const MetricIcon = session.source === "recall" ? Target : Clock;
    const isActive = session.status === "active";

    return (
        <div
            className={`group flex items-center gap-5 bg-white rounded-2xl p-5 border transition-all hover:shadow-[var(--shadow-card)]
            ${isActive ? "border-[var(--color-forest)]/40" : "border-neutral-100"}`}
        >
            <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
                ${isActive ? "bg-[var(--color-forest)] text-white" : "bg-[var(--color-forest)]/10 text-[var(--color-forest)]"}`}
            >
                <Icon size={22} />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="text-[15.5px] font-semibold text-[var(--color-ink)] truncate">
                    {session.title}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-[12.5px] text-neutral-500">
                    {isActive ? (
                        <span className="flex items-center gap-1 font-semibold text-[var(--color-forest)]">
                            <CircleDot size={13} className="fill-[var(--color-forest)]" />
                            In Progress
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <CalendarDays size={13} />
                            {session.date}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <MetricIcon size={13} />
                        {session.duration}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                <span className="hidden sm:inline-block px-3 py-1 bg-[var(--color-input-bg)] text-[#43493e] rounded-full text-[12px] font-medium">
                    {session.subject}
                </span>
                <button
                    onClick={() => onOpen(session)}
                    className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-95
                    ${isActive
                            ? "bg-[var(--color-forest)] text-white hover:opacity-90"
                            : "border border-[var(--color-forest)] text-[var(--color-forest)] hover:bg-[var(--color-forest)]/5"
                        }`}
                >
                    {isActive ? "Resume" : "Review"}
                </button>
                {onDelete && (
                    <button
                        onClick={() => onDelete(session)}
                        disabled={isDeleting}
                        aria-label="Delete this result"
                        title="Delete this result"
                        className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function MySessionsPage() {
    const user = getSidebarUser();
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState("All");
    const [query, setQuery] = useState("");
    const [rawSessions, setRawSessions] = useState([]);
    const [rawRecallAttempts, setRawRecallAttempts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            // Both sources load independently — if Active Recall's history
            // fails to load, AI Tutor sessions still show up (and vice
            // versa) instead of one failure blanking the whole page.
            const [tutorResult, recallResult] = await Promise.allSettled([
                listTutorSessions(),
                listActiveRecallAttempts(),
            ]);

            if (cancelled) return;

            if (tutorResult.status === "fulfilled") {
                setRawSessions(tutorResult.value);
            }
            if (recallResult.status === "fulfilled") {
                setRawRecallAttempts(recallResult.value);
            }

            if (tutorResult.status === "rejected" && recallResult.status === "rejected") {
                setLoadError(tutorResult.reason?.message || "Couldn't load your study sessions.");
            }

            setIsLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const SESSIONS = useMemo(
        () => [...rawSessions.map(toTutorSessionCard), ...rawRecallAttempts.map(toRecallSessionCard)],
        [rawSessions, rawRecallAttempts]
    );

    const filtered = useMemo(() => {
        return SESSIONS.filter((s) => {
            const matchesFilter = activeFilter === "All" || s.type === activeFilter;
            const matchesQuery =
                !query.trim() ||
                s.title.toLowerCase().includes(query.trim().toLowerCase()) ||
                s.subject.toLowerCase().includes(query.trim().toLowerCase());
            return matchesFilter && matchesQuery;
        });
    }, [SESSIONS, activeFilter, query]);

    async function handleDelete(session) {
        if (session.source !== "recall") return; // only Active Recall attempts are deletable right now

        setDeleteError("");
        setDeletingId(session.id);
        const previousAttempts = rawRecallAttempts;
        // Optimistic removal — the list feels instant instead of waiting
        // on a round trip, and rolls back below if the delete actually fails.
        setRawRecallAttempts((attempts) => attempts.filter((a) => a.id !== session.id));

        try {
            await deleteActiveRecallAttempt(session.id);
        } catch (err) {
            setRawRecallAttempts(previousAttempts);
            setDeleteError(err.message || "Couldn't delete that result. Try again.");
        } finally {
            setDeletingId(null);
        }
    }

    const totalMinutes = useMemo(
        () => rawSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
        [rawSessions]
    );
    const totalHoursLabel = (totalMinutes / 60).toFixed(1);
    const completedCount = SESSIONS.filter((s) => s.status === "completed").length;
    // Daily goal is a fixed placeholder (3/day) until there's an actual
    // per-person goal setting to read — completionPct is against that,
    // not against total sessions ever, so it resets in spirit each day
    // even though nothing here currently filters by "today" specifically.
    const dailyGoal = 3;
    const completionPct = Math.min(100, Math.round((completedCount / dailyGoal) * 100));

    function handleOpen(session) {
        if (session.type === "AI Tutor") {
            navigate("/study/tutor", { state: { sessionId: session.id, topic: session.title } });
        } else {
            navigate("/study");
        }
    }

    return (
        <div className="flex min-h-screen bg-[var(--color-page-bg)]" style={{ fontFamily: "var(--font-body)" }}>
            <Sidebar user={user} />

            <div className="flex-1 min-w-0 flex flex-col">
                {/* Top bar */}
                <header className="hidden md:flex items-center h-16 px-8 border-b border-neutral-200/70 bg-white sticky top-0 z-30">
                    <div className="relative w-full max-w-xl">
                        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search sessions..."
                            className="w-full bg-[var(--color-input-bg)] rounded-full pl-10 pr-4 py-2.5 text-[14px] outline-none
                            focus:ring-2 focus:ring-[var(--color-forest)]/30 transition-all"
                        />
                    </div>
                </header>

                <main className="flex-1 px-6 md:px-8 py-8 pb-28 md:pb-10">
                    <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left column: history */}
                        <div className="lg:col-span-8">
                            <header className="mb-8">
                                <h2
                                    className="text-[28px] md:text-[32px] font-semibold text-[var(--color-ink)]"
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    Study History
                                </h2>
                                <p className="text-[15px] text-neutral-500 mt-1 mb-6">
                                    Track your academic progress and revisit past learning sessions.
                                </p>

                                {/* Mobile search */}
                                <div className="relative w-full mb-5 md:hidden">
                                    <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search sessions..."
                                        className="w-full bg-white border border-neutral-200 rounded-full pl-10 pr-4 py-2.5 text-[14px] outline-none
                                        focus:ring-2 focus:ring-[var(--color-forest)]/30 transition-all"
                                    />
                                </div>

                                {/* Filter chips */}
                                <div className="flex gap-2.5 flex-wrap">
                                    {FILTERS.map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setActiveFilter(filter)}
                                            className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95
                                            ${activeFilter === filter
                                                    ? "bg-[var(--color-forest)] text-white shadow-sm"
                                                    : "bg-white border border-neutral-200 text-neutral-500 hover:border-[var(--color-forest)]/40 hover:text-[var(--color-forest)]"
                                                }`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>

                                {deleteError && (
                                    <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-[13px]">
                                        <AlertCircle size={15} className="shrink-0" />
                                        {deleteError}
                                    </div>
                                )}
                            </header>

                            {/* Session list */}
                            <div className="space-y-4">
                                {isLoading ? (
                                    <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center flex flex-col items-center gap-3">
                                        <Loader2 size={24} className="text-[var(--color-forest)] animate-spin" />
                                        <p className="text-[14px] text-neutral-500">Loading your sessions...</p>
                                    </div>
                                ) : loadError ? (
                                    <div className="bg-red-50/50 border border-red-200 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
                                        <AlertCircle size={24} className="text-red-500" />
                                        <p className="text-[14px] text-red-600">{loadError}</p>
                                    </div>
                                ) : filtered.length > 0 ? (
                                    filtered.map((session) => (
                                        <SessionCard
                                            key={session.id}
                                            session={session}
                                            onOpen={handleOpen}
                                            onDelete={session.source === "recall" ? handleDelete : undefined}
                                            isDeleting={deletingId === session.id}
                                        />
                                    ))
                                ) : SESSIONS.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-full bg-[var(--color-forest)]/10 text-[var(--color-forest)] flex items-center justify-center">
                                            <History size={24} />
                                        </div>
                                        <p className="text-[15px] font-semibold text-[var(--color-ink)]">
                                            No study sessions yet
                                        </p>
                                        <p className="text-[13px] text-neutral-500 max-w-xs">
                                            Once you start studying, your sessions will show up here so you can pick up where you left off.
                                        </p>
                                        <button
                                            onClick={() => navigate("/study")}
                                            className="mt-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--color-forest)] text-white hover:opacity-90 active:scale-95 transition-all"
                                        >
                                            Start a Study Session
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
                                        <p className="text-[14px] text-neutral-500">
                                            No sessions match “{query || activeFilter}” yet.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right column: summary sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Total study time */}
                            <section className="bg-[var(--color-forest)] text-white p-7 rounded-3xl relative overflow-hidden shadow-lg shadow-[var(--color-forest)]/20">
                                <div className="relative z-10">
                                    <h4 className="text-[12.5px] font-semibold uppercase tracking-wide opacity-80 mb-4">
                                        Total Study Time
                                    </h4>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span
                                            className="text-[40px] font-bold"
                                            style={{ fontFamily: "var(--font-display)" }}
                                        >
                                            {totalHoursLabel}
                                        </span>
                                        <span className="text-[20px] font-semibold opacity-90">hours</span>
                                    </div>
                                    <p className="flex items-center gap-1 text-[12.5px] opacity-80">
                                        <TrendingUp size={14} />
                                        Start studying to see your trend
                                    </p>
                                </div>
                                <Sparkles className="absolute -right-3 -bottom-3 opacity-10" size={110} />
                            </section>

                            {/* Monthly completion */}
                            <section className="bg-white p-7 rounded-3xl border border-neutral-100">
                                <h4 className="text-[12.5px] font-semibold uppercase tracking-wide text-neutral-400 mb-6">
                                    Monthly Completion
                                </h4>
                                <div className="flex items-center justify-between mb-7">
                                    <div>
                                        <span
                                            className="block text-[32px] font-bold text-[var(--color-forest)]"
                                            style={{ fontFamily: "var(--font-display)" }}
                                        >
                                            {completedCount}
                                        </span>
                                        <span className="text-[12.5px] text-neutral-500">Sessions completed</span>
                                    </div>
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                                            <circle cx="32" cy="32" r="27" fill="transparent" stroke="var(--color-input-bg)" strokeWidth="6" />
                                            <circle
                                                cx="32"
                                                cy="32"
                                                r="27"
                                                fill="transparent"
                                                stroke="var(--color-forest)"
                                                strokeWidth="6"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 27}
                                                strokeDashoffset={2 * Math.PI * 27 * (1 - completionPct / 100)}
                                            />
                                        </svg>
                                        <span className="absolute text-[13px] font-bold text-[var(--color-forest)]">
                                            {completionPct}%
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[12.5px]">
                                        <span className="text-neutral-500">Daily Goal</span>
                                        <span className="font-semibold text-[var(--color-ink)]">0/3 sessions</span>
                                    </div>
                                    <div className="h-2 w-full bg-[var(--color-input-bg)] rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--color-forest)] rounded-full" style={{ width: "0%" }} />
                                    </div>
                                </div>
                            </section>

                            {/* Promo card */}
                            <section className="bg-white p-6 rounded-3xl border border-neutral-100">
                                <div className="w-10 h-10 bg-[var(--color-forest)] rounded-xl flex items-center justify-center text-white mb-4">
                                    <Flame size={19} />
                                </div>
                                <h5
                                    className="text-[16.5px] font-semibold text-[var(--color-ink)] mb-2"
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    Keep your streak alive
                                </h5>
                                <p className="text-[12.5px] text-neutral-500 mb-4">
                                    Start a new session today to stay on track with your weekly goal.
                                </p>
                                <button
                                    onClick={() => navigate("/study")}
                                    className="text-[var(--color-forest)] text-[13px] font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all"
                                >
                                    New Study Session <ArrowUpRight size={16} />
                                </button>
                            </section>
                        </div>
                    </div>
                </main>
            </div>

            <BottomNav />
        </div>
    );
}