// R12 User Authentication and Account Management: sign-up and log-in
// (R12.1, R12.3, R12.4, R12.11), email verification (R12.2, R12.6), log-out
// (R12.5), session refresh (R12.10, proxy.js) and password rules (R12.8),
// in lib/auth/auth.js and lib/password/password-validation.js.
// Supabase auth is a fake object, so no real accounts are created.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeSsr } from "./helpers/harness.mjs";
import {
  CHECK_EMAIL_MESSAGE, DUPLICATE_MESSAGE, INVALID_CREDENTIALS_MESSAGE, PASSWORD_RULES_MESSAGE, UNVERIFIED_MESSAGE,
  authErrorMessage, isExistingAccount, isVerified, normalizeEmail, passwordStrength, resendVerification,
  safeNextPath, signOutUser, submitAuth, validateCredentials, verificationResult,
} from "../lib/auth/auth.js";
import { requirementLabels, validatePassword } from "../lib/password/password-validation.js";

const { proxy, config } = await import("../proxy.js");
const GOOD = "Gators#2026";

// A fake Supabase auth client that records calls.
function fakeAuth(responses = {}) {
  const calls = [];
  const reply = (name) => async (args) => {
    calls.push({ name, args });
    return responses[name] ?? { data: {}, error: null };
  };
  return { calls, auth: { signUp: reply("signUp"), signInWithPassword: reply("signInWithPassword"), resend: reply("resend"), signOut: reply("signOut") } };
}

test("R12.8 password rules: length, upper, lower, number and symbol", () => {
  assert.deepEqual(validatePassword(GOOD), { length: true, uppercase: true, lowercase: true, number: true, special: true });
  assert.deepEqual(validatePassword("short"), { length: false, uppercase: false, lowercase: true, number: false, special: false });
  assert.equal(validatePassword("ALLCAPS123!").lowercase, false);
  assert.equal(requirementLabels.length, 5);
  assert.deepEqual(passwordStrength(""), { score: 0, label: "Not entered" });
  assert.equal(passwordStrength("abc").label, "Weak");
  assert.equal(passwordStrength("abcdefgh1").label, "Fair");
  assert.equal(passwordStrength("Abcdefgh1").label, "Strong");
  assert.equal(passwordStrength(GOOD).label, "Very strong");
});

test("R12.1 required fields and a valid email are checked before anything is sent", () => {
  assert.deepEqual(validateCredentials({ email: "", password: "" }), { email: "Enter your email address.", password: "Enter your password." });
  assert.equal(validateCredentials({ email: "not-an-email", password: GOOD }).email, "Enter a valid email address.");
  assert.equal(validateCredentials({ email: "a@sfsu.edu", password: "weak" }, { signup: true }).password, PASSWORD_RULES_MESSAGE);
  assert.deepEqual(validateCredentials({ email: "a@sfsu.edu", password: "weak" }), {}, "log-in doesn't apply the sign-up rules");
  assert.equal(normalizeEmail("  Student@SFSU.edu "), "student@sfsu.edu");
});

test("R12.1 invalid sign-ups never reach Supabase", async () => {
  const db = fakeAuth();
  const result = await submitAuth(db, { mode: "signup", email: "a@sfsu.edu", password: "password" });
  assert.equal(result.status, "invalid");
  assert.equal(db.calls.length, 0);
});

test("R12.1 / R12.2 a new sign-up is asked to verify their email", async () => {
  const db = fakeAuth({ signUp: { data: { user: { identities: [{ id: "x" }] }, session: null }, error: null } });
  const result = await submitAuth(db, { mode: "signup", email: " New@SFSU.edu ", password: GOOD });
  assert.deepEqual(result, { status: "check-email", message: CHECK_EMAIL_MESSAGE });
  assert.deepEqual(db.calls[0], { name: "signUp", args: { email: "new@sfsu.edu", password: GOOD } });
});

test("R12.11 signing up with a registered email points the user to log in", async () => {
  const hidden = fakeAuth({ signUp: { data: { user: { identities: [] }, session: null }, error: null } });
  assert.deepEqual(await submitAuth(hidden, { mode: "signup", email: "a@sfsu.edu", password: GOOD }), { status: "duplicate", message: DUPLICATE_MESSAGE });
  const explicit = fakeAuth({ signUp: { data: {}, error: { code: "user_already_exists", message: "User already registered" } } });
  assert.equal((await submitAuth(explicit, { mode: "signup", email: "a@sfsu.edu", password: GOOD })).status, "duplicate");
  assert.equal(isExistingAccount({ user: { identities: [{}] } }), false);
  assert.equal(isExistingAccount(null), false);
});

