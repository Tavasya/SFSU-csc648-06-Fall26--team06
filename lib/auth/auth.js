/*
 * lib/auth/auth.js
 *
 * PURPOSE:
 * Account logic for sign-up, log-in, verification and log-out (R12), kept
 * apart from the login page (app/(platform)/login/page.js) so it can be unit
 * tested with a fake Supabase client (tests/auth.test.mjs).
 *
 * Every function that talks to Supabase takes the client ("db") as its first
 * argument: the browser client from lib/supabase/client.js in the app, a fake
 * one in tests.
 */
import { validatePassword } from "../password/password-validation.js";

export const PASSWORD_RULES_MESSAGE =
  "Password must be at least 8 characters and contain uppercase, lowercase, number, and special characters.";
export const CHECK_EMAIL_MESSAGE =
  "If an account can be created with this email, you'll receive a confirmation email. Please check your inbox.";
export const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password. Please try again.";
export const UNVERIFIED_MESSAGE =
  "Please verify your email before signing in. Check your inbox, or send a new verification email.";
export const DUPLICATE_MESSAGE = "An account with this email already exists. Please sign in instead.";
export const DEFAULT_REDIRECT = "/host/events";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// R12.1: trimmed, lower-case email.
export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

// R12.1 / R12.8: field errors for the sign-up or log-in form ({} when valid).
export function validateCredentials({ email, password }, { signup = false } = {}) {
  const errors = {};
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  else if (signup && Object.values(validatePassword(password)).some((ok) => !ok))
    errors.password = PASSWORD_RULES_MESSAGE;
  return errors;
}

// R12.3 / R12.10: only paths on this site ("/x", not "//other.site" or a full URL).
export function safeNextPath(next, fallback = DEFAULT_REDIRECT) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : fallback;
}

// R12.4 / R12.6 / R12.11: a friendly message for a Supabase auth error.
export function authErrorMessage(error) {
  const code = error?.code || "";
  const text = String(error?.message || "").toLowerCase();
  if (code === "invalid_credentials" || text.includes("invalid login credentials")) return INVALID_CREDENTIALS_MESSAGE;
  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return UNVERIFIED_MESSAGE;
  if (code === "user_already_exists" || text.includes("already registered")) return DUPLICATE_MESSAGE;
  if (code === "over_email_send_rate_limit" || text.includes("rate limit"))
    return "Too many emails were sent. Please wait a minute and try again.";
  return error?.message || "Something went wrong. Please try again.";
}

// R12.11: with email confirmation on, Supabase answers a sign-up for an email
// that already has an account with a user that has no identities (and no error).
export function isExistingAccount(data) {
  return Array.isArray(data?.user?.identities) && data.user.identities.length === 0;
}

// R12.1 / R12.3: sign up or log in. Returns one of
//  { status: "invalid", errors }               the form has problems
//  { status: "signed-in", redirect }           go to `redirect`
//  { status: "check-email", message }          sign-up needs email verification
//  { status: "duplicate", message }            sign-up email already has an account
//  { status: "unverified", message, email }    log-in before verifying (R12.6)
//  { status: "error", message }
export async function submitAuth(db, { mode, email, password, next }) {
  const signup = mode === "signup";
  const errors = validateCredentials({ email, password }, { signup });
  if (Object.keys(errors).length) return { status: "invalid", errors };
  const credentials = { email: normalizeEmail(email), password };
  const { data, error } = signup
    ? await db.auth.signUp(credentials)
    : await db.auth.signInWithPassword(credentials);
  if (error) {
    const message = authErrorMessage(error);
    if (message === UNVERIFIED_MESSAGE) return { status: "unverified", message, email: credentials.email };
    if (message === DUPLICATE_MESSAGE) return { status: "duplicate", message };
    return { status: "error", message };
  }
  if (signup && isExistingAccount(data)) return { status: "duplicate", message: DUPLICATE_MESSAGE };
  if (data?.session) return { status: "signed-in", redirect: safeNextPath(next) };
  return { status: "check-email", message: CHECK_EMAIL_MESSAGE };
}

// R12.6: send another verification email.
export async function resendVerification(db, email) {
  const clean = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(clean)) return { ok: false, message: "Enter a valid email address." };
  const { error } = await db.auth.resend({ type: "signup", email: clean });
  return error
    ? { ok: false, message: authErrorMessage(error) }
    : { ok: true, message: "A new verification email is on its way. Please check your inbox." };
}

// R12.2: reads the link Supabase sends users back to after they click the
// verification email. Errors arrive in the query string or the #hash.
export function verificationResult(url) {
  let parsed;
  try {
    parsed = new URL(url, "http://localhost");
  } catch {
    return { status: "none" };
  }
  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.replace(/^#/, "")).forEach((value, key) => params.set(key, value));
  const errorCode = params.get("error_code") || params.get("error");
  if (errorCode) {
    const expired = errorCode === "otp_expired" || /expired/i.test(params.get("error_description") || "");
    return {
      status: expired ? "expired" : "invalid",
      message: expired
        ? "This verification link has expired. Request a new verification email to continue."
        : "This verification link is invalid. Request a new verification email to continue.",
    };
  }
  if (params.get("code") || params.get("access_token") || params.get("type") === "signup")
    return { status: "verified", message: "Your email is verified. Welcome to GatorAid!" };
  return { status: "none" };
}

// R12.6: features that need a verified email check this.
export function isVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

// R12.5: ends the session. Returns { ok, redirect }.
export async function signOutUser(db, redirect = "/") {
  const { error } = await db.auth.signOut();
  return error ? { ok: false, message: "Could not sign out. Please try again." } : { ok: true, redirect };
}

// R12.8 (used on the sign-up form): a 0-5 strength score and its label.
export function passwordStrength(password) {
  const score = Object.values(validatePassword(password ?? "")).filter(Boolean).length;
  const label = !password ? "Not entered" : score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Strong" : "Very strong";
  return { score, label };
}
