/*
 * app/(platform)/privacy/page.js  —  the /privacy route
 *
 * A plain-language summary of what GatorAid stores and who can see it.
 * Keep it in sync with the database rules (row-level security) and the AI
 * features when they change.
 */

import Link from "next/link";
import {
  BadgeCheck,
  Check,
  Cookie,
  EyeOff,
  Lock,
  Minus,
  ScanText,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import "@/components/about/about-gatoraid.css";

export const metadata = {
  title: "Privacy | GatorAid",
  description: "What GatorAid stores, who can see it, and how the AI features use your information.",
};

const AT_A_GLANCE = [
  [BadgeCheck, "No ads, no selling", "We collect only what the app needs to work."],
  [Lock, "Your plans are yours", "Only you see your interests, saves, RSVPs and schedule."],
  [EyeOff, "Hosts see counts, not names", "Organizers know how many, never who."],
  [ShieldCheck, "Enforced by the database", "Privacy rules live in the database, not just the app."],
];

// What GatorAid stores, and who can see it: [label, detail, you, organizers, everyone]
const DATA = [
  ["Your account", "Your email address. Passwords are handled by Supabase and never visible to us.", true, false, false],
  ["Your interests", "The topics you choose for recommendations.", true, false, false],
  ["Saved events and RSVPs", "Organizers see only the totals for their events.", true, "Totals only", false],
  ["Your schedule", "The classes, work shifts and other commitments you confirm, with their days and times.", true, false, false],
  ["Events you host", "Published events, including the contact email you chose to share. Drafts stay private.", true, "When published", "When published"],
];

function Cell({ value }) {
  if (value === true) {
    return (
      <span className="ga-matrix-yes">
        <Check size={16} aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="ga-matrix-no">
        <Minus size={16} aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return <span className="ga-matrix-some">{value}</span>;
}

export default function Page() {
  return (
    <div className="ga-doc ga-doc-wide">
      <header className="ga-page-hero">
        <span className="ga-page-hero-icon">
          <ShieldCheck size={26} aria-hidden="true" />
        </span>
        <span className="ga-about-eyebrow">Privacy</span>
        <h1>Your plans stay yours.</h1>
        <p>What GatorAid stores, who can see it, and how the AI features use your information.</p>
        <span className="ga-doc-updated">Last updated November 2026</span>
      </header>

      <div className="ga-glance">
        {AT_A_GLANCE.map(([Icon, title, text]) => (
          <div className="ga-card ga-glance-card" key={title}>
            <span className="ga-about-icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>

      <section>
        <h2>Who can see what</h2>
        <div className="ga-card ga-matrix-wrap">
          <table className="ga-matrix">
            <thead>
              <tr>
                <th scope="col">What we store</th>
                <th scope="col">You</th>
                <th scope="col">Organizers</th>
                <th scope="col">Everyone</th>
              </tr>
            </thead>
            <tbody>
              {DATA.map(([label, detail, you, hosts, everyone]) => (
                <tr key={label}>
                  <th scope="row">
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </th>
                  <td><Cell value={you} /></td>
                  <td><Cell value={hosts} /></td>
                  <td><Cell value={everyone} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ga-doc-note">
          Cover images are stored privately and shown through links that expire after an hour.
        </p>
      </section>

      <section>
        <h2>AI features</h2>
        <p>GatorAid uses Google&apos;s Gemini AI for two features. Google processes these requests under its own terms for the Gemini API.</p>
        <div className="ga-split">
          <div className="ga-card ga-split-card">
            <span className="ga-about-icon">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <h3>Allison, the AI assistant</h3>
            <p>
              Your question and a list of published events are sent to Gemini to write the answer.
              Don&apos;t share personal information in your questions.
            </p>
          </div>
          <div className="ga-card ga-split-card">
            <span className="ga-about-icon">
              <ScanText size={20} aria-hidden="true" />
            </span>
            <h3>The schedule scanner</h3>
            <p>The schedule screenshot you upload is sent to Gemini to read your classes.</p>
          </div>
        </div>
      </section>

      <section className="ga-split">
        <div className="ga-card ga-split-card">
          <span className="ga-about-icon">
            <Cookie size={20} aria-hidden="true" />
          </span>
          <h3>Cookies</h3>
          <p>One cookie keeps you signed in. No advertising or tracking cookies.</p>
        </div>
        <div className="ga-card ga-split-card">
          <span className="ga-about-icon">
            <Trash2 size={20} aria-hidden="true" />
          </span>
          <h3>Removing your data</h3>
          <p>
            Remove saved events, change RSVPs and clear your interests at any time. To delete your
            account, contact the team.
          </p>
        </div>
      </section>

      <section className="ga-help-cards">
        <Link className="ga-help-card" href="/about">
          <Users size={20} aria-hidden="true" />
          <div>
            <h2>Questions about your data?</h2>
            <p>Contact the GatorAid team through the Meet the team page.</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
