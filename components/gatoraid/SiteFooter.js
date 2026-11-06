/*
 * components/gatoraid/SiteFooter.js
 *
 * PURPOSE:
 * The one footer for all of GatorAid, shared by the homepage (app/page.js)
 * and every app page (components/gatoraid/Shell.js).
 */

import Link from "next/link";
import Logo from "./Logo";
import "./site.css";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/events", label: "Explore events" },
      { href: "/events/for-you", label: "For you" },
      { href: "/map", label: "Campus map" },
      { href: "/assistant", label: "Ask Allison" },
    ],
  },
  {
    title: "Your plans",
    links: [
      { href: "/saved", label: "Saved events" },
      { href: "/calendar", label: "Your calendar" },
      { href: "/interests", label: "Your interests" },
      { href: "/schedule", label: "Upload schedule" },
    ],
  },
  {
    title: "Organizers",
    links: [
      { href: "/host/events", label: "Your events" },
      { href: "/host/events/new", label: "Create an event" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about-gatoraid", label: "Our mission" },
      { href: "/faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/about", label: "Meet the team" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-wrap">
        <div className="site-footer-grid">
          <div className="site-footer-about">
            <Link href="/" className="site-brand">
              <Logo />
              GatorAid
            </Link>
            <p>Every SF State event in one place, including the ones that fit your schedule.</p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} GatorAid · CSC 648 Team 06, San Francisco State University</span>
          <span>A student project, not an official SFSU service.</span>
        </div>
      </div>
    </footer>
  );
}
