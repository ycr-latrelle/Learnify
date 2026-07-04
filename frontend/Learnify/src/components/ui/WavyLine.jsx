import React, { useMemo } from "react";

// A small animated "equalizer" — the one recurring visual signature of the
// auth flow. It's a literal nod to the copy ("rhythm of digital learning",
// "rhythmic study sessions") rather than a decorative flourish.
//
// Bar heights are deterministic (seeded) so the resting pattern always
// looks intentional rather than random noise.
export default function WavyLine({ className = "", style, barCount = 22 }) {
  const heights = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      const t = i / (barCount - 1);
      const wave = Math.sin(t * Math.PI * 2.4) * 0.5 + 0.5;
      return 0.3 + wave * 0.7;
    });
  }, [barCount]);

  return (
    <div
      className={`flex items-end gap-[3px] ${className}`}
      style={style}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="rhythm-bar w-[3px] rounded-full"
          style={{
            height: "28px",
            backgroundColor: "var(--color-forest)",
            opacity: 0.85,
            transformOrigin: "bottom",
            transform: `scaleY(${h})`,
            animation: `barPulse 2.4s ease-in-out ${(i % 8) * 0.09}s infinite`,
          }}
        />
      ))}
    </div>
  );
}