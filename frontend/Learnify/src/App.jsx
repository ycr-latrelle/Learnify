import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ProfilePage from "./pages/Dashboard/ProfilePage";
import StudyPage from "./pages/Study/StudyPage";
import AiTutorPage from "./pages/Study/AiTutorPage";
import MySessionsPage from "./pages/Study/MySessionsPage";
import FriendsPage from "./pages/Friends/FriendsPage";
import MessagesPage from "./pages/Messages/MessagesPage";
import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import { getCurrentUser, getSidebarUser } from "./services/authApi";
import { ArrowLeft } from "lucide-react";

// Placeholder for screens you'll build later. Wrapped in the same
// Sidebar/BottomNav chrome as every real page (previously this was a bare
// centered string with no nav at all — a dead end you could only escape
// with the browser's back button) plus an explicit back arrow, so landing
// here from any tab still leaves every other tab one tap away.
function ComingSoon({ label }) {
  const navigate = useNavigate();
  const user = getSidebarUser();

  return (
    <div className="flex min-h-screen bg-[var(--color-page-bg)]">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="flex items-center gap-3 h-16 px-4 md:px-8 border-b border-neutral-200/70 bg-white/70 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-2 hover:bg-[var(--color-input-bg)] rounded-full transition-colors"
          >
            <ArrowLeft size={18} className="text-[var(--color-forest)]" />
          </button>
          <h2
            className="text-[16px] font-semibold text-[var(--color-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {label}
          </h2>
        </header>
        <div
          className="flex-1 flex items-center justify-center text-[#73796c] text-[16px]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {label} — coming soon
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

// Redirects to /login if there's no stored session with a usable ID token.
// Without this, someone could type /profile into the address bar and land
// on the page even after logging out (or without ever logging in) — the
// page itself has no way to know that unless every page independently
// checked, so the check lives once, here, at the routing layer.
function ProtectedRoute({ children }) {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dashboard */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <ComingSoon label="Home" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <ComingSoon label="Sessions" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-sessions"
          element={
            <ProtectedRoute>
              <MySessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/study"
          element={
            <ProtectedRoute>
              <StudyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/study/tutor"
          element={
            <ProtectedRoute>
              <AiTutorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <ComingSoon label="Settings" />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}