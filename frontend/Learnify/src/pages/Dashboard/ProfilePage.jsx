import React, { useState, useEffect } from "react";
import {
    Pencil,
    User,
    CalendarDays,
    BookOpen,
    Bookmark,
    Clock,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import BottomNav from "../../components/layout/BottomNav";
import EditProfileModal from "../../components/features/EditProfileModal";
import { getUserDetails, updateUserDetails } from "../../services/user_detailsAPI";
import { getCurrentUser } from "../../services/authApi";

// Genuinely blank — no placeholder person, no fabricated stats. Everything
// here either comes from the user_details row in Supabase or is left empty
// until the user fills it in via Edit Profile.
const EMPTY_USER = {
    name: "",
    email: "",
    fullName: "",
    dob: "",
    dobDisplay: "",
    gender: "",
    university: "",
    course: "",
    bio: "",
    memberSince: "", // derived from the real created_at column, not mocked
};

// Merges a Supabase user_details row (snake_case, as returned by the API)
// onto a base user object (camelCase, what the UI renders). Shared between
// the synchronous "seed from the session we already have" step and the
// async refresh below so both apply fields the same way.
function mergeDetails(base, details) {
    if (!details) return base;

    const dobDisplay = details.dob
        ? new Date(details.dob).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
        })
        : base.dobDisplay;

    const memberSince = details.created_at
        ? new Date(details.created_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        })
        : base.memberSince;

    return {
        ...base,
        fullName: details.full_name ?? base.fullName,
        name: details.full_name ?? base.name,
        email: details.email ?? base.email,
        bio: details.bio ?? base.bio,
        dob: details.dob ?? base.dob,
        dobDisplay,
        gender: details.gender ?? base.gender,
        university: details.university ?? base.university,
        course: details.course ?? base.course,
        memberSince,
    };
}

// ── Info row inside the identity card ───────────────────────────────────────
// Renders "—" instead of a blank cell for fields the user hasn't filled in
// yet, so an empty profile looks intentional rather than broken.
function InfoRow({ icon: Icon, label, value, last = false }) {
    return (
        <div
            className={`flex items-center justify-between py-2.5 ${!last ? "border-b border-[#c3c9ba]/30" : ""
                }`}
        >
            <div className="flex items-center gap-3 text-[#73796c]">
                <Icon size={17} style={{ color: "var(--color-forest)" }} className="flex-shrink-0" />
                <span className="text-[13.5px]">{label}</span>
            </div>
            <span className="text-[13.5px] font-bold text-[#1a1c1b] text-right max-w-[180px]">
                {value || "—"}
            </span>
        </div>
    );
}

// ── Stat row inside the summary card ────────────────────────────────────────
function StatRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center justify-between py-2.5 last:border-0">
            <div className="flex items-center gap-3">
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(168,210,142,0.2)" }}
                >
                    <Icon size={15} style={{ color: "var(--color-forest)" }} />
                </div>
                <span className="text-[13px] text-[#43493e]">{label}</span>
            </div>
            <span className="text-[13.5px] font-bold text-[#1a1c1b]">{value || "—"}</span>
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    // Seed synchronously from the profile the login/register call already
    // fetched (see authApi.persistSession) — this is why the page can show
    // real data on first paint instead of a mock person flashing first. The
    // effect below then refreshes it from the server in case the row
    // changed since the last login.
    const [user, setUser] = useState(() =>
        mergeDetails(EMPTY_USER, getCurrentUser()?.profile),
    );
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    // Refresh the profile from Supabase (via the .NET API) once we know
    // who's logged in, in case it's changed since the cached copy from
    // login. full_name, email, bio, dob, gender, university, course, and
    // created_at all live in the user_details table and round-trip for real.
    useEffect(() => {
        const uid = getCurrentUser()?.uid;
        if (!uid) return;

        getUserDetails(uid)
            .then((details) => {
                if (!details) return; // no profile row yet, or request failed
                setUser((u) => mergeDetails(u, details));
            })
            .catch((err) => {
                console.error("Failed to load profile:", err);
            });
    }, []);

    async function handleSave(formData) {
        setSaveError("");

        const uid = getCurrentUser()?.uid;

        // Derive a human-readable display string from the raw date input.
        const dobDisplay = formData.dob
            ? new Date(formData.dob).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
            })
            : "";

        // Update the UI immediately...
        setUser((u) => ({
            ...u,
            fullName: formData.fullName,
            name: formData.fullName,
            dob: formData.dob,
            dobDisplay,
            gender: formData.gender,
            university: formData.university,
            course: formData.course,
            bio: formData.bio,
        }));

        if (!uid) {
            console.warn("No uid found — can't save profile to Supabase.");
            return;
        }

        setSaving(true);
        try {
            await updateUserDetails(uid, {
                fullName: formData.fullName,
                bio: formData.bio,
                dob: formData.dob,
                gender: formData.gender,
                university: formData.university,
                course: formData.course,
            });
        } catch (err) {
            setSaveError(err.message || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    }

    const initials = user.name
        ? user.name
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "?";

    return (
        <div
            className="flex h-screen w-full bg-[#f9f9f6] overflow-hidden"
            style={{ fontFamily: "var(--font-body)" }}
        >
            <Sidebar user={user} />

            {/* Main scroll area */}
            <main className="flex-1 h-screen overflow-y-auto">

                {/* Mobile top bar */}
                <header className="flex md:hidden justify-between items-center w-full px-4 py-3 bg-[#f9f9f6]/80 backdrop-blur-md sticky top-0 z-40">
                    <h1
                        className="text-[22px] font-extrabold"
                        style={{ color: "var(--color-forest)", fontFamily: "var(--font-display)" }}
                    >
                        Learnify
                    </h1>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="bg-[var(--color-forest)] text-white px-4 py-1.5 rounded-lg text-[13px] font-semibold"
                    >
                        Edit Profile
                    </button>
                </header>

                <div className="max-w-[1100px] mx-auto px-5 md:px-16 py-8">

                    {/* Page header */}
                    <div
                        className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4"
                        style={{ animation: "fadeSlideUp 0.4s ease both" }}
                    >
                        <div>
                            <h2
                                className="text-[28px] font-semibold text-[#1a1c1b] tracking-tight"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                My Profile
                            </h2>
                            <p className="text-[14px] text-[#73796c] mt-1">
                                Manage your personal information and preferences.
                            </p>
                        </div>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="hidden md:flex items-center gap-1.5 px-4 py-2.5 border rounded-xl text-[13.5px] font-semibold transition-all hover:bg-[var(--color-forest)]/5 self-start"
                            style={{
                                borderColor: "var(--color-forest)",
                                color: "var(--color-forest)",
                            }}
                        >
                            <Pencil size={14} />
                            Edit Profile
                        </button>
                    </div>

                    {saveError && (
                        <p className="mb-4 text-[13.5px] text-red-600" role="alert">
                            {saveError}
                        </p>
                    )}

                    {/* Bento grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                        {/* ── Identity card (8 cols) ──────────────────────────────── */}
                        <div
                            className="lg:col-span-8 bg-white rounded-2xl border border-[#c3c9ba] p-6 flex flex-col md:flex-row gap-8"
                            style={{
                                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                                animation: "fadeSlideUp 0.45s ease 0.05s both",
                            }}
                        >
                            {/* Avatar column */}
                            <div className="flex flex-col items-center gap-3 md:w-[180px] flex-shrink-0">
                                <div className="relative">
                                    {/* Gradient ring */}
                                    <div
                                        className="w-[140px] h-[140px] rounded-full p-[3px]"
                                        style={{
                                            background: "linear-gradient(135deg, #a8d28e, #436830)",
                                        }}
                                    >
                                        <div className="w-full h-full rounded-full bg-[#e8f4d0] flex items-center justify-center overflow-hidden">
                                            <span
                                                className="text-[40px] font-bold"
                                                style={{
                                                    color: "var(--color-forest)",
                                                    fontFamily: "var(--font-display)",
                                                }}
                                            >
                                                {initials}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Camera button */}
                                    <button
                                        className="absolute bottom-2 right-2 bg-white border border-[#c3c9ba] p-2 rounded-full shadow-md hover:bg-[#eeeeeb] transition-colors"
                                        aria-label="Change photo"
                                    >
                                        <BookOpen size={16} style={{ color: "var(--color-forest)" }} />
                                    </button>
                                </div>
                                {/* No "Online" badge here — there's no real presence
                                    tracking behind it yet, so it isn't shown rather
                                    than shown fake. */}
                            </div>

                            {/* Info column */}
                            <div className="flex-1">
                                <div className="mb-4">
                                    <h3
                                        className="text-[22px] font-semibold text-[#1a1c1b]"
                                        style={{ fontFamily: "var(--font-display)" }}
                                    >
                                        {user.fullName || "Unnamed user"}
                                    </h3>
                                    <p className="text-[13.5px] text-[#73796c]">{user.email || "—"}</p>
                                </div>

                                <div>
                                    <InfoRow icon={User} label="Full Name" value={user.fullName} />
                                    <InfoRow icon={CalendarDays} label="Date of Birth" value={user.dobDisplay} />
                                    <InfoRow icon={User} label="Gender" value={user.gender} />
                                    <InfoRow icon={BookOpen} label="University Name" value={user.university} />
                                    <InfoRow icon={Bookmark} label="Course or Track" value={user.course} last />
                                </div>
                            </div>
                        </div>

                        {/* ── Profile Summary (4 cols) ────────────────────────────── */}
                        {/* Only "Member Since" is real (from the created_at column).
                            Sessions/study hours/AI interactions/badges were removed —
                            there's no study-session or AI-usage tracking feature built
                            yet, so showing numbers for them would just be more mock
                            data. Add rows back here once those features exist. */}
                        <div
                            className="lg:col-span-4 bg-white rounded-2xl border border-[#c3c9ba] p-5"
                            style={{
                                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                                animation: "fadeSlideUp 0.45s ease 0.1s both",
                            }}
                        >
                            <h3 className="text-[14px] font-bold text-[#1a1c1b] mb-4">
                                Profile Summary
                            </h3>
                            <StatRow icon={Clock} label="Member Since" value={user.memberSince} />
                        </div>

                        {/* ── About Me (full width) ───────────────────────────────── */}
                        {/* Interests tags were removed — there's no field for them in
                            user_details and no way to edit them yet, so an empty
                            "Interests" section with no way to fill it in was just
                            more dead UI. Reintroduce once there's a real column and
                            an editor for it. */}
                        <div
                            className="lg:col-span-12 bg-white rounded-2xl border border-[#c3c9ba] p-6"
                            style={{
                                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                                animation: "fadeSlideUp 0.45s ease 0.15s both",
                            }}
                        >
                            <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-[#c3c9ba]/40">
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(168,210,142,0.2)" }}
                                >
                                    <User size={14} style={{ color: "var(--color-forest)" }} />
                                </div>
                                <h3 className="text-[14px] font-bold text-[#1a1c1b]">About Me</h3>
                            </div>

                            {user.bio ? (
                                <p className="text-[14px] text-[#43493e] leading-relaxed">
                                    {user.bio}
                                </p>
                            ) : (
                                <p className="text-[14px] text-[#9a9d93] italic leading-relaxed">
                                    No bio yet — add one from Edit Profile.
                                </p>
                            )}
                        </div>

                    </div>{/* /grid */}
                </div>

                {/* Mobile bottom spacing */}
                <div className="md:hidden h-24" />
            </main>

            {/* Mobile bottom nav */}
            <BottomNav />

            {/* Edit Profile Modal */}
            {modalOpen && (
                <EditProfileModal
                    user={user}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
