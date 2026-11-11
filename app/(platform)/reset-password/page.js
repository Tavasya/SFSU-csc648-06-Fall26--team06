"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/password/password-validation";
import PasswordStrength from "@/components/password/password-strength";
import { CalendarDays, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);

  // Check whether Supabase has established a password-recovery session.
  useEffect(() => {
    const db = createClient();

    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setAuthorized(true);
        setChecking(false);
      }

      if (event === "INITIAL_SESSION") {
        setChecking(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMessage("");

    if (!authorized) {
      setMessage(
        "Your password reset session is invalid or has expired. Please request a new reset link."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    const requirements = validatePassword(password);

    if (
      Object.values(requirements).some(
        (valid) => !valid
      )
    ) {
      setMessage(
        "Password must be at least 8 characters and contain uppercase, lowercase, number, and special characters."
      );
      return;
    }

    setBusy(true);

    try {
      const db = createClient();

      const { error } = await db.auth.updateUser({
        password: password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      // Sign out after successfully changing the password.
      await db.auth.signOut();

      setSuccess(true);
      setAuthorized(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ga-auth ga-card">
      <div className="ga-auth-icon">
        <CalendarDays />
      </div>

      {checking ? (
        <>
          <h1>Verifying reset link...</h1>
          <p className="ga-muted">
            Please wait while we verify your password reset link.
          </p>
        </>
      ) : success ? (
        <>
          <h1>Password updated!</h1>

          <p className="ga-muted">
            Your password has been successfully changed.
            You can now sign in using your new password.
          </p>

          <Link
            href="/login"
            className="ga-button"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Back to sign in
          </Link>
        </>
      ) : !authorized ? (
        <>
          <h1>Reset link unavailable</h1>

          <p className="ga-muted">
            This password reset link is invalid or has expired.
            Please request a new one.
          </p>

          <Link
            href="/forgot-password"
            className="ga-button"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Request a new reset link
          </Link>
        </>
      ) : (
        <>
          <h1>Reset your password</h1>

          <p className="ga-muted">
            Enter a new password for your GatorAid account.
          </p>

          <form onSubmit={submit}>
            <label>
              New Password

              <div style={{ position: "relative" }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: "45px" }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    color: "#6B7280",
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>

            {/* Shared live password-strength indicator */}
            <PasswordStrength password={password} />

            <label>
              Confirm Password

              <div style={{ position: "relative" }}>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: "45px" }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  aria-pressed={showConfirmPassword}
                  title={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    color: "#6B7280",
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </label>

            {message && (
              <p role="alert" className="ga-notice">
                {message}
              </p>
            )}

            <button
              type="submit"
              className="ga-button"
              disabled={busy}
            >
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
