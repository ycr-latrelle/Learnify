import React from "react";
import { NavLink } from "react-router-dom";
import {
  GraduationCap,
  Home,
  NotebookText,
  MessageCircle,
  Bookmark,
  UserCircle2,
  Settings,
  ChevronsUpDown,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/sessions", label: "Sessions", icon: GraduationCap },
  { to: "/my-sessions", label: "My Sessions", icon: NotebookText },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];

// Desktop-only side navigation. Active state comes from the router
// (NavLink) instead of a hand-written class list, so there's exactly one
// sidebar in the DOM and its "active" item updates itself on navigation —
// nothing here needs to re-inject or duplicate markup.
export default function AppSidebar({ user }) {
  return (
    <aside
      className="hidden md:flex flex-col h-screen py-6 px-3 bg-white border-r border-[var(--color-input-bg)] w-64 flex-shrink-0"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div className="px-3 mb-8">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-[var(--color-forest)]" size={26} />
          <h1
            className="text-[22px] font-bold text-[var(--color-forest-dark)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Learnify
          </h1>
        </div>
        <p className="text-[11px] font-semibold tracking-wide text-neutral-400 mt-1">
          ACADEMIC MANAGEMENT
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 px-3 mx-1 rounded-xl text-[14px] font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-[var(--color-sage)]/25 text-[var(--color-forest-dark)] font-semibold"
                  : "text-neutral-500 hover:text-[var(--color-forest-dark)] hover:bg-[var(--color-input-bg)]"
              }`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-[var(--color-input-bg)]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 py-2.5 px-3 mx-1 rounded-xl text-[14px] font-medium transition-colors duration-150 ${
              isActive
                ? "bg-[var(--color-sage)]/25 text-[var(--color-forest-dark)] font-semibold"
                : "text-neutral-500 hover:text-[var(--color-forest-dark)] hover:bg-[var(--color-input-bg)]"
            }`
          }
        >
          <Settings size={19} />
          <span>Settings</span>
        </NavLink>

        <div className="mt-3 p-2 bg-[var(--color-input-bg)] rounded-2xl flex items-center gap-2.5">
          <img
            className="w-10 h-10 rounded-full border-2 border-[var(--color-sage)] object-cover"
            src={user.avatarUrl}
            alt={`${user.name} avatar`}
          />
          <div className="overflow-hidden">
            <p className="text-[13px] font-bold truncate text-[var(--color-ink)]">
              {user.name}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
          </div>
          <ChevronsUpDown className="ml-auto text-neutral-400" size={16} />
        </div>
      </div>
    </aside>
  );
}
