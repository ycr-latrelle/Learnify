import React from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppMobileBottomNav from "./AppMobileBottomNav";

// Renders the sidebar/bottom-nav chrome exactly once per route change,
// because React (not a manual script re-scanning the DOM) owns this tree.
// Pages that need it (e.g. ProfilePage) render their own mobile top bar
// via <Outlet context={...}/> since its title/actions differ per page.
export default function AppLayout({ user }) {
  return (
    <div className="flex h-screen w-full bg-[var(--color-page-bg)]">
      <AppSidebar user={user} />

      <main className="flex-1 h-screen overflow-y-auto bg-[var(--color-page-bg)]">
        <Outlet context={{ user }} />
        <div className="md:hidden h-24" />
      </main>

      <AppMobileBottomNav />
    </div>
  );
}
