import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Circle } from "lucide-react";

/**
 * The active quiz screen. Fully driven by `questions` — no sample content
 * baked in. Expected shape per question:
 *   {
 *     id: string,
 *     question: string,
 *     choices: [{ id: string, text: string }],
 *     correctChoiceId: string,
 *   }
 *
 * Answer feedback is immediate: picking a choice locks that question and
 * shows correct (green) / incorrect (red, with the correct one still
 * marked) before "Next" advances.
 *
 * `onComplete(results)` fires after the last question's "Next" is clicked,
 * with results = [{ questionId, choiceId, correct }].
 */
export default function ActiveRecallQuiz({ topic, difficulty, questions, onExit, onComplete }) {
    const [index, setIndex] = useState(0);
    const [selectedByQuestion, setSelectedByQuestion] = useState({});
    const [results, setResults] = useState([]);

    const total = questions.length;
    const current = questions[index];
    const selectedChoiceId = selectedByQuestion[current?.id];
    const hasAnswered = selectedChoiceId !== undefined;
    const isLast = index === total - 1;
    const progressPct = total > 0 ? Math.round(((index + (hasAnswered ? 1 : 0)) / total) * 100) : 0;

    if (!current) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <p className="text-neutral-500">No questions to show.</p>
                <button
                    onClick={onExit}
                    className="mt-4 text-[var(--color-forest)] font-semibold hover:underline"
                >
                    Go back
                </button>
            </div>
        );
    }

    function handleSelect(choiceId) {
        if (hasAnswered) return; // locked after first pick, same as a real recall drill
        setSelectedByQuestion((prev) => ({ ...prev, [current.id]: choiceId }));
    }

    function handleNext() {
        const record = {
            questionId: current.id,
            choiceId: selectedChoiceId,
            correct: selectedChoiceId === current.correctChoiceId,
        };
        const nextResults = [...results, record];
        setResults(nextResults);

        if (isLast) {
            onComplete?.(nextResults);
        } else {
            setIndex((i) => i + 1);
        }
    }

    return (
        <div className="max-w-[1280px] mx-auto">
            <header className="flex justify-between items-center mb-6 md:mb-8">
                <div className="flex items-center gap-3 md:gap-4">
                    <button
                        onClick={onExit}
                        className="text-[var(--color-forest)] hover:opacity-70 transition-opacity"
                        aria-label="Exit session"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <h2
                        className="text-[22px] md:text-[28px] font-semibold text-[var(--color-ink)]"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        Active Recall
                    </h2>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                {/* Question panel */}
                <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-3xl shadow-[var(--shadow-card)] border border-neutral-100">
                    <div className="w-full h-3 bg-[var(--color-input-bg)] rounded-full mb-6 md:mb-8 overflow-hidden">
                        <div
                            className="h-full bg-[var(--color-forest)] transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    <p className="text-[13px] font-medium text-neutral-400 mb-2">
                        Question {index + 1} of {total}
                    </p>
                    <h3
                        className="text-[19px] md:text-[22px] font-semibold text-[var(--color-ink)] mb-6 md:mb-8"
                        style={{ fontFamily: "var(--font-display)" }}
                    >
                        {current.question}
                    </h3>

                    <div className="space-y-3 md:space-y-4">
                        {current.choices.map((choice) => {
                            const isSelected = selectedChoiceId === choice.id;
                            const isCorrectChoice = choice.id === current.correctChoiceId;

                            let stateClasses = "border-neutral-200 hover:border-[var(--color-forest)]/40";
                            let icon = null;

                            if (hasAnswered) {
                                if (isCorrectChoice) {
                                    stateClasses = "border-2 border-[var(--color-forest)] bg-[var(--color-forest)]/5";
                                    icon = <CheckCircle2 size={20} className="text-[var(--color-forest)]" />;
                                } else if (isSelected) {
                                    stateClasses = "border-2 border-red-300 bg-red-50";
                                    icon = <XCircle size={20} className="text-red-500" />;
                                } else {
                                    stateClasses = "border-neutral-200 opacity-60";
                                }
                            }

                            return (
                                <button
                                    key={choice.id}
                                    onClick={() => handleSelect(choice.id)}
                                    disabled={hasAnswered}
                                    className={`w-full text-left p-5 md:p-6 border rounded-2xl text-[14.5px] flex justify-between items-center gap-3 transition-all ${stateClasses} ${hasAnswered ? "cursor-default" : "cursor-pointer"
                                        }`}
                                >
                                    <span className="text-[var(--color-ink)]">{choice.text}</span>
                                    {icon ?? <Circle size={18} className="text-neutral-300 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {hasAnswered && (
                        <div className="mt-6 md:mt-8 flex justify-end">
                            <button
                                onClick={handleNext}
                                className="px-8 py-3.5 bg-[var(--color-forest)] text-white rounded-2xl text-[14px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
                            >
                                {isLast ? "Finish Session" : "Next Question"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Session info sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[var(--color-input-bg)] p-6 rounded-3xl border border-neutral-100">
                        <h4 className="text-[13px] font-semibold text-[var(--color-forest)] mb-4">
                            Session Info
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[12px] text-neutral-400">Topic</p>
                                <p className="text-[14.5px] text-[var(--color-ink)]">{topic}</p>
                            </div>
                            <div>
                                <p className="text-[12px] text-neutral-400">Difficulty</p>
                                <p className="text-[14.5px] text-[var(--color-ink)] capitalize">{difficulty}</p>
                            </div>
                            <div>
                                <p className="text-[12px] text-neutral-400">Progress</p>
                                <p className="text-[14.5px] text-[var(--color-ink)]">
                                    {results.length} / {total} answered
                                    {results.length > 0 &&
                                        ` · ${results.filter((r) => r.correct).length} correct`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}