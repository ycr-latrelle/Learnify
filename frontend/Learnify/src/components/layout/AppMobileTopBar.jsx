import React from "react";
import { Bell } from "lucide-react";

// The single source of truth for "open the edit modal" is the onEditProfile
// callback passed in from the page — there's no querySelectorAll scanning
// the DOM for buttons by their text, so nothing can double-bind a handler.
export default function AppMobileTopBar({ title, onEditProfile }) {
  return (
    <header
      className="flex md:hidden justify-between items-center w-full px-4 py-3 bg-[var(--color-page-bg)]/90 backdrop-blur-md sticky top-0 z-40"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <h1
        className="text-[22px] font-extrabold text-[var(--color-forest-dark)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <button aria-label="Notifications" className="text-[var(--color-forest)]">
          <Bell size={22} />
        </button>
        <button
          onClick={onEditProfile}
          className="bg-[var(--color-forest)] text-white px-3 py-1.5 rounded-lg text-[12px] font-semibold"
        >
          Edit Profile
        </button>
      </div>
    </header>
  );
}
