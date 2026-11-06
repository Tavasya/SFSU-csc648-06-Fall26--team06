/*
 * app/(platform)/faq/page.js  —  the /faq route
 *
 * Frequently asked questions, grouped by topic. The questions live here;
 * searching and picking a topic happen in <FaqBrowser> (a Client Component).
 * Each answer is a native <details> element, so it opens with a click or the
 * keyboard.
 */

import Link from "next/link";
import { MessageCircleQuestion, Sparkles, Users } from "lucide-react";
import FaqBrowser from "@/components/about/FaqBrowser";
import "@/components/about/about-gatoraid.css";

export const metadata = {
  title: "FAQ | GatorAid",
  description: "Answers to common questions about GatorAid.",
};

const SECTIONS = [
  {
    title: "Getting started",
    icon: "start",
    questions: [
      [
        "What is GatorAid?",
        "GatorAid brings SFSU campus events together in one place. You can explore what's happening, get recommendations based on your interests, see where events are on the campus map, and preview some venues in 3D.",
      ],
      [
        "Is GatorAid free?",
        "Yes. GatorAid is free to use. Some events charge admission, and each event page says whether it is free or paid.",
      ],
      [
        "Do I need an account?",
        "No account is needed to explore events or use the campus map. Sign in with your email and a password to save events, RSVP, choose your interests and get recommendations.",
      ],
      [
        "Is GatorAid an official SFSU service?",
        "No. GatorAid is a student project built in CSC 648 (Software Engineering) at San Francisco State University. Always check an event's details with its organizer.",
      ],
    ],
  },
  {
    title: "Events, saves and RSVPs",
    icon: "saves",
    questions: [
      [
        "What's the difference between saving an event and RSVPing?",
        "Saving is a bookmark: the event appears under Saved events and on your calendar. An RSVP (Attending, Interested or Not Attending) tells the organizer you're coming. They're separate, so saving an event never changes your RSVP.",
      ],
      [
        "Can I change my RSVP?",
        "Yes. Open the event and choose a different option. Cancelled or completed events no longer accept new Attending RSVPs.",
      ],
      [
        "Who can see my saved events and RSVPs?",
        "Only you. Organizers see how many people saved or RSVP'd to their events, never who.",
      ],
      [
        "How do recommendations work?",
        "For you shows upcoming events that match at least one of the interests you picked, and each recommendation explains which interests it matches. Update your interests at any time under Your interests.",
      ],
    ],
  },
  {
    title: "Calendar and class schedule",
    icon: "calendar",
    questions: [
      [
        "What does the Calendar show?",
        "A week view of the events you saved or RSVP'd to. Saved events have a dashed outline, and RSVP'd events are solid purple. Overlapping events are shown side by side.",
      ],
      [
        "How does the AI schedule scanner work?",
        "Upload a screenshot of your class schedule. GatorAid uses Google's Gemini AI to read the class names, days and times, so it can show your classes on your calendar and point out events that fit around them.",
      ],
    ],
  },
  {
    title: "Allison, the map and 3D previews",
    icon: "map",
    questions: [
      [
        "Who is Allison?",
        "Allison is GatorAid's AI assistant. Ask what's happening on campus, ask for a summary of a long event description, or ask what a venue looks like. Allison only answers using published GatorAid events.",
      ],
      [
        "How do I find where an event is?",
        "Open Campus map to see every building with upcoming events, or use the Location section on any event page, which shows the building on a small map.",
      ],
      [
        "Which rooms have 3D previews?",
        "Rooms that have been scanned show a 3D badge on the map and a preview button on their events. We started with the Cesar Chavez Student Center and are adding more rooms over time.",
      ],
    ],
  },
  {
    title: "Hosting events",
    icon: "hosting",
    questions: [
      [
        "Who can host an event?",
        "Anyone with an account. Open For organizers in the top bar and choose Create event.",
      ],
      [
        "Will my event be public right away?",
        "No. New events start as drafts that only you can see. Preview it to check how it will look to students, then publish it when it's ready.",
      ],
      [
        "Can I edit or delete my event?",
        "Yes. Your events (under For organizers) lists everything you host, with options to edit or delete. You can only change your own events.",
      ],
      [
        "Can I see who is coming?",
        "You can see how many students are attending, interested or saved your event on Your events, under For organizers. Names are kept private.",
      ],
    ],
  },
];

export default function Page() {
  return (
    <div className="ga-doc ga-doc-wide">
      <header className="ga-page-hero">
        <span className="ga-page-hero-icon">
          <MessageCircleQuestion size={26} aria-hidden="true" />
        </span>
        <span className="ga-about-eyebrow">FAQ</span>
        <h1>Questions? We&apos;ve got answers.</h1>
        <p>Everything you need to know about finding, saving and hosting events on GatorAid.</p>
      </header>

      <FaqBrowser sections={SECTIONS} />

      <section className="ga-help-cards">
        <Link className="ga-help-card" href="/assistant">
          <Sparkles size={20} aria-hidden="true" />
          <div>
            <h2>Ask Allison</h2>
            <p>Questions about events? Allison searches everything on GatorAid for you.</p>
          </div>
        </Link>
        <Link className="ga-help-card" href="/about">
          <Users size={20} aria-hidden="true" />
          <div>
            <h2>Contact the team</h2>
            <p>Something not working, or a question we didn&apos;t answer? Reach the GatorAid team.</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
