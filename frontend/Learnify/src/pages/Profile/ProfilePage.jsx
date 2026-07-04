import React, { useState } from "react";
import {
  Pencil,
  Calendar,
  GraduationCap,
  BookOpen,
  History,
  Users,
  Timer,
  Bot,
  Award,
  UserCircle2,
} from "lucide-react";
import AppMobileTopBar from "../../components/layout/AppMobileTopBar";
import EditProfileModal from "../../components/features/profile/EditProfileModal";
import ProfileStatRow from "../../components/features/profile/ProfileStatRow";

const INITIAL_PROFILE = {
  fullName: "Antonio Tantiado",
  email: "antonio@email.com",
  dob: "2004-05-15",
  gender: "Male",
  university: "University of the Philippines Diliman",
  course: "BS Computer Science",
  bio: "Aspiring software developer and AI enthusiast. I love building things that can help people learn and grow.",
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCDTGlq2HoRQwwoiksKFfYHOki_Y1pcKg5Lfykuow_bcEJ5_H1N03oT4V3Pt48h_G55H00ew-3NUzVkU0XgZClR86hHzkYXBwePKbvGqomToC-HsKGROu1MOy0C9HW8yh2xIg1Ow-oXimsbl0iM9ER_QoFnkyihfBUPhc5lUUTVXilJaq62XtngPup2vZ-VXzs0P5VUyq8cFWFuUXTxiGGin5ghkWIrYo14pFuk4I-8z9Up5jM7k8fyayOnnxQwKbDadgDiEzKWW-o5",
};

const STATS = [
  { icon: History, label: "Member Since", value: "Jan 10, 2024" },
  { icon: Users, label: "Sessions Joined", value: "24" },
  { icon: Timer, label: "Study Hours", value: "128 hrs" },
  { icon: Bot, label: "AI Interactions", value: "356" },
  { icon: Award, label: "Badges Earned", value: "8" },
];

const INTERESTS = [
  "Web Development",
  "Artificial Intelligence",
  "UI/UX Design",
  "Problem Solving",
  "Data Structures",
  "Open Source",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  // This one flag is the whole fix: the modal renders from state instead of
  // a vanilla-JS `document.getElementById('editModal').classList.toggle(...)`
  // call. That old approach reached into the DOM directly and re-ran a
  // `querySelectorAll('button')` scan on every load; the moment this markup
  // got mounted more than once (e.g. on a route re-render), it rebound a
  // second click handler and the shared #editModal id collided, which is
  // what produced the duplicated sidebar. With React owning the tree there's
  // only ever one sidebar and one modal, and toggling `isEditOpen` can't
  // duplicate either.
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <AppMobileTopBar title="Learnify" onEditProfile={() => setIsEditOpen(true)} />

      <div className="max-w-[1280px] mx-auto p-6 md:p-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2
              className="text-[32px] font-semibold text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              My Profile
            </h2>
            <p className="text-[15px] text-neutral-500">
              Manage your personal information and preferences.
            </p>
          </div>
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-[var(--color-forest)] text-[var(--color-forest)] font-semibold text-[14px] rounded-lg hover:bg-[var(--color-forest)]/5 transition-all self-start"
          >
            <Pencil size={16} />
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main profile card */}
          <div
            className="lg:col-span-8 bg-white rounded-2xl border border-[var(--color-input-bg)] p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center gap-2.5 md:w-1/3">
                <img
                  className="w-40 h-40 rounded-full object-cover border-4 border-[var(--color-sage)]/40"
                  src={profile.avatarUrl}
                  alt={`${profile.fullName} avatar`}
                />
                <div className="flex items-center gap-1.5 bg-[var(--color-sage)]/15 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-forest)] animate-pulse" />
                  <span className="text-[12px] font-semibold text-[var(--color-forest-dark)]">
                    Online
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-5">
                  <h3
                    className="text-[24px] font-semibold text-[var(--color-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {profile.fullName}
                  </h3>
                  <p className="text-[14px] text-neutral-500">{profile.email}</p>
                </div>

                <div className="space-y-2.5">
                  <InfoRow icon={UserCircle2} label="Full Name" value={profile.fullName} />
                  <InfoRow
                    icon={Calendar}
                    label="Date of Birth"
                    value={formatDob(profile.dob)}
                  />
                  <InfoRow icon={GraduationCap} label="Gender" value={profile.gender} />
                  <InfoRow
                    icon={GraduationCap}
                    label="University Name"
                    value={profile.university}
                  />
                  <InfoRow icon={BookOpen} label="Course or Track" value={profile.course} last />
                </div>
              </div>
            </div>
          </div>

          {/* Profile summary stats */}
          <div
            className="lg:col-span-4 bg-white rounded-2xl border border-[var(--color-input-bg)] p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <h3 className="text-[13px] font-bold text-[var(--color-ink)] mb-4">
              Profile Summary
            </h3>
            <div className="space-y-4">
              {STATS.map((s) => (
                <ProfileStatRow key={s.label} {...s} />
              ))}
            </div>
          </div>

          {/* About me */}
          <div
            className="lg:col-span-7 bg-white rounded-2xl border border-[var(--color-input-bg)] p-5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-[var(--color-input-bg)]">
              <UserCircle2 className="text-[var(--color-forest)]" size={18} />
              <h3 className="text-[13px] font-bold text-[var(--color-ink)]">About Me</h3>
            </div>
            <p className="text-[14px] text-neutral-500 mb-6 leading-relaxed">{profile.bio}</p>
            <h4 className="text-[13px] font-bold text-[var(--color-ink)] mb-2.5">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-2 bg-[var(--color-sage)]/10 border border-[var(--color-sage)]/40 text-[var(--color-forest-dark)] rounded-lg text-[12px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        profile={profile}
        onSave={setProfile}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, last = false }) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${
        last ? "" : "border-b border-[var(--color-input-bg)]"
      }`}
    >
      <div className="flex items-center gap-2.5 text-neutral-500">
        <Icon className="text-[var(--color-forest)]" size={17} />
        <span className="text-[13px]">{label}</span>
      </div>
      <span className="text-[13px] font-bold text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

function formatDob(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
