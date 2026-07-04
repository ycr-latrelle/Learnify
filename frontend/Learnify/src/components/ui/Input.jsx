import React from "react";

export function FieldLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label
        className="text-[11px] font-medium tracking-[0.12em] text-neutral-800"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {children}
      </label>
      {action}
    </div>
  );
}

// Icon + input "shell" with animated focus state.
// Usage: <Input icon={<AtSign size={17} />} type="email" placeholder="..." />
export default function Input({ icon, className = "", ...inputProps }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl bg-[var(--color-input-bg)] px-4 py-3.5 border border-transparent
      transition-all duration-200 ease-out
      focus-within:bg-white focus-within:border-[var(--color-forest)]/40 focus-within:shadow-[0_0_0_4px_rgba(59,92,46,0.10)]
      focus-within:-translate-y-0.5"
    >
      {icon && (
        <span className="text-neutral-400 transition-colors duration-200">
          {icon}
        </span>
      )}
      <input
        {...inputProps}
        style={{ fontFamily: "var(--font-body)" }}
        className={`w-full bg-transparent outline-none text-[14.5px] placeholder:text-neutral-400 ${className}`}
      />
    </div>
  );
}