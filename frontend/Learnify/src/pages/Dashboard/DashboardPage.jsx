import React from "react";
import { useNavigate } from "react-router-dom";
import { getStoredToken, logoutUser } from "../../services/authApi";

// Placeholder landing page — replace with the real dashboard once
// courses / AI tutor screens are built. For now it just confirms the
// login/register flow actually completed and a token was stored.
export default function DashboardPage() {
    const navigate = useNavigate();
    const hasToken = Boolean(getStoredToken());

    function handleLogout() {
        logoutUser();
        navigate("/login");
    }

    return (
        <div
            className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-page-bg)] px-6"
            style={{ fontFamily: "var(--font-body)" }}
        >
            <h1
                className="text-[28px] font-semibold text-[var(--color-ink)] mb-2"
                style={{ fontFamily: "var(--font-display)" }}
            >
                You're in.
            </h1>
            <p className="text-[14.5px] text-neutral-500 mb-8 text-center max-w-sm">
                {hasToken
                    ? "Login succeeded and an access token is stored. This is a placeholder — the real dashboard goes here."
                    : "You reached the dashboard route, but no access token was found in storage."}
            </p>
            <button
                onClick={handleLogout}
                className="rounded-xl py-3 px-6 text-white font-semibold text-[14.5px] bg-[var(--color-forest)] hover:brightness-110 transition-all"
            >
                Log out
            </button>
        </div>
    );
}