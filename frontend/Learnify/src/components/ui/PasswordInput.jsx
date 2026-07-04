import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

// Same shell styling as Input, plus a show/hide toggle.
export default function PasswordInput({ placeholder, ...props }) {
    const [visible, setVisible] = useState(false);

    return (
        <div
            className="flex items-center gap-3 rounded-xl bg-[var(--color-input-bg)] px-4 py-3.5 border border-transparent
      transition-all duration-200 ease-out
      focus-within:bg-white focus-within:border-[var(--color-forest)]/40 focus-within:shadow-[0_0_0_4px_rgba(59,92,46,0.10)]
      focus-within:-translate-y-0.5"
        >
            <Lock size={17} className="text-neutral-400" />
            <input
                {...props}
                type={visible ? "text" : "password"}
                placeholder={placeholder}
                style={{ fontFamily: "var(--font-body)" }}
                className="w-full bg-transparent outline-none text-[14.5px] placeholder:text-neutral-400"
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={visible ? "Hide password" : "Show password"}
            >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
    );
}