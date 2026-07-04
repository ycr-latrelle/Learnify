import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AtSign, User } from "lucide-react";
import Input, { FieldLabel } from "../ui/Input";
import PasswordInput from "../ui/PasswordInput";
import Checkbox from "../ui/Checkbox";
import Button from "../ui/Button";
import { registerUser } from "../../services/authApi";

// onSuccess: optional callback invoked with the API response after a
// successful registration (RegisterPage uses this to navigate away).
export default function RegisterFields({ onSuccess }) {
    // The backend has no username concept — the User model only stores
    // email + full_name (see app/models/user.py), so this field maps to
    // the API's "full_name" param.
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!fullName || !email || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords don't match.");
            return;
        }
        if (!agree) {
            setError("Please agree to receive study updates and session alerts.");
            return;
        }

        setLoading(true);
        try {
            const data = await registerUser({ fullName, email, password });
            onSuccess?.(data);
        } catch (err) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
                <FieldLabel>Full Name</FieldLabel>
                <Input
                    icon={<User size={17} />}
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                />
            </div>

            <div className="mb-5">
                <FieldLabel>Email Address</FieldLabel>
                <Input
                    icon={<AtSign size={17} />}
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                />
            </div>

            <div className="mb-5">
                <FieldLabel>Password</FieldLabel>
                <PasswordInput
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                />
            </div>

            <div className="mb-7">
                <FieldLabel>Confirm Password</FieldLabel>
                <PasswordInput
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                />
            </div>

            <div className="mb-7">
                <Checkbox
                    label="I agree to receive study updates and session alerts."
                    checked={agree}
                    onChange={() => setAgree((a) => !a)}
                />
            </div>

            {error && (
                <p className="mb-4 text-[13.5px] text-red-600" role="alert">
                    {error}
                </p>
            )}

            <Button type="submit" loading={loading}>
                Register
            </Button>

            <div className="border-t border-neutral-200 my-7" />

            <p className="text-center text-[14.5px] text-neutral-600">
                Already part of the study community?{" "}
                <Link to="/login" className="font-semibold hover:underline" style={{ color: "var(--color-forest)" }}>
                    Return to login
                </Link>
            </p>
        </form>
    );
}