// Single source of truth for where the .NET API lives. Every other
// service file (authApi, user_detailsAPI, friendsApi, messagesApi) imports
// this instead of hardcoding "http://localhost:5257" — so deploying to
// Render just means setting one Netlify environment variable
// (VITE_API_BASE_URL) instead of hunting through four files.
//
// Vite only exposes env vars prefixed with VITE_ to client code, and only
// ones that existed at build time — so this must be set in Netlify's
// dashboard (Site settings -> Environment variables), not just a local
// .env file, or the production build will silently fall back to localhost.
export const API_ROOT =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5257";
