import React from "react";
import { Menu } from "lucide-react";
import WavyLine from "../ui/WavyLine";

// wavyPosition: "mid" (between headline and copy) or "bottom" (below copy)
export default function AuthBrandPanel({ headline, sub, wavyPosition = "mid" }) {
  return (
    <div
      className="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden px-16 py-14"
      style={{
        background: "linear-gradient(150deg, #eae478 0%, #cdda86 45%, #a4c96b 100%)",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Subtle grain so the gradient reads as a designed surface, not a flat CSS fill */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.05] mix-blend-overlay pointer-events-none" aria-hidden="true">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Soft color blooms for depth */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, #fff7c2 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--color-sage) 0%, transparent 70%)" }}
      />

      <div
        className="relative flex items-center gap-2.5"
        style={{ animation: "fadeSlideUp 0.6s ease both" }}
      >
        <Menu size={22} color="var(--color-forest-dark)" strokeWidth={2.5} />
        <span
          className="text-[21px] font-semibold tracking-tight"
          style={{ color: "var(--color-forest-dark)", fontFamily: "var(--font-body)" }}
        >
          Learnify
        </span>
      </div>

      <div className="relative max-w-md">
        <h1
          className="text-[44px] leading-[1.08] font-semibold tracking-tight mb-6"
          style={{
            color: "var(--color-forest-dark)",
            fontFamily: "var(--font-display)",
            animation: "fadeSlideUp 0.7s ease 0.08s both",
          }}
        >
          {headline}
        </h1>

        {wavyPosition === "mid" && (
          <WavyLine
            className="mb-6"
            style={{ animation: "fadeSlideUp 0.7s ease 0.18s both" }}
          />
        )}

        <p
          className="text-[15px] leading-relaxed text-[#3d4a2f]/90"
          style={{
            fontFamily: "var(--font-body)",
            animation: "fadeSlideUp 0.7s ease 0.22s both",
          }}
        >
          {sub}
        </p>

        {wavyPosition === "bottom" && (
          <WavyLine
            className="mt-8"
            style={{ animation: "fadeSlideUp 0.7s ease 0.3s both" }}
          />
        )}
      </div>

      <div
        className="relative text-[10px] tracking-[0.18em] font-medium text-[#4a5a38]"
        style={{
          fontFamily: "var(--font-mono)",
          animation: "fadeSlideUp 0.7s ease 0.32s both",
        }}
      >
        ESTABLISHED FOR DEPTH · 2024
      </div>
    </div>
  );
}