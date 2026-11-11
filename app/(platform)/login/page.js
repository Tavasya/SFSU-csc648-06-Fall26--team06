"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays } from "lucide-react";
import { validatePassword } from "@/lib/password/password-validation";
import PasswordStrength from "@/components/password/password-strength";
import Link from "next/link";

// useSearchParams needs a Suspense boundary in Next.js.
export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  // /login?mode=signup opens on "Create account" (e.g. from the Campus Map).
  const params = useSearchParams();
  const [signup, setSignup] = useState(params.get("mode") === "signup"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(e.currentTarget),
      db = createClient();
    const credentials = {
      email: String(values.get("email")).trim(),
      password: values.get("password"),
    };

    // Validate password when creating an account
    if (signup) {
      const passwordRequirements = validatePassword(credentials.password);

      if (
        Object.values(passwordRequirements).some(
          (valid) => !valid
        )
      ) {
        setBusy(false);
        return setMessage(
          "Password must be at least 8 characters and contain uppercase, lowercase, number, and special characters."
        );
      }
    }

    const { data, error } = signup
      ? await db.auth.signUp(credentials)
      : await db.auth.signInWithPassword(credentials);
    setBusy(false);
    if (error) return setMessage(error.message);
    if (data.session) {
      // ?next=/schedule sends students back to the page that asked them to
      // sign in. Only paths on this site are allowed ("/x", not "//other.site").
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/host/events");
      router.refresh();
    } else
      setMessage(
        "If an account can be created with this email, you'll receive a confirmation email. Please check your inbox.",
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
            minLength={signup ? 8 : undefined}
            required
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {/* Live password strength indicator */}
        {signup && (
          <PasswordStrength password={password} />
        )}

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
        type="button"
        className="ga-text-button"
        onClick={() => {
          setSignup(!signup);
          setMessage("");
          setPassword("");
        }}
      >
        {signup
          ? "Already have an account? Sign in"
          : "New here? Create an account"}
      </button>
      <br></br>
      <button className="ga-text-button">
        {!signup && (
          <div>
            <Link href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        )}
      </button>

      <p className="ga-muted ga-small">
        Anyone with an account can create events and manage the events they own.
      </p>
    </div>
  );
}
