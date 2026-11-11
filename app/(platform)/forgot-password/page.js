"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccess(false);

    try {
      const db = createClient();

      const { error } = await db.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      setSuccess(true);
      setMessage(
        "If an account exists for this email, you'll receive a password reset link. Please check your inbox."
      );
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

      <h1>Forgot your password?</h1>

      <p className="ga-muted">
        Enter the email address associated with your GatorAid account.
        We'll send you a link to reset your password.
      </p>

      <form onSubmit={submit}>
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@sfsu.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {message && (
          <p role="status" className="ga-notice">
            {message}
          </p>
        )}

        <button className="ga-button" disabled={busy}>
          {busy ? "Sending..." : "Send reset link"}
        </button>
      </form>
    
    <button className="ga-text-button">
        <Link href="/login">
            Back to sign in
        </Link>
    </button>
    </div>
  );
}
