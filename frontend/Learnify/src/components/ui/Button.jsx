import React from "react";

export default function Button({
  children,
  className = "",
  type = "button",
  loading = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      {...props}
      style={{ fontFamily: "var(--font-body)" }}
      className={`w-full rounded-xl py-3.5 text-white font-semibold text-[15px] bg-[var(--color-forest)]
      transition-all duration-200 ease-out
      shadow-[0_10px_24px_-8px_rgba(36,57,29,0.45)]
      hover:brightness-110 hover:shadow-[0_14px_30px_-8px_rgba(36,57,29,0.55)] hover:-translate-y-0.5
      active:scale-[0.97] active:translate-y-0 active:brightness-95
      disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100 ${className}`}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}