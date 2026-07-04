import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, Library, UserCircle2 } from "lucide-react";

const TABS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/sessions", label: "Sessions", icon: Users },
  { to: "/study", label: "Study", icon: Library },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];

export default function AppMobileBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 flex md:hidden justify-around items-center py-2.5 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)] border-t border-[var(--color-input-bg)] rounded-t-2xl"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[11px] font-medium transition-transform active:scale-95 ${
              isActive ? "text-[var(--color-forest)] font-bold" : "text-neutral-400"
            }`
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
