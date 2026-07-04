import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ProfilePage from "./pages/Dashboard/ProfilePage";
import FriendsPage from "./pages/Friends/FriendsPage";
import MessagesPage from "./pages/Messages/MessagesPage";
import { getCurrentUser } from "./services/authApi";

// Placeholder for screens you'll build later
function ComingSoon({ label }) {
  return (
    <div
      className="flex items-center justify-center h-screen text-[#73796c] text-[16px]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {label} — coming soon
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
              <ComingSoon label="My Sessions" />
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
          path="/bookmarks"
          element={
            <ProtectedRoute>
              <ComingSoon label="Bookmarks" />
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