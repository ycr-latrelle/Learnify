import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AtSign } from "lucide-react";
import Input, { FieldLabel } from "../ui/Input";
import PasswordInput from "../ui/PasswordInput";
import Checkbox from "../ui/Checkbox";
import Button from "../ui/Button";
import { loginUser } from "../../services/authApi";

// Just the form content — no card/sheet wrapper — so it can be dropped
// into either the desktop card or the mobile overlapping sheet.
//
// onSuccess: optional callback invoked with the API response after a
// successful login (LoginPage uses this to navigate away).
export default function LoginFields({ onSuccess }) {
    // The backend only authenticates by email (see
    // app/services/auth_service.py -> authenticate_user), so this field
    // maps 1:1 to the API's "email" param rather than a generic identifier.
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Please fill in both fields.");
            return;
        }

        setLoading(true);
        try {
            const data = await loginUser({ email, password });
            onSuccess?.(data);
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
                <FieldLabel>EMAIL</FieldLabel>
                <Input
                    icon={<AtSign size={17} />}
                    type="email"
                    placeholder="johndoe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                />
            </div>

            <div className="mb-6">
                <FieldLabel
                    action={
                        <span
                            className="text-[13px] font-semibold cursor-pointer"
                            style={{ color: "var(--color-forest)" }}
                        >
                            Forgot password?
                        </span>
                    }
                >
                    PASSWORD
                </FieldLabel>
                <PasswordInput
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                />
            </div>

            <div className="mb-7">
                <Checkbox
                    label="Remember me for 30 days"
                    checked={remember}
                    onChange={() => setRemember((r) => !r)}
                />
            </div>

            {error && (
                <p className="mb-4 text-[13.5px] text-red-600" role="alert">
                    {error}
                </p>
            )}

            <Button type="submit" loading={loading}>
                Login
            </Button>

            <div className="border-t border-neutral-200 my-7" />

            <p className="text-center text-[14.5px] text-neutral-600">
                New to Learnify?{" "}
                <Link to="/register" className="font-semibold hover:underline" style={{ color: "var(--color-forest)" }}>
                    Create an account
                </Link>
            </p>
        </form>
    );
}