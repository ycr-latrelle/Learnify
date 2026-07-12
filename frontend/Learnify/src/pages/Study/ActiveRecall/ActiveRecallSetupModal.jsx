import { useState } from "react";
import { Brain, X, School, Lightbulb, Rocket, CheckCircle2, Play } from "lucide-react";

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];

const DIFFICULTY_OPTIONS = [
    {
        id: "beginner",
        label: "Beginner",
        icon: School,
        description: "Foundational concepts and basic terminology.",
    },
    {
        id: "intermediate",
        label: "Intermediate",
        icon: Lightbulb,
        description: "Application of theories and moderate logic.",
    },
    {
        id: "advanced",
        label: "Advanced",
        icon: Rocket,
        description: "Complex problem solving and edge cases.",
    },
];

/**
 * Configuration modal shown before an Active Recall session starts.
 *
 * `topic` is required — this is meant to be opened with a subject already
 * chosen (e.g. from the Study page's "what do you want to study" input, or
 * from a just-analyzed file's topic). `onStart` receives
 * { topic, questionCount, difficulty } so the caller can request the quiz
 * from wherever it's generated (an AI endpoint, most likely).
 */
export default function ActiveRecallSetupModal({
    topic,
    isOpen,
    onClose,
    onStart,
    defaultQuestionCount = 10,
    defaultDifficulty = "intermediate",
}) {
    const [questionCount, setQuestionCount] = useState(defaultQuestionCount);
    const [difficulty, setDifficulty] = useState(defaultDifficulty);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white/95 backdrop-blur-xl border border-[var(--color-forest)]/10 w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 md:mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Brain size={18} className="text-[var(--color-forest)]" />
                            <span className="text-[12px] font-semibold text-[var(--color-forest)] tracking-wider uppercase">
                                Active Recall Session
                            </span>
                        </div>
                        <h2
                            className="text-[24px] md:text-[28px] font-semibold text-[var(--color-ink)]"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            {topic}
                        </h2>
                        <p className="text-[14px] text-neutral-500 mt-1">
                            Configure your personalized AI study session
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-[var(--color-ink)] transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Question count */}
                <div className="mb-8 md:mb-10">
                    <label className="text-[13px] font-semibold text-[var(--color-ink)] block mb-3">
                        Number of Questions
                    </label>
                    <div className="flex bg-[var(--color-input-bg)] p-1.5 rounded-2xl">
                        {QUESTION_COUNT_OPTIONS.map((count) => (
                            <button
                                key={count}
                                onClick={() => setQuestionCount(count)}
                                className={`flex-1 py-3 rounded-xl text-[14px] transition-all ${questionCount === count
                                        ? "bg-[var(--color-forest)] text-white font-bold shadow-md"
                                        : "text-neutral-500 hover:bg-white/50 font-medium"
                                    }`}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty */}
                <div className="mb-8 md:mb-10">
                    <label className="text-[13px] font-semibold text-[var(--color-ink)] block mb-3">
                        Difficulty Level
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                        {DIFFICULTY_OPTIONS.map(({ id, label, icon: Icon, description }) => {
                            const selected = difficulty === id;
                            return (
                                <div
                                    key={id}
                                    onClick={() => setDifficulty(id)}
                                    className={`relative cursor-pointer p-5 rounded-2xl transition-all duration-150 ${selected
                                            ? "border-2 border-[var(--color-forest)] bg-[var(--color-forest)]/5"
                                            : "border border-neutral-200 hover:border-[var(--color-forest)]/50"
                                        }`}
                                >
                                    {selected && (
                                        <div className="absolute -top-2.5 -right-2.5">
                                            <CheckCircle2
                                                size={22}
                                                className="text-[var(--color-forest)] bg-white rounded-full"
                                                fill="white"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-colors ${selected
                                                ? "bg-[var(--color-forest)] text-white"
                                                : "bg-[var(--color-input-bg)] text-[var(--color-forest)]"
                                            }`}
                                    >
                                        <Icon size={20} />
                                    </div>
                                    <h4
                                        className={`text-[14px] font-semibold mb-1 ${selected ? "text-[var(--color-forest)]" : "text-[var(--color-ink)]"
                                            }`}
                                    >
                                        {label}
                                    </h4>
                                    <p className="text-[12px] text-neutral-500 leading-snug">{description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* CTAs */}
                <div className="flex items-center gap-4 pt-4 border-t border-neutral-200">
                    <button
                        onClick={() => onStart?.({ topic, questionCount, difficulty })}
                        className="flex-1 py-4 bg-[var(--color-forest)] text-white rounded-2xl text-[14px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        Start Session
                        <Play size={18} />
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-transparent border border-neutral-200 text-neutral-600 rounded-2xl text-[14px] font-medium hover:bg-[var(--color-input-bg)] transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}