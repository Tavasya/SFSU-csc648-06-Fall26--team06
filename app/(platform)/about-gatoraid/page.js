/*
 * app/(platform)/about-gatoraid/page.js  —  the /about-gatoraid route
 *
 * The product's About page: mission, the problem GatorAid solves, its
 * features, values and who it's for. Static content, so it stays a Server
 * Component. The team page (class goals, meetings) is /about.
 */

import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Box,
  CalendarRange,
  Clock3,
  Compass,
  GraduationCap,
  HeartHandshake,
  Layers,
  Lightbulb,
  Lock,
  Map as MapIcon,
  MapPinned,
  Megaphone,
  ScanText,
  Sparkles,
  Users,
} from "lucide-react";
import "@/components/about/about-gatoraid.css";

export const metadata = {
  title: "Our mission | GatorAid",
  description: "Help every Gator discover what's happening on campus, find their way there, and find their people.",
};

const PROBLEMS = [
  [Layers, "Scattered", "Information lives on dozens of university pages, Instagram accounts and flyers."],
  [MapPinned, "Unfamiliar", "A building name doesn't tell you where it is or what the room looks like."],
  [Clock3, "Busy", "It's hard to tell which events fit around your classes, work and everything else."],
];

const FEATURES = [
  [Compass, "Explore & For You", "Every campus event in one place, with recommendations based on your interests."],
  [CalendarRange, "Calendar", "Your saved events, RSVPs and classes in one week view."],
  [ScanText, "AI Schedule Scanner", "Scan your class schedule, add work and other commitments, and GatorAid finds events that fit around them."],
  [Sparkles, "Allison, your AI assistant", "Ask what's happening, get long descriptions summarized, and preview the venue."],
  [MapIcon, "Campus Map", "See where every event is on an interactive 2D map of SFSU."],
  [Box, "3D Venue Previews", "Look around a room before you go, starting with the Cesar Chavez Student Center."],
];

const VALUES = [
  [GraduationCap, "Student-first", "Built by SFSU students, for SFSU students."],
  [Accessibility, "Accessible to everyone", "Every event shows wheelchair access and ASL availability, and nothing relies on color alone."],
  [Lightbulb, "Clear and honest", "No guessing. Recommendations explain why they match you."],
  [Lock, "Private by default", "Your saved events and RSVPs are visible only to you. Hosts see counts, never names."],
  [HeartHandshake, "Built for connection", "Events are where friendships, study groups and clubs start. GatorAid helps you show up."],
  [Megaphone, "Open to all", "Anyone can host an event and share it with the campus."],
];

const AUDIENCES = [
  [Compass, "New students", "Finding their way around campus."],
  [Users, "Active students", "Looking for their next event."],
  [Megaphone, "Organizers and clubs", "Reaching the students who'd care."],
];

function CardGrid({ items, className = "" }) {
  return (
    <div className={"ga-about-grid " + className}>
      {items.map(([Icon, title, text]) => (
        <article className="ga-card ga-about-card" key={title}>
          <span className="ga-about-icon">
            <Icon size={20} />
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
    <div className="ga-about">
      <section className="ga-about-hero">
        <span className="ga-about-eyebrow">Our mission</span>
        <h1>
          Help every Gator discover what&apos;s happening on campus, find their way there, and
          find their people.
        </h1>
        <div className="ga-about-hero-actions">
          <Link className="ga-button" href="/events">
            Explore events
          </Link>
          <Link className="ga-button secondary" href="/about">
            Meet the team
          </Link>
        </div>
      </section>

      <section className="ga-about-section">
        <h2>The problem</h2>
        <p className="ga-about-lead">
          <strong>Campus life at SFSU is hard to find.</strong> Events, resources and locations are
          spread across university websites, department pages, Instagram and flyers. New students
          often don&apos;t know where a building is or what a room looks like, and busy students
          can&apos;t tell which events fit around their classes. Many students miss out, not because
          they aren&apos;t interested, but because they never hear about it in time.
        </p>
        <CardGrid items={PROBLEMS} />
      </section>

      <section className="ga-about-section">
        <h2>How GatorAid helps</h2>
        <CardGrid items={FEATURES} />
      </section>

      <section className="ga-about-section">
        <h2>Our values</h2>
        <CardGrid items={VALUES} />
      </section>

      <section className="ga-about-section">
        <h2>Who it&apos;s for</h2>
        <CardGrid items={AUDIENCES} />
      </section>

      <section className="ga-about-cta">
        <h2>Find your next campus event.</h2>
        <div className="ga-about-hero-actions">
          <Link className="ga-button" href="/events">
            Explore events
          </Link>
          <Link className="ga-about-link" href="/about">
            Meet the team <ArrowRight size={14} />
          </Link>
        </div>
      </section>

    </div>
  );
}
