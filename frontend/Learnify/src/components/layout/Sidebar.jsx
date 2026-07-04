import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    Home,
    BookOpen,
    CalendarDays,
    MessageSquare,
    Users,
    Bookmark,
    User,
    Settings,
    ChevronsUpDown,
    LogOut,
} from "lucide-react";
import { logoutUser } from "../../services/authApi";

const NAV_ITEMS = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/sessions", label: "Sessions", icon: BookOpen },
    { to: "/my-sessions", label: "My Sessions", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/friends", label: "Friends", icon: Users },
    { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { to: "/profile", label: "Profile", icon: User },
];

export default function Sidebar({ user }) {
    const [accountOpen, setAccountOpen] = useState(false);
    const navigate = useNavigate();

    const displayName = user?.name || "Your Account";
    const displayEmail = user?.email || "";
    const initials = displayName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";

    return (
        <aside
            className="hidden md:flex flex-col h-screen w-64 flex-shrink-0 border-r border-[var(--color-outline-variant)] bg-white"
            style={{ fontFamily: "var(--font-body)" }}
        >
            {/* Brand */}
            <div className="px-6 pt-7 pb-5">
                <div className="flex items-center gap-2.5 mb-1">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                            background:
                                "linear-gradient(135deg, #a4c96b 0%, #3b5c2e 100%)",
                        }}
                    >
                        <BookOpen size={15} color="white" strokeWidth={2.5} />
                    </div>
                    <span
                        className="text-[18px] font-bold tracking-tight"
                        style={{ color: "var(--color-forest)", fontFamily: "var(--font-body)" }}
                    >
                        Learnify
                    </span>
                </div>
                <p
                    className="text-[11px] tracking-[0.1em] pl-[42px]"
                    style={{ color: "#73796c", fontFamily: "var(--font-mono)" }}
                >
                    Academic Management
                </p>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 ${isActive
                                ? "text-white font-semibold"
                                : "text-[#43493e] hover:bg-[#e8e8e5] hover:text-[var(--color-forest)]"
                            }`
                        }
                        style={({ isActive }) =>
                            isActive
                                ? { background: "var(--color-forest)" }
                                : {}
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={18}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className="flex-shrink-0"
                                />
                                {label}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div
                className="mt-auto pt-3 border-t px-3 pb-4"
                style={{ borderColor: "var(--color-outline-variant, #c3c9ba)" }}
            >
                {/* Settings */}
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 mb-2 ${isActive
                            ? "text-white font-semibold"
                            : "text-[#43493e] hover:bg-[#e8e8e5] hover:text-[var(--color-forest)]"
                        }`
                    }
                    style={({ isActive }) =>
                        isActive ? { background: "var(--color-forest)" } : {}
                    }
                >
                    {({ isActive }) => (
                        <>
                            <Settings size={18} strokeWidth={isActive ? 2.5 : 2} />
                            Settings
                        </>
                    )}
                </NavLink>

                {/* User row */}
                <div className="relative">
                    <button
                        onClick={() => setAccountOpen((o) => !o)}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#eeeeeb] transition-colors text-left"
                    >
                        <div className="relative flex-shrink-0">
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                                style={{ background: "var(--color-forest)" }}
                            >
                                {initials}
                            </div>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#1a1c1b] truncate">
                                {displayName.split(" ")[0]} {displayName.split(" ").at(-1)?.[0]}.
                            </p>
                            <p className="text-[11.5px] text-[#73796c] truncate">{displayEmail}</p>
                        </div>
                        <ChevronsUpDown
                            size={14}
                            className={`text-[#73796c] flex-shrink-0 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {/* Dropdown */}
                    {accountOpen && (
                        <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 bg-white rounded-xl shadow-lg border border-[#c3c9ba] py-1.5 z-50">
                            <button
                                onClick={() => { navigate("/profile"); setAccountOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#1a1c1b] hover:bg-[#eeeeeb] transition-colors"
                            >
                                <User size={14} /> View Profile
                            </button>
                            <button
                                onClick={() => { navigate("/settings"); setAccountOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-[#1a1c1b] hover:bg-[#eeeeeb] transition-colors"
                            >
                                <Settings size={14} /> Settings
                            </button>
                            <div className="mx-3 border-t border-[#c3c9ba] my-1" />
                            <button
                                onClick={() => {
                                    logoutUser();
                                    setAccountOpen(false);
                                    // replace: true so "back" from /login doesn't
                                    // land the browser right back on a page the
                                    // ProtectedRoute would just bounce them out of.
                                    navigate("/login", { replace: true });
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <LogOut size={14} /> Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}