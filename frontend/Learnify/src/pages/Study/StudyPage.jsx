import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    Zap,
    Sparkles,
    UploadCloud,
    GraduationCap,
    ListChecks,
    Clock,
    NotebookPen,
    Terminal,
    BarChart3,
    ArrowRight,
    Loader2,
    FileCheck2,
    X,
    AlertCircle,
    Lightbulb,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import BottomNav from "../../components/layout/BottomNav";
import { getSidebarUser } from "../../services/authApi";
import { analyzeFile, generateActiveRecallQuestions, saveActiveRecallAttempt } from "../../services/studyApi";
import ActiveRecallSetupModal from "./ActiveRecall/ActiveRecallSetupModal";
import ActiveRecallQuiz from "./ActiveRecall/ActiveRecallQuiz";
import ActiveRecallResults from "./ActiveRecall/ActiveRecallResults";
import heroImage from "../../assets/hero.png";

// Accepted at the file-picker level so the OS dialog itself filters the
// obviously-wrong stuff — the real validation (including the friendlier
// ".doc isn't supported, re-save as .docx" message) still happens
// server-side, this is just a first pass to cut down on round trips.
const ACCEPTED_FILE_TYPES = ".pdf,.docx,.pptx,.txt";

const LEARNING_METHODS = [
    { label: "AI Tutor", icon: GraduationCap, variant: "primary" },
    { label: "Active Recall", icon: ListChecks, variant: "tertiary" },
    { label: "Spaced Rep", icon: Clock, variant: "outline" },
    { label: "Note Taking", icon: NotebookPen, variant: "grid" },
    { label: "Simulation", icon: Terminal, variant: "surface" },
];

const SUBJECT_PROGRESS = [
    { label: "Organic Chemistry", pct: 88 },
    { label: "Advanced Calculus", pct: 45 },
    { label: "Macroeconomics", pct: 60 },
];

function MethodCard({ label, icon: Icon, variant, active, onClick }) {
    const base =
        "group flex flex-col items-center text-center gap-2 rounded-2xl p-4 cursor-pointer transition-all duration-150";
    const variants = {
        primary: "border-2 border-[var(--color-forest)] hover:bg-[var(--color-forest)]/10",
        tertiary: "bg-[var(--color-input-bg)] hover:bg-[var(--color-forest)] hover:text-white",
        outline: "border border-neutral-200 hover:bg-neutral-50",
        grid: "border border-neutral-200 hover:shadow-md",
        surface: "bg-[var(--color-input-bg)] hover:bg-[var(--color-forest)] hover:text-white",
    };
    return (
        <div
            onClick={onClick}
            className={`${base} ${variants[variant]} ${active ? "ring-4 ring-[var(--color-forest)]/20 scale-[1.03]" : ""}`}
        >
            <Icon size={20} className={variant === "primary" ? "text-[var(--color-forest)]" : ""} />
            <span className="text-[12.5px] font-semibold">{label}</span>
        </div>
    );
}

function ProgressRing({ percent }) {
    const r = 58;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - percent / 100);
    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={r} fill="transparent" stroke="var(--color-input-bg)" strokeWidth="10" />
                <circle
                    cx="64"
                    cy="64"
                    r={r}
                    fill="transparent"
                    stroke="var(--color-forest)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="text-[24px] font-semibold text-[var(--color-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                >
                    {percent}%
                </span>
                <span
                    className="text-[9.5px] uppercase font-semibold text-neutral-400 tracking-wide"
                    style={{ fontFamily: "var(--font-mono)" }}
                >
                    Daily Goal
                </span>
            </div>
        </div>
    );
}

