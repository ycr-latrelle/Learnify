import { Trophy, RotateCcw, ArrowLeft } from "lucide-react";

/**
 * `results` is exactly what ActiveRecallQuiz's onComplete hands you:
 *   [{ questionId, choiceId, correct }]
 */
export default function ActiveRecallResults({ topic, results, onRetry, onExit }) {
    const total = results.length;
    const correctCount = results.filter((r) => r.correct).length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
        <div className="max-w-xl mx-auto text-center bg-white p-8 md:p-12 rounded-3xl shadow-[var(--shadow-card)] border border-neutral-100">
            <div className="w-16 h-16 rounded-full bg-[var(--color-forest)]/10 flex items-center justify-center mx-auto mb-6">
                <Trophy size={28} className="text-[var(--color-forest)]" />
            </div>
            <p className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                {topic}
            </p>
            <h2
                className="text-[32px] font-semibold text-[var(--color-ink)] mb-2"
                style={{ fontFamily: "var(--font-display)" }}
            >
                {correctCount} / {total} correct
            </h2>
            <p className="text-neutral-500 mb-8">{pct}% on this round</p>

            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--color-forest)] text-white rounded-2xl text-[14px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
                >
                    <RotateCcw size={16} />
                    Try Again
                </button>
                <button
                    onClick={onExit}
                    className="flex items-center gap-2 px-6 py-3 border border-neutral-200 text-neutral-600 rounded-2xl text-[14px] font-medium hover:bg-[var(--color-input-bg)] transition-all"
                >
                    <ArrowLeft size={16} />
                    Back to Study
                </button>
            </div>
        </div>
    );
}