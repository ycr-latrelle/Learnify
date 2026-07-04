import React from "react";
import { useNavigate } from "react-router-dom";
import AuthBrandPanel from "../../components/layout/AuthBrandPanel";
import AuthFooter from "../../components/layout/AuthFooter";
import AuthMobileHeader from "../../components/layout/AuthMobileHeader";
import AuthPhotoQuote from "../../components/layout/AuthPhotoQuote";
import RegisterFields from "../../components/features/RegisterFields";

const HEADLINE = (
  <>
    Enter the rhythm of
    <br className="hidden md:block" /> digital learning.
  </>
);
const SUB =
  "A study ecosystem designed for focus. Connect through shared knowledge, rhythmic study sessions, and sophisticated learning spaces.";

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-[var(--color-page-bg)]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Mobile layout (< md): compact header, overlapping sheet, photo panel */}
      <div className="md:hidden flex flex-col">
        <AuthMobileHeader headline={HEADLINE} sub={SUB} onBack={() => navigate(-1)} />

        <div
          className="relative z-10 -mt-10 bg-white rounded-t-[32px] px-6 pt-8 pb-10"
          style={{ animation: "fadeSlideUp 0.5s ease both" }}
        >
          <h2
            className="text-[26px] font-semibold text-[var(--color-ink)] mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Create Account
          </h2>
          <p className="text-[14px] text-neutral-500 leading-relaxed mb-7">
            Join our global study community of thinkers and creators.
          </p>
          <RegisterFields onSuccess={() => navigate("/profile")} />
        </div>

        <AuthPhotoQuote />
      </div>

      {/* Desktop layout (md+): split screen with centered card */}
      <div className="hidden md:flex flex-1">
        <AuthBrandPanel headline={HEADLINE} sub={SUB} wavyPosition="bottom" />

        <div className="flex-1 flex items-center justify-center px-6 py-14">
          <div
            className="w-full max-w-[540px] bg-white rounded-[28px] shadow-[var(--shadow-card)] px-12 py-11"
            style={{ animation: "fadeSlideInRight 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <h2
              className="text-[32px] font-semibold text-[var(--color-ink)] mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Create Account
            </h2>
            <p className="text-[14.5px] text-neutral-500 leading-relaxed mb-8">
              Join our global study community of thinkers and creators.
            </p>
            <RegisterFields onSuccess={() => navigate("/profile")} />
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}