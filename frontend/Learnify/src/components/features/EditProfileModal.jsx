import React, { useState } from "react";
import { X, User, CalendarDays, BookOpen, Bookmark } from "lucide-react";

// Controlled modal: visibility is owned by the parent (`{modalOpen && <EditProfileModal .../>}`
// in ProfilePage), so there's exactly one of these mounted at a time and it
// can't drag a second <Sidebar/> or <BottomNav/> along with it.
export default function EditProfileModal({ user, onClose, onSave }) {
    const [form, setForm] = useState({
        fullName: user.fullName ?? "",
        dob: user.dob ?? "",
        gender: user.gender ?? "Male",
        university: user.university ?? "",
        course: user.course ?? "",
        bio: user.bio ?? "",
    });
    const [saving, setSaving] = useState(false);

    const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    async function handleSave() {
        setSaving(true);
        try {
            await onSave(form);
        } finally {
            setSaving(false);
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[#c3c9ba] max-h-[90vh] overflow-y-auto"
                style={{ fontFamily: "var(--font-body)" }}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#c3c9ba]/50">
                    <div>
                        <h3
                            className="text-[19px] font-semibold text-[#1a1c1b]"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            Edit Profile
                        </h3>
                        <p className="text-[12.5px] text-[#73796c] mt-0.5">
                            Update your information to keep your profile accurate.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 hover:bg-[#eeeeeb] rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <Field icon={User} label="Full Name" value={form.fullName} onChange={update("fullName")} />

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            icon={CalendarDays}
                            label="Date of Birth"
                            type="date"
                            value={form.dob}
                            onChange={update("dob")}
                        />
                        <div>
                            <label className="block text-[12px] font-bold text-[#1a1c1b] mb-1.5">
                                Gender
                            </label>
                            <select
                                value={form.gender}
                                onChange={update("gender")}
                                className="w-full bg-[#f0f0ee] border-none rounded-lg px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2"
                                style={{ "--tw-ring-color": "var(--color-forest)" }}
                            >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    <Field
                        icon={BookOpen}
                        label="University Name"
                        value={form.university}
                        onChange={update("university")}
                    />
                    <Field
                        icon={Bookmark}
                        label="Course or Track"
                        value={form.course}
                        onChange={update("course")}
                    />

                    <div>
                        <label className="block text-[12px] font-bold text-[#1a1c1b] mb-1.5">Bio</label>
                        <textarea
                            rows={3}
                            maxLength={300}
                            value={form.bio}
                            onChange={update("bio")}
                            className="w-full bg-[#f0f0ee] border-none rounded-lg px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2"
                            style={{ "--tw-ring-color": "var(--color-forest)" }}
                        />
                        <p className="text-right text-[10.5px] text-[#73796c] mt-1">
                            {form.bio.length} / 300
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-[#c3c9ba]/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 border rounded-xl text-[13.5px] font-semibold transition-all hover:bg-[var(--color-forest)]/5"
                        style={{ borderColor: "var(--color-forest)", color: "var(--color-forest)" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-white transition-all disabled:opacity-60"
                        style={{ background: "var(--color-forest)" }}
                    >
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ icon: Icon, label, value, onChange, type = "text" }) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#1a1c1b] mb-1.5">
                <Icon size={13} style={{ color: "var(--color-forest)" }} />
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="w-full bg-[#f0f0ee] border-none rounded-lg px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": "var(--color-forest)" }}
            />
        </div>
    );
}