import React from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";

// Compact top section shown only below the md breakpoint: a plain nav bar
// followed by a shallow gradient hero. The form sheet overlaps the bottom
// edge of this with a negative margin (see LoginPage/RegisterPage).
export default function AuthMobileHeader({ headline, sub, onBack }) {
    return (
        <div className="md:hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[var(--color-page-bg)]">
                <button
                    onClick={onBack}
                    aria-label="Go back"
                    className="p-1 -ml-1 text-[var(--color-forest-dark)]"
                >
                    <ArrowLeft size={22} />
                </button>
                <span
                    className="text-[19px] font-semibold"
                    style={{ color: "var(--color-forest-dark)", fontFamily: "var(--font-body)" }}
                >
                    Learnify
                </span>
                <button aria-label="More options" className="p-1 -mr-1 text-neutral-500">
                    <MoreVertical size={20} />
                </button>
            </div>

            <div
                className="relative px-6 pt-2 pb-16"
                style={{
                    background: "linear-gradient(160deg, #eef0c8 0%, #dde9bd 55%, #cfe0ae 100%)",
                }}
            >
                <h1
                    className="text-[28px] leading-[1.15] font-semibold mb-3"
                    style={{ color: "var(--color-forest-dark)", fontFamily: "var(--font-display)" }}
                >
                    {headline}
                </h1>
                <p
                    className="text-[14px] leading-relaxed text-[#3d4a2f]/90"
                    style={{ fontFamily: "var(--font-body)" }}
                >
                    {sub}
                </p>
            </div>
        </div>
    );
}