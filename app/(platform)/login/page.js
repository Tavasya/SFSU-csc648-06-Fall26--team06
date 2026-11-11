"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays } from "lucide-react";
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

  // Password validation strength for signup
  function validatePassword(password) {
    const allowedSymbols = "!@#$%^&*()_+-=[]{};:'\"|<>?,./`~";

    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: [...allowedSymbols].some((symbol) =>
        password.includes(symbol)
      ),
    };

    return requirements;
  }

  // Calculate password strength
  const requirements = validatePassword(password);
  const strength = Object.values(requirements).filter(Boolean).length;

  const strengthLabel = !password
    ? "Not entered"
    : strength <= 2
      ? "Weak"
      : strength === 3
        ? "Fair"
        : strength === 4
          ? "Strong"
          : "Very strong";

  const strengthColor =
    strength <= 2
      ? "#DC2626"
      : strength === 3
        ? "#D97706"
        : strength === 4
          ? "#2563EB"
          : "#16A34A";

  const requirementLabels = [
    ["length", "At least 8 characters"],
    ["uppercase", "At least one uppercase letter"],
    ["lowercase", "At least one lowercase letter"],
    ["number", "At least one number"],
    ["special", "At least one special character"],
  ];

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
            minLength={signup ? 8 : undefined}
            required
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {/* Live password strength indicator */}
        {signup && (
          <div className="ga-muted ga-small">
            <div style={{ marginTop: "8px", marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <strong>Password strength</strong>

                <span
                  style={{
                    color: password ? strengthColor : "inherit",
                    fontWeight: "600",
                  }}
                >
                  {strengthLabel}
                </span>
              </div>

              {/* Strength progress bar */}
              <div
                role="progressbar"
                aria-label="Password strength"
                aria-valuemin={0}
                aria-valuemax={5}
                aria-valuenow={strength}
                style={{
                  display: "flex",
                  gap: "5px",
                  width: "100%",
                }}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    style={{
                      height: "6px",
                      flex: 1,
                      borderRadius: "4px",
                      backgroundColor:
                        strength >= level
                          ? strengthColor
                          : "#D1D5DB",
                      transition: "background-color 0.2s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            <p>Your password must contain:</p>

            <ul style={{ listStyle: "none", padding: 0 }}>
              {requirementLabels.map(([key, label]) => (
                <li
                  key={key}
                  style={{
                    color: requirements[key] ? "#16A34A" : "inherit",
                    marginBottom: "4px",
                  }}
                >
                  {requirements[key] ? "✓" : "○"} {label}
                </li>
              ))}
            </ul>
          </div>
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
      <p className="ga-muted ga-small">
        Anyone with an account can create events and manage the events they own.
      </p>
    </div>
  );
}
