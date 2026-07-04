import React, { useEffect, useState } from "react";
import { X, Camera } from "lucide-react";

const BIO_MAX = 300;

// Fully controlled by the parent's `isOpen` boolean — there's no
// `classList.toggle('hidden')` on a single shared DOM node, so mounting a
// second <ProfilePage> (e.g. during a route change or a fast-refresh) can
// never leave two modals, or two of anything else, sitting in the page.
export default function EditProfileModal({ isOpen, onClose, profile, onSave }) {
  const [form, setForm] = useState(profile);

  // Re-sync local draft whenever the modal is (re)opened with fresh data.
  useEffect(() => {
    if (isOpen) setForm(profile);
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--color-input-bg)] max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-input-bg)]">
          <div>
            <h3
              className="text-[20px] font-semibold text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Customize Your Details
            </h3>
            <p className="text-[12px] text-neutral-500">
              Update your information to keep your profile accurate.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-[var(--color-input-bg)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-4 flex flex-col items-center gap-2">
            <label className="text-[13px] font-bold text-[var(--color-ink)] self-start">
              Profile Picture
            </label>
            <div className="relative group">
              <img
                className="w-32 h-32 rounded-full object-cover border-2 border-[var(--color-forest)]"
                src={form.avatarUrl}
                alt="Profile"
              />
              <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" size={20} />
              </div>
            </div>
            <p className="text-[10px] text-center text-neutral-400">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>

          <div className="md:col-span-8 space-y-4">
            <Field label="Full Name" value={form.fullName} onChange={update("fullName")} />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Date of Birth"
                type="date"
                value={form.dob}
                onChange={update("dob")}
              />
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-ink)] mb-1">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={update("gender")}
                  className="w-full bg-[var(--color-input-bg)] border-none rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <Field
              label="University Name"
              value={form.university}
              onChange={update("university")}
            />
            <Field label="Course or Track" value={form.course} onChange={update("course")} />
          </div>

          <div className="md:col-span-12">
            <label className="block text-[12px] font-bold text-[var(--color-ink)] mb-1">
              Bio
            </label>
            <textarea
              rows={3}
              maxLength={BIO_MAX}
              value={form.bio}
              onChange={update("bio")}
              className="w-full bg-[var(--color-input-bg)] border-none rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]"
            />
            <p className="text-right text-[10px] text-neutral-400 mt-1">
              {form.bio.length} / {BIO_MAX}
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-[var(--color-input-bg)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-[var(--color-forest)] text-[var(--color-forest)] font-semibold rounded-lg hover:bg-[var(--color-forest)]/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[var(--color-forest)] text-white font-semibold rounded-lg hover:brightness-110 transition-all shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-[var(--color-ink)] mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full bg-[var(--color-input-bg)] border-none rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]"
      />
    </div>
  );
}
