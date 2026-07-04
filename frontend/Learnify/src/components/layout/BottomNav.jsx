import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, BookMarked, User } from "lucide-react";

const MOBILE_NAV = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/sessions", label: "Sessions", icon: Users },
    { to: "/bookmarks", label: "Study", icon: BookMarked },
    { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
    return (
        <nav
            className="fixed bottom-0 left-0 w-full z-50 flex md:hidden justify-around items-center py-3 bg-white shadow-lg border-t border-[#c3c9ba] rounded-t-2xl"
            style={{ fontFamily: "var(--font-body)" }}
        >
            {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 text-[11px] font-medium ${isActive
                            ? "text-[var(--color-forest)] font-semibold"
                            : "text-[#73796c]"
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                            {label}
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}