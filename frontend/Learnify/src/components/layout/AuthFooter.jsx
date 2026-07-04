import React from "react";

export default function AuthFooter() {
  return (
    <div className="hidden md:flex items-center justify-between px-10 py-5 text-[10.5px] tracking-wide text-neutral-400">
      <div>
        BY JOINING, YOU AGREE TO OUR{" "}
        <span className="underline underline-offset-2 text-neutral-500 cursor-pointer">
          TERMS OF SERVICE
        </span>{" "}
        &amp;{" "}
        <span className="underline underline-offset-2 text-neutral-500 cursor-pointer">
          PRIVACY POLICY
        </span>
      </div>
      <div>© 2026 LEARNIFY. DESIGNED FOR FOCUS.</div>
    </div>
  );
}