// Fills left-to-right over `seconds`, then swaps to a "ready" state. Pure
// CSS transition (not a JS interval re-rendering every tick) so it's cheap
// and stays smooth even if the tab is busy.
function RetryCountdown({ seconds = 20 }) {
    const [isReady, setIsReady] = useState(false);
    const [started, setStarted] = useState(false);

    // Two-step start: render at 0% first, then flip to 100% on the next
    // frame so the browser actually animates the transition instead of
    // snapping straight to full (which happens if width goes 0 -> 100 in
    // the same paint).
    React.useEffect(() => {
        const raf = requestAnimationFrame(() => setStarted(true));
        const timer = setTimeout(() => setIsReady(true), seconds * 1000);
        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timer);
        };
    }, [seconds]);

    return (
        <div className="mt-1">
            <div className="h-1 w-full bg-amber-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                        width: isReady ? "100%" : started ? "100%" : "0%",
                        transition: isReady ? "none" : `width ${seconds}s linear`,
                    }}
                />
            </div>
            <p className="text-[10px] text-amber-600 mt-1">
                {isReady
                    ? "You can try again now."
                    : `Rate limits reset shortly — you can retry in about ${seconds}s.`}
            </p>
        </div>
    );
}


// null when extraction succeeded but the AI step failed (HTTP 207) — that's
// shown as a small notice rather than hidden, so the person knows their
// file was read but summarization didn't happen this time.
function UploadedFileCard({ result, onRemove }) {
    const { file, analysis } = result;

    const stats = [
        `${file.wordCount.toLocaleString()} words`,
        file.pageCount != null && `${file.pageCount} page${file.pageCount === 1 ? "" : "s"}`,
        file.slideCount != null && `${file.slideCount} slide${file.slideCount === 1 ? "" : "s"}`,
    ].filter(Boolean);

    return (
        <div className="flex-1 min-w-[220px] border-2 border-[var(--color-forest)]/30 bg-[var(--color-forest)]/5 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <FileCheck2 size={18} className="text-[var(--color-forest)] shrink-0" />
                    <span className="text-[13.5px] font-semibold text-[var(--color-ink)] truncate">
                        {file.filename}
                    </span>
                </div>
                <button
                    onClick={onRemove}
                    className="shrink-0 p-1 rounded-full hover:bg-black/5 text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label="Remove uploaded file"
                >
                    <X size={16} />
                </button>
            </div>
            <p className="text-[11.5px] text-neutral-500">{stats.join(" • ")}</p>

            {analysis ? (
                <>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Lightbulb size={13} className="text-[var(--color-forest)]" />
                        <span className="text-[11.5px] font-semibold text-[var(--color-forest)] uppercase tracking-wide">
                            {analysis.topic || "Summary"}
                        </span>
                    </div>
                    <p className="text-[12px] text-neutral-600 max-h-24 overflow-y-auto pr-1 text-left">
                        {analysis.summary}
                    </p>
                    {analysis.keyConcepts?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {analysis.keyConcepts.slice(0, 5).map((concept) => (
                                <span
                                    key={concept}
                                    className="text-[10.5px] bg-white border border-[var(--color-forest)]/20 text-[var(--color-ink)] px-2 py-0.5 rounded-full"
                                >
                                    {concept}
                                </span>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <p className="text-[12px] text-neutral-500 max-h-24 overflow-y-auto pr-1 text-left">
                    {file.preview}
                </p>
            )}

            {file.truncated && (
                <p className="text-[10.5px] text-amber-600">
                    Only the first part of this file was analyzed — it was longer than the current limit.
                </p>
            )}
            {!analysis && (
                <>
                    <p className="text-[10.5px] text-amber-600">
                        The file was read successfully, but AI summarization didn't complete this time. You can remove and re-upload to try again.
                    </p>
                    <RetryCountdown seconds={20} />
                </>
            )}
        </div>
    );
}

export default function StudyPage() {
    const [activeMethod, setActiveMethod] = useState("AI Tutor");
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState("");
    // What the person says they already know about the file's contents —
    // not sent anywhere yet, but kept as real state (not an uncontrolled
    // <select>) so it's ready to pass along once the backend/AI prompt
    // takes a level into account.
    const [understandingLevel, setUnderstandingLevel] = useState("None");
    const [topicInput, setTopicInput] = useState("");
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const user = getSidebarUser();
    const firstName = user?.name?.split(" ")[0] || "there";

    function handleStartSession() {
        // Pass along whatever's available so the tutor opens already
        // primed: a typed-in topic, and/or the last file's AI analysis
        // (topic/difficulty/keyConcepts/suggestedQuestions) if one exists.
        navigate("/study/tutor", {
            state: {
                topic: topicInput.trim() || undefined,
                analysis: uploadResult?.analysis || undefined,
            },
        });
    }

    // Active Recall flow: null (closed) -> "setup" -> "quiz" -> "results"
    const [recallStage, setRecallStage] = useState(null);
    const [recallConfig, setRecallConfig] = useState(null);
    const [recallQuestions, setRecallQuestions] = useState([]);
    const [recallResults, setRecallResults] = useState([]);
    const [recallError, setRecallError] = useState("");
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

    async function handleStartActiveRecall(config) {
        setRecallConfig(config);
        setRecallError("");
        setIsGeneratingQuiz(true);
        try {
            const questions = await generateActiveRecallQuestions({
                ...config,
                // Ground the quiz in the uploaded file's actual text, if
                // there is one — falls back to the model's general
                // knowledge of the topic otherwise.
                sourceText: uploadResult?.file?.extractedText,
            });
            setRecallQuestions(questions);
            setRecallStage("quiz");
        } catch (err) {
            setRecallError(err.message || "Couldn't generate quiz questions.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    }

    function handleRecallComplete(results) {
        setRecallResults(results);
        setRecallStage("results");

        // Fire-and-forget: the results screen is already showing the score
        // from `results` directly, so a save failure here shouldn't block
        // or interrupt that — it would just mean this attempt doesn't show
        // up in My Sessions history later.
        if (recallConfig) {
            const correctCount = results.filter((r) => r.correct).length;
            saveActiveRecallAttempt({
                topic: recallConfig.topic,
                difficulty: recallConfig.difficulty,
                questionCount: results.length,
                correctCount,
            }).catch((err) => {
                console.error("[StudyPage] Failed to save Active Recall attempt:", err);
            });
        }
    }

    function closeActiveRecall() {
        setRecallStage(null);
        setRecallQuestions([]);
        setRecallResults([]);
        setRecallError("");
    }

    async function handleFile(file) {
        if (!file) return;
        setIsUploading(true);
        setUploadError("");
        setUploadResult(null);
        try {
            const result = await analyzeFile(file);
            setUploadResult(result);
        } catch (err) {
            setUploadError(err.message || "Couldn't analyze that file.");
        } finally {
            setIsUploading(false);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        handleFile(file);
    }

    function handleBrowseClick() {
        fileInputRef.current?.click();
    }

    function handleFileInputChange(e) {
        const file = e.target.files?.[0];
        handleFile(file);
        // Reset so picking the same file again (e.g. after removing it)
        // still fires onChange instead of being a no-op.
        e.target.value = "";
    }

    function handleRemoveFile() {
        setUploadResult(null);
        setUploadError("");
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
                            placeholder="Search resources, notes, or help..."
                            className="w-full bg-[var(--color-input-bg)] rounded-full pl-10 pr-4 py-2.5 text-[14px] outline-none
                            focus:ring-2 focus:ring-[var(--color-forest)]/30 transition-all"
                        />
                    </div>
                </header>

                <main className="flex-1 px-6 md:px-8 py-8 pb-28 md:pb-10">
                    {recallStage === "quiz" && recallConfig ? (
                        <ActiveRecallQuiz
                            topic={recallConfig.topic}
                            difficulty={recallConfig.difficulty}
                            questions={recallQuestions}
                            onExit={closeActiveRecall}
                            onComplete={handleRecallComplete}
                        />
                    ) : recallStage === "results" && recallConfig ? (
                        <ActiveRecallResults
                            topic={recallConfig.topic}
                            results={recallResults}
                            onRetry={() => setRecallStage("setup")}
                            onExit={closeActiveRecall}
                        />
                    ) : (<div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left column */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Greeting */}
                            <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div>
                                    <h2
                                        className="text-[28px] md:text-[32px] font-semibold text-[var(--color-ink)]"
                                        style={{ fontFamily: "var(--font-display)" }}
                                    >
                                        Good morning, {firstName}!
                                    </h2>
                                    <p className="text-[15px] text-neutral-500 mt-1">
                                        Ready to master something new? Your cognitive focus is at its peak right now.
                                    </p>
                                </div>
                                <button
                                    onClick={handleStartSession}
                                    className="group flex items-center gap-2 bg-[var(--color-forest)] text-white px-6 py-3.5 rounded-full
                                    text-[14px] font-semibold shadow-lg hover:shadow-[var(--color-forest)]/30 hover:-translate-y-0.5
                                    transition-all flex-shrink-0"
                                >
                                    <Zap size={17} className="group-hover:rotate-12 transition-transform" />
                                    Start Study Session
                                </button>
                            </section>

                            {/* Study input centerpiece */}
                            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-[var(--shadow-card)] border border-neutral-100">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="bg-[var(--color-forest)]/10 text-[var(--color-forest)] p-3 rounded-2xl flex-shrink-0">
                                        <Sparkles size={20} />
                                    </div>
                                    <h3
                                        className="text-[19px] font-semibold text-[var(--color-ink)] pt-1.5"
                                        style={{ fontFamily: "var(--font-display)" }}
                                    >
                                        What do you want to study today?
                                    </h3>
                                </div>

                                <input
                                    type="text"
                                    value={topicInput}
                                    onChange={(e) => setTopicInput(e.target.value)}
                                    placeholder="E.g., Quantum Mechanics, Renaissance Art, Python Fundamentals..."
                                    className="w-full bg-[var(--color-input-bg)] rounded-xl px-4 py-3.5 text-[14.5px] outline-none mb-4
                                    focus:ring-2 focus:ring-[var(--color-forest)]/30 transition-all"
                                />

                                <div className="flex flex-col md:flex-row gap-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={ACCEPTED_FILE_TYPES}
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />

                                    {uploadResult ? (
                                        <UploadedFileCard result={uploadResult} onRemove={handleRemoveFile} />
                                    ) : (
                                        <div
                                            onClick={isUploading ? undefined : handleBrowseClick}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                if (!isUploading) setIsDraggingOver(true);
                                            }}
                                            onDragLeave={() => setIsDraggingOver(false)}
                                            onDrop={isUploading ? undefined : handleDrop}
                                            className={`flex-1 min-w-[220px] border-2 border-dashed rounded-2xl p-6
                                            flex flex-col items-center justify-center gap-2 text-center transition-all
                                            ${isUploading ? "cursor-wait opacity-70" : "cursor-pointer"}
                                            ${isDraggingOver
                                                    ? "border-[var(--color-forest)] bg-[var(--color-forest)]/10"
                                                    : uploadError
                                                        ? "border-red-300 bg-red-50/50 hover:border-red-400"
                                                        : "border-neutral-200 hover:border-[var(--color-forest)] hover:bg-[var(--color-forest)]/5"
                                                }`}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 size={20} className="text-[var(--color-forest)] animate-spin" />
                                                    <p className="text-[12.5px] text-neutral-500">Analyzing file...</p>
                                                </>
                                            ) : uploadError ? (
                                                <>
                                                    <AlertCircle size={20} className="text-red-500" />
                                                    <p className="text-[12.5px] text-red-600 max-w-[240px]">{uploadError}</p>
                                                    <p className="text-[11px] text-neutral-400">Click or drop a file to try again</p>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud size={20} className="text-neutral-400" />
                                                    <p className="text-[12.5px] text-neutral-500">
                                                        Drop PDFs, notes, or lecture slides here
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div className="w-full md:w-52">
                                        <label className="block text-[12px] font-medium text-neutral-500 mb-2">
                                            Your Understanding of This Content
                                        </label>
                                        <select
                                            value={understandingLevel}
                                            onChange={(e) => setUnderstandingLevel(e.target.value)}
                                            className="w-full bg-[var(--color-input-bg)] rounded-xl py-3 px-4 text-[14px] font-medium
                                            outline-none focus:ring-2 focus:ring-[var(--color-forest)]/30 transition-all"
                                        >
                                            <option value="None">None</option>
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Learning methods */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                                    {LEARNING_METHODS.map((m) => (
                                        <MethodCard
                                            key={m.label}
                                            {...m}
                                            active={activeMethod === m.label}
                                            onClick={() => {
                                                setActiveMethod(m.label);
                                                if (m.label === "Active Recall") {
                                                    setRecallError("");
                                                    setRecallStage("setup");
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* Featured modules */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div
                                    className="bg-white rounded-3xl p-6 shadow-[var(--shadow-card)] flex flex-col justify-between h-60
                                    border-l-[6px] border-[var(--color-forest)]"
                                >
                                    <div>
                                        <span className="bg-[var(--color-forest)]/10 text-[var(--color-forest)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                            Ongoing
                                        </span>
                                        <h4
                                            className="text-[19px] font-semibold text-[var(--color-ink)] mt-3"
                                            style={{ fontFamily: "var(--font-display)" }}
                                        >
                                            Molecular Biology II
                                        </h4>
                                        <p className="text-neutral-500 text-[14px] mt-1.5">
                                            Resume where you left off with Protein Synthesis.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[var(--color-sage)]" />
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-[var(--color-forest)]/60" />
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-300" />
                                        </div>
                                        <button className="text-[var(--color-forest)] text-[13.5px] font-semibold flex items-center gap-1 hover:underline underline-offset-4">
                                            Continue Study <ArrowRight size={15} />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative rounded-3xl overflow-hidden h-60 group shadow-[var(--shadow-card)]">
                                    <img
                                        src={heroImage}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-forest-dark)]/85 to-transparent p-6 flex flex-col justify-end">
                                        <h4 className="text-[19px] font-semibold text-white">Visual Learning Library</h4>
                                        <p className="text-white/80 text-[13.5px] mt-1">
                                            Explore 500+ curated academic diagrams.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right column */}
                        <div className="lg:col-span-4 space-y-6">
                            <section className="bg-white rounded-3xl p-6 shadow-[var(--shadow-card)] border border-neutral-100">
                                <h3
                                    className="text-[17px] font-semibold text-[var(--color-ink)] mb-6 flex items-center justify-between"
                                    style={{ fontFamily: "var(--font-display)" }}
                                >
                                    My Progress
                                    <BarChart3 size={18} className="text-[var(--color-forest)]" />
                                </h3>

                                <div className="flex flex-col items-center mb-7">
                                    <ProgressRing percent={72} />
                                    <p className="text-center text-[13px] text-neutral-500 mt-4">
                                        2.4 hours studied today. Keep it up!
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {SUBJECT_PROGRESS.map(({ label, pct }) => (
                                        <div key={label}>
                                            <div className="flex justify-between text-[12.5px] mb-1.5">
                                                <span className="text-neutral-600">{label}</span>
                                                <span className="font-semibold text-[var(--color-ink)]">{pct}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-[var(--color-input-bg)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[var(--color-forest)] rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                    )}
                </main>
            </div>

            <BottomNav />

            <ActiveRecallSetupModal
                topic={uploadResult?.analysis?.topic || "General Review"}
                isOpen={recallStage === "setup"}
                onClose={closeActiveRecall}
                onStart={handleStartActiveRecall}
            />

            {isGeneratingQuiz && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl px-8 py-6 flex items-center gap-3 shadow-2xl">
                        <Loader2 size={20} className="animate-spin text-[var(--color-forest)]" />
                        <span className="text-[14px] font-medium text-[var(--color-ink)]">
                            Generating your quiz...
                        </span>
                    </div>
                </div>
            )}

            {recallError && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-red-50 border border-red-200 text-red-700 text-[13px] px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    {recallError}
                    <button
                        onClick={() => setRecallError("")}
                        className="ml-2 text-red-400 hover:text-red-600"
                        aria-label="Dismiss"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}