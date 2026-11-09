/*
 * app/(platform)/accessibility/page.js  —  the /accessibility route
 *
 * GatorAid's accessibility statement: what the app already does, what's
 * still being improved, and how to report a problem.
 */

import Link from "next/link";
import {
  Accessibility,
  Box,
  Contrast,
  Hand,
  Keyboard,
  Map as MapIcon,
  MessageSquareText,
  Smartphone,
  Users,
} from "lucide-react";
import "@/components/about/about-gatoraid.css";

export const metadata = {
  title: "Accessibility | GatorAid",
  description: "GatorAid's commitment to making campus life accessible to every student.",
};

const EVENTS = [
  [Accessibility, "Access info on every event", "Each event shows whether it's wheelchair accessible."],
  [Hand, "ASL availability", "Events say whether ASL interpretation is available, and organizers are prompted to share it."],
  [Box, "See the venue first", "3D previews of scanned rooms let you check the space before you go."],
];

const DESIGN = [
  [Contrast, "Color is never the only signal", "Labels like “Saved”, “RSVP'd” and “3D room available” always appear as text too, in light and dark mode."],
  [Keyboard, "Keyboard friendly", "Links, buttons, filters and FAQ answers work with the keyboard, with a visible focus outline."],
  [Smartphone, "Readable everywhere", "Pages fit phones and tablets without scrolling sideways, and text can be zoomed."],
  [MessageSquareText, "Clear wording", "Error messages say what went wrong and how to fix it, and every page has a clear way back."],
];

const IMPROVING = [
  [Box, "3D room viewer", "Better keyboard and screen reader support, and written descriptions of each scanned room."],
  [MapIcon, "Campus map", "Easiest with a mouse or touch today. Every building is also listed in its “Find a place” menu."],
];

function Cards({ items, className = "" }) {
  return (
    <div className={`ga-about-grid ${className}`}>
      {items.map(([Icon, title, text]) => (
        <article className="ga-card ga-about-card" key={title}>
          <span className="ga-about-icon">
            <Icon size={20} aria-hidden="true" />
          </span>
          <h3>{title}</h3>
          <p className="ga-muted">{text}</p>
        </article>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <div className="ga-doc ga-doc-wide">
      <header className="ga-page-hero">
        <span className="ga-page-hero-icon">
          <Accessibility size={26} aria-hidden="true" />
        </span>
        <span className="ga-about-eyebrow">Accessibility</span>
        <h1>Campus life should be open to every Gator.</h1>
        <p>And so should the tools to find it. Here&apos;s what GatorAid does today, and what we&apos;re still working on.</p>
        <div className="ga-hero-tags">
          <span className="ga-doc-updated">Goal: WCAG 2.1 level AA</span>
          <span className="ga-doc-updated muted">Not formally audited yet</span>
        </div>
      </header>

      <section>
        <h2>Accessible events</h2>
        <Cards items={EVENTS} />
      </section>

      <section>
        <h2>Accessible design</h2>
        <Cards items={DESIGN} className="two" />
      </section>

      <section>
        <h2>What we&apos;re still improving</h2>
        <ul className="ga-progress-list">
          {IMPROVING.map(([Icon, title, text]) => (
            <li className="ga-card" key={title}>
              <span className="ga-about-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <h3>
                  {title} <span className="ga-status">In progress</span>
                </h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ga-report">
        <div>
          <h2>Run into a barrier?</h2>
          <p>Tell us, and we&apos;ll work on it. It helps to include:</p>
          <ol>
            <li>The page you were on</li>
            <li>What you were trying to do</li>
            <li>Your device or assistive technology</li>
          </ol>
        </div>
        <Link className="ga-button" href="/about">
          <Users size={16} aria-hidden="true" /> Contact the team
        </Link>
      </section>
    </div>
  );
}
