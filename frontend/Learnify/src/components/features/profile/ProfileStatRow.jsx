import React from "react";

export default function ProfileStatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="text-[var(--color-forest)] p-2 bg-[var(--color-sage)]/15 rounded-lg flex items-center justify-center">
          <Icon size={17} />
        </span>
        <span className="text-[13px] text-neutral-500">{label}</span>
      </div>
      <span className="text-[13px] font-bold text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