test("R12.3 / R12.10 logging in goes to the page that asked, or My Events", async () => {
  const db = fakeAuth({ signInWithPassword: { data: { session: { access_token: "t" } }, error: null } });
  assert.deepEqual(await submitAuth(db, { mode: "login", email: "a@sfsu.edu", password: "x", next: "/schedule" }), { status: "signed-in", redirect: "/schedule" });
  assert.deepEqual(await submitAuth(db, { mode: "login", email: "a@sfsu.edu", password: "x" }), { status: "signed-in", redirect: "/host/events" });
  assert.equal(db.calls[0].name, "signInWithPassword");
});

test("R12.3 log-in redirects never leave the site", () => {
  assert.equal(safeNextPath("/events/123?x=1"), "/events/123?x=1");
  for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "events", null, undefined, 42]) {
    assert.equal(safeNextPath(bad), "/host/events", String(bad));
  }
  assert.equal(safeNextPath("//x", "/"), "/");
});

test("R12.4 wrong email or password shows a clear 'invalid credentials' message", async () => {
  const db = fakeAuth({ signInWithPassword: { data: {}, error: { code: "invalid_credentials", message: "Invalid login credentials" } } });
  assert.deepEqual(await submitAuth(db, { mode: "login", email: "a@sfsu.edu", password: "nope" }), { status: "error", message: INVALID_CREDENTIALS_MESSAGE });
  assert.equal(authErrorMessage({ message: "Invalid login credentials" }), INVALID_CREDENTIALS_MESSAGE);
  assert.match(authErrorMessage({ code: "over_email_send_rate_limit" }), /Too many emails/);
  assert.equal(authErrorMessage({ message: "Network down" }), "Network down");
  assert.equal(authErrorMessage(undefined), "Something went wrong. Please try again.");
});

test("R12.6 an unverified user is prompted to verify and can resend the email", async () => {
  const db = fakeAuth({ signInWithPassword: { data: {}, error: { code: "email_not_confirmed", message: "Email not confirmed" } } });
  assert.deepEqual(await submitAuth(db, { mode: "login", email: "A@sfsu.edu", password: "x" }), { status: "unverified", message: UNVERIFIED_MESSAGE, email: "a@sfsu.edu" });
  const sent = await resendVerification(db, "a@sfsu.edu");
  assert.equal(sent.ok, true);
  assert.deepEqual(db.calls.at(-1), { name: "resend", args: { type: "signup", email: "a@sfsu.edu" } });
  assert.equal((await resendVerification(db, "nope")).ok, false);
  const limited = fakeAuth({ resend: { error: { message: "email rate limit exceeded" } } });
  assert.match((await resendVerification(limited, "a@sfsu.edu")).message, /Too many emails/);
  assert.equal(isVerified({ email_confirmed_at: "2026-11-01" }), true);
  assert.equal(isVerified({ confirmed_at: "2026-11-01" }), true);
  assert.equal(isVerified({}), false);
  assert.equal(isVerified(null), false);
});

test("R12.2 the verification link shows success, expired or invalid", () => {
  assert.equal(verificationResult("https://gatoraid.test/?code=abc").status, "verified");
  assert.equal(verificationResult("/#access_token=t&type=signup").status, "verified");
  const expired = verificationResult("/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  assert.equal(expired.status, "expired");
  assert.match(expired.message, /expired/);
  assert.equal(verificationResult("/?error=access_denied&error_description=bad").status, "invalid");
  assert.equal(verificationResult("/?error_description=Link+expired&error=x").status, "expired");
  assert.equal(verificationResult("/events").status, "none");
  assert.equal(verificationResult("http://[bad").status, "none");
});

test("R12.5 logging out ends the session and returns to a signed-out page", async () => {
  const db = fakeAuth();
  assert.deepEqual(await signOutUser(db), { ok: true, redirect: "/" });
  assert.equal(db.calls[0].name, "signOut");
  const failing = fakeAuth({ signOut: { error: { message: "offline" } } });
  assert.equal((await signOutUser(failing)).ok, false);
});

test("R12.10 the proxy refreshes the session cookie on every protected request", async () => {
  let checked = 0;
  fakeSsr((url, key, { cookies }) => ({
    auth: {
      getUser: async () => {
        checked++;
        assert.deepEqual(cookies.getAll(), [{ name: "sb-session", value: "old" }]);
        cookies.setAll([{ name: "sb-session", value: "new", options: { httpOnly: true } }]);
        return { data: { user: { id: "u1" } } };
      },
    },
  }));
  const requestCookies = new Map([["sb-session", "old"]]);
  const request = {
    cookies: {
      getAll: () => [...requestCookies].map(([name, value]) => ({ name, value })),
      set: (name, value) => requestCookies.set(name, value),
    },
  };
  const response = await proxy(request);
  assert.equal(checked, 1);
  assert.equal(requestCookies.get("sb-session"), "new");
  assert.deepEqual(response.cookies.items, [{ name: "sb-session", value: "new", options: { httpOnly: true } }]);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(config.matcher, ["/host/:path*", "/login", "/events/:path*", "/api/:path*"]);
});
