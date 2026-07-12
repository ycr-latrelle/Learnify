import React from "react";
import { NavLink } from "react-router-dom";
import { Home, BookOpen, CalendarDays, Users, Brain, User, MessageSquare } from "lucide-react";

// Same set as the desktop Sidebar, minus Messages — that one's a floating
// button instead (see MessagesFab below) so it stays reachable from every
// screen without needing to be "the active tab" first.
const MOBILE_NAV = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/sessions", label: "Sessions", icon: BookOpen },
    { to: "/my-sessions", label: "My Sessions", icon: CalendarDays },
    { to: "/friends", label: "Friends", icon: Users },
    { to: "/study", label: "Study", icon: Brain },
    { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
    return (
        <>
            <nav
                className="fixed bottom-0 left-0 w-full z-50 flex md:hidden items-stretch justify-between
                px-1 py-2 bg-white shadow-lg border-t border-[#c3c9ba] rounded-t-2xl"
                style={{ fontFamily: "var(--font-body)" }}
            >
                {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center justify-center gap-0.5 px-0.5 py-1 rounded-xl
                            transition-all duration-150 text-[9.5px] leading-tight font-medium text-center ${isActive
                                ? "text-[var(--color-forest)] font-semibold"
                                : "text-[#73796c]"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                                <span className="truncate w-full">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <MessagesFab />
        </>
    );
}

// Fixed above the bottom nav bar (not one of its tabs) so Messages stays
// one tap away from anywhere on mobile, the same "always reachable"
// treatment chat gets in most apps rather than being buried as a 7th tab
// squeezed in with the rest.
function MessagesFab() {
    return (
        <NavLink
            to="/messages"
            aria-label="Messages"
            className={({ isActive }) =>
                `md:hidden fixed z-50 flex items-center justify-center w-14 h-14 rounded-full
                shadow-lg transition-transform active:scale-95 ${isActive
                    ? "bg-[var(--color-forest-dark,var(--color-forest))] text-white ring-4 ring-[var(--color-forest)]/20"
                    : "bg-[var(--color-forest)] text-white"
                }`
            }
            style={{
                bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
                right: "1rem",
            }}
        >
            <MessageSquare size={22} />
        </NavLink>
    );
}