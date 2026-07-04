import React from "react";

export default function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-[var(--color-forest)] cursor-pointer"
      />
      <span className="text-[13.5px] text-neutral-700 leading-snug">{label}</span>
    </label>
  );
}
