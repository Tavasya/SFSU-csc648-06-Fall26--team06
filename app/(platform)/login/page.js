"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays } from "lucide-react";
export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(e.currentTarget),
      db = createClient();
    const credentials = {
      email: values.get("email"),
      password: values.get("password"),
    };
    const { data, error } = signup
      ? await db.auth.signUp(credentials)
      : await db.auth.signInWithPassword(credentials);
    setBusy(false);
    if (error) return setMessage(error.message);
    if (data.session) {
      router.push("/host/events");
      router.refresh();
    } else
      setMessage(
        "Check your email to confirm your account. Then come back and sign in.",
      );
  }
  return (
    <div className="ga-auth ga-card">
      <div className="ga-auth-icon">
        <CalendarDays />
      </div>
      <h1>{signup ? "Join your campus community" : "Welcome back"}</h1>
      <p className="ga-muted">
        {signup
          ? "Create your GatorAid account."
          : "Sign in to manage your campus events."}
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
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
        </label>
        {message && (
          <p role="status" className="ga-notice">
            {message}
          </p>
        )}
        <button className="ga-button" disabled={busy}>
          {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        className="ga-text-button"
        onClick={() => {
          setSignup(!signup);
          setMessage("");
        }}
      >
        {signup
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
      <p className="ga-muted ga-small">
        Anyone with an account can create events and manage the events they own.
      </p>
    </div>
  );
}
