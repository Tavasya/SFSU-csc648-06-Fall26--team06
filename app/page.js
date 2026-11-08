/*
 * app/page.js
 *
 * PURPOSE:
 * The GatorAid homepage (/). Explains the problem GatorAid solves, highlights
 * the features that set it apart (schedule fit, campus map, Allison), and
 * previews real published events happening this week.
 *
 * Lives outside the (platform) route group, so it has its own top bar instead
 * of the app sidebar. Styles are scoped under .home in ./home.css.
 */

import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  Briefcase,
  BellRing,
  BookmarkCheck,
  Box,
  CalendarCheck2,
  CalendarDays,
  CalendarX2,
  Check,
  Clock,
  Compass,
  HeartHandshake,
  Lock,
  MapPin,
  Megaphone,
  MessageSquareText,
  Search,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/gatoraid/SiteHeader";
import SiteFooter from "@/components/gatoraid/SiteFooter";
import HomeMap from "@/components/home/HomeMap";
import RoomPreview from "@/components/home/RoomPreview";
import { loadMapEvents } from "@/lib/map/page-data";
import {
  bannerFor,
  bannerStyle,
  orderedCategoryNames,
} from "@/lib/events/banner";
import "./home.css";

export const metadata = {
  title: "GatorAid | Every San Francisco State event, in one place",
  description:
    "Find San Francisco State events that fit around your classes and work, see where they are on campus, and ask Allison what's happening.",
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SHOWN = 6;

const PROBLEMS = [
  {
    Icon: Search,
    title: "Spread across a dozen places",
    text: "Instagram stories, flyers, Discord servers, club emails. To know what's on this week, you'd have to check them all.",
    answer: "Every campus event in one feed and on one map",
  },
  {
    Icon: CalendarX2,
    title: "Planned without your schedule",
    text: "You find a workshop you'd love, then realize it's during your lab. Or you hear about it the day after.",
    answer: "Picked for your interests, checked against your classes and work",
  },
  {
    Icon: MapPin,
    title: "Hard to find on campus",
    text: "\u201cHSS 306\u201d doesn't mean much if you've never been inside the Humanities building.",
    answer: "3D scans of campus rooms you can walk through",
  },
];

// Who GatorAid is for (the long version is on /about-gatoraid).
const AUDIENCES = [
  {
    Icon: Compass,
    title: "New and transfer students",
    text: "Finding their way around a campus, and a community, they don't know yet.",
  },
  {
    Icon: Briefcase,
    title: "Busy students",
    text: "Commuters and students who work, who need events that fit between classes and shifts.",
  },
  {
    Icon: Megaphone,
    title: "Clubs and organizers",
    text: "Reaching the students who would actually care about their event.",
  },
];

const MORE = [
  {
    Icon: Upload,
    title: "Schedule scanner",
    text: "Scan your class schedule, then add work and other commitments.",
    href: "/schedule",
  },
  {
    Icon: BookmarkCheck,
    title: "Your plans",
    text: "Everything you saved or RSVP'd to, in one list.",
    href: "/saved",
  },
  {
    Icon: CalendarDays,
    title: "Your calendar",
    text: "Your schedule and events in one weekly view.",
    href: "/calendar",
  },
  {
    Icon: Users,
    title: "For organizers",
    text: "Create, preview and publish events, and track RSVPs.",
    href: "/host/events",
  },
];

// Short versions of the values on /about-gatoraid.
const VALUES = [
  {
    Icon: HeartHandshake,
    title: "Built for connection",
    text: "Events are how students meet their people. GatorAid helps you show up.",
  },
  {
    Icon: Accessibility,
    title: "Accessible to everyone",
    text: "Every event lists wheelchair access and ASL availability.",
  },
  {
    Icon: Lock,
    title: "Private by default",
    text: "Your saves and RSVPs are yours. Hosts see counts, never names.",
  },
  {
    Icon: Megaphone,
    title: "Open to all",
    text: "Any student, club or department can host an event.",
  },
];

const dayFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

// This week's events, or the next ones coming up when this week is empty.
async function loadEvents() {
  try {
    const db = await createClient();
    const now = new Date();
    const {
      data: { user },
    } = await db.auth.getUser();
    // A signed-in host's own events are left out; they're on Your events.
    let eventsQuery = db
      .from("events")
      .select("*, locations(building_name)")
      .eq("publication_status", "published")
      .eq("status", "active")
      .gte("end_date_time", now.toISOString())
      .order("start_date_time")
      .limit(24);
    if (user) eventsQuery = eventsQuery.neq("host_id", user.id);
    const [{ data: events, error }, { data: categories }] =
      await Promise.all([
        eventsQuery,
        db.from("categories").select("id, name"),
      ]);
    if (error) throw error;

    const weekEnd = now.getTime() + WEEK_MS;
    const thisWeek = events.filter(
      (event) => new Date(event.start_date_time).getTime() <= weekEnd,
    );
    return {
      events: (thisWeek.length ? thisWeek : events).slice(0, SHOWN),
      isThisWeek: thisWeek.length > 0,
      categories: categories ?? [],
    };
  } catch (error) {
    console.warn("Homepage events unavailable:", error.message);
    return { events: [], isThisWeek: true, categories: [] };
  }
}

// The real Campus Map's places, events and 3D rooms (same data as /map).
async function loadMap() {
  try {
    return await loadMapEvents();
  } catch (error) {
    console.warn("Homepage map unavailable:", error.message);
    return null;
  }
}

export default async function Home() {
  const [{ events, isThisWeek, categories }, map] = await Promise.all([
    loadEvents(),
    loadMap(),
  ]);

  return (
    <div className="home site-page">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="home-hero">
          <div className="site-wrap home-hero-grid">
            <div>
              <p className="home-eyebrow">
                Made by San Francisco State students, for San Francisco
                State students
              </p>
              <h1>
                Discover San Francisco State events, <em>matched just for you</em>.
              </h1>
              <p className="home-lead">
                GatorAid brings club meetings, workshops, career events and
                socials into one place, recommends the ones that match your
                interests and fit around your classes, work and other
                commitments, and shows you where
                they are on campus, right down to a 3D view of the room.
              </p>
              <div className="home-ctas">
                <Link className="home-button" href="/events">
                  Browse events <ArrowRight size={16} />
                </Link>
                <Link className="home-button ghost" href="/host/events/new">
                  Host an event
                </Link>
              </div>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Problem, with a project overview: the "introduction" screen */}
        <section className="home-section home-full" id="problem">
          <div className="site-wrap">
            <div className="home-intro">
              <div className="home-section-head">
                <p className="home-eyebrow">The problem</p>
                <h2>
                  Great events happen on campus every week. Finding them
                  shouldn&apos;t be the hard part.
                </h2>
                <p className="home-intro-lead">
                  GatorAid is a web app made by San Francisco State students for
                  San Francisco State students. It brings every campus event into
                  one place, recommends the ones that match your interests and
                  fit your week, and lets you walk through the room in 3D before
                  you go.
                </p>
              </div>
              <div className="home-audience">
                <p className="home-audience-title">Who it&apos;s for</p>
                <ul>
                  {AUDIENCES.map(({ Icon, title, text }) => (
                    <li key={title}>
                      <Icon size={18} />
                      <div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="home-problems">
              {PROBLEMS.map(({ Icon, title, text, answer }) => (
                <div className="home-problem" key={title}>
                  <Icon size={20} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <p className="home-problem-answer">
                    <Check size={15} />
                    {answer}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Features that set GatorAid apart */}
        <section className="home-section tinted" id="features">
          <div className="site-wrap">
            <div className="home-section-head">
              <p className="home-eyebrow">How GatorAid helps</p>
              <h2>Built around a student&apos;s interests and week, not just a list.</h2>
            </div>

            <Feature
              Icon={Sparkles}
              label="For you"
              title="Recommendations that match your interests and your schedule"
              text="Pick what you're into, like tech, art, careers or wellness, then add your schedule: scan your classes and add work shifts or anything else you're committed to. GatorAid recommends events that match, tells you why, and marks the ones that fit around your week."
              href="/events/for-you"
              cta="See events for you"
              visual={<ScheduleVisual />}
            />
            <Feature
              reverse
              Icon={MapPin}
              label="Campus map"
              title="Know where it is before you go"
              text="See every building with something happening, filter by today or this week, and tap a building to see its events."
              href="/map"
              cta="Open the campus map"
              visual={
                map ? (
                  <HomeMap places={map.places} events={map.events} scans={map.scans} />
                ) : null
              }
            />
            <Feature
              Icon={Box}
              label="3D exploration"
              title="Walk through the room before you get there"
              text="Rooms on campus are captured as 3D scans you can explore right in your browser. Drag to look around and use W A S D to walk, so you know the space, the seating and the way in before you arrive."
              href="/map"
              cta="Find a 3D room on the map"
              visual={<RoomPreview />}
            />
            <Feature
              reverse
              Icon={MessageSquareText}
              label="Allison, AI assistant"
              title="Just ask what's happening"
              text="Ask Allison in plain English, like “anything free on Thursday after 3?”, and get real events from GatorAid back, never made-up ones."
              href="/assistant"
              cta="Ask Allison"
              visual={<AssistantVisual />}
            />

            <div className="home-more">
              {MORE.map(({ Icon, title, text, href }) => (
                <Link className="home-more-item" href={href} key={title}>
                  <Icon size={18} />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Real events */}
        <section className="home-section">
          <div className="site-wrap">
            <div className="home-events-head">
              <div>
                <p className="home-eyebrow">
                  {isThisWeek ? "This week at San Francisco State" : "Coming up at San Francisco State"}
                </p>
                <h2>
                  {isThisWeek ? "Happening this week" : "Next on campus"}
                </h2>
              </div>
              <Link className="home-link" href="/events">
                See all events <ArrowRight size={15} />
              </Link>
            </div>

            {events.length > 0 ? (
              <div className="home-events">
                {events.map((event) => (
                  <EventCard
                    event={event}
                    categories={categories}
                    key={event.id}
                  />
                ))}
              </div>
            ) : (
              <div className="home-empty">
                <CalendarDays size={28} />
                <p>No upcoming events yet. Check back soon, or host one.</p>
                <Link className="home-button ghost" href="/host/events/new">
                  Host an event
                </Link>
              </div>
            )}

            {map && <ProjectStats map={map} />}
          </div>
        </section>

        {/* Mission */}
        <section className="home-section tinted" id="mission">
          <div className="site-wrap home-mission">
            <div>
              <p className="home-eyebrow">Our mission</p>
              <h2>
                Help every Gator find what&apos;s happening, find their way
                there, and find their people.
              </h2>
              <p className="home-mission-lead">
                Campus events are where friendships, study groups and clubs
                start. GatorAid makes it easier to show up, especially for new
                students still finding their place at San Francisco State.
              </p>
              <div className="home-mission-links">
                <Link className="home-link" href="/about-gatoraid">
                  Our mission and values <ArrowRight size={15} />
                </Link>
                <Link className="home-link" href="/faq">
                  FAQ <ArrowRight size={15} />
                </Link>
              </div>
            </div>
            <ul className="home-values">
              {VALUES.map(({ Icon, title, text }) => (
                <li key={title}>
                  <Icon size={18} />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Organizer CTA */}
        <section className="home-section">
          <div className="site-wrap">
            <div className="home-cta">
              <div>
                <h2>Running a club or a campus event?</h2>
                <p>
                  Create a page in minutes, preview it before it goes live,
                  and see how many students saved or RSVP&apos;d.
                </p>
              </div>
              <Link className="home-button light" href="/host/events/new">
                Create an event <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// Live numbers from the Campus Map data, under this week's events.
function ProjectStats({ map }) {
  const rooms = Object.values(map.scans ?? {}).reduce((sum, list) => sum + list.length, 0);
  const buildings = new Set(map.events.map((event) => event.mapId).filter(Boolean)).size;
  const stats = [
    { value: map.events.length, label: "upcoming events" },
    { value: buildings, label: "campus buildings with events" },
    { value: rooms, label: rooms === 1 ? "room scanned in 3D" : "rooms scanned in 3D" },
  ].filter((stat) => stat.value > 0);
  if (!stats.length) return null;
  return (
    <dl className="home-stats">
      {stats.map(({ value, label }) => (
        <div key={label}>
          <dt>{value}</dt>
          <dd>{label}</dd>
        </div>
      ))}
      <div className="home-stats-note">
        <dt>Live</dt>
        <dd>from the same data students see</dd>
      </div>
    </dl>
  );
}

function Feature({ Icon, label, title, text, href, cta, visual, reverse }) {
  return (
    <div className={`home-feature${reverse ? " reverse" : ""}`}>
      <div className="home-feature-copy">
        <span className="home-feature-label">
          <Icon size={16} />
          {label}
        </span>
        <h3>{title}</h3>
        <p>{text}</p>
        <Link className="home-link" href={href}>
          {cta} <ArrowRight size={15} />
        </Link>
      </div>
      <div className="home-visual" aria-hidden="true">
        {visual}
      </div>
    </div>
  );
}

function EventCard({ event, categories }) {
  const names = orderedCategoryNames(event.category_ids, categories);
  const banner = bannerFor(names[0]);
  const start = new Date(event.start_date_time);
  return (
    <Link className="home-event" href={`/events/${event.id}`}>
      <div className="home-event-cover" style={bannerStyle(banner)}>
        <banner.Icon size={30} />
      </div>
      <div className="home-event-body">
        <span className="home-event-date">
          {dayFormat.format(start)} · {timeFormat.format(start)}
        </span>
        <h3>{event.title}</h3>
        <p>
          <MapPin size={14} />
          {event.locations?.building_name ?? "Location TBA"}
        </p>
        <div className="home-event-tags">
          {names[0] && <span>{names[0]}</span>}
          <span className={event.admission_type === "free" ? "free" : ""}>
            {event.admission_type === "free" ? "Free" : "Paid"}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* Small illustrative UI panels. They show what each feature does, built from
   the app's own patterns, so the homepage needs no screenshots to stay current. */

function HeroPreview() {
  const rows = [
    { day: "THU", date: "13", title: "Resume Review Drop-in", place: "Career Center", match: "Career", fit: true },
    { day: "THU", date: "13", title: "Intro to Figma Workshop", place: "J. Paul Leonard Library", match: "Arts", fit: false },
    { day: "FRI", date: "14", title: "Latinx Student Mixer", place: "Cesar Chavez Student Center", match: "Social", fit: true },
  ];
  return (
    <div className="home-preview" aria-hidden="true">
      <div className="home-preview-top">
        <strong>Matched to your interests</strong>
        <span>
          <CalendarCheck2 size={14} /> Schedule synced
        </span>
      </div>
      {rows.map((row) => (
        <div className="home-preview-row" key={row.title}>
          <div className="home-date">
            <small>{row.day}</small>
            {row.date}
          </div>
          <div className="home-preview-text">
            <strong>{row.title}</strong>
            <small>
              <MapPin size={12} /> {row.place} · Matches {row.match}
            </small>
          </div>
          <span className={`home-fit${row.fit ? "" : " clash"}`}>
            {row.fit ? <Check size={12} /> : <Clock size={12} />}
            {row.fit ? "Fits" : "Class"}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScheduleVisual() {
  const blocks = [
    { time: "11:00", label: "CSC 648 · Lecture", kind: "class" },
    { time: "12:30", label: "Club Fair · Malcolm X Plaza", kind: "event", match: "Social" },
    { time: "2:00", label: "MATH 324 · Lecture", kind: "class" },
    { time: "3:30", label: "Hack Night · Thornton Hall", kind: "event", match: "Technology" },
  ];
  return (
    <div className="home-panel">
      <div className="home-interests">
        <small>Your interests</small>
        <span>Technology</span>
        <span>Career</span>
        <span>Social</span>
      </div>
      <div className="home-panel-title">Thursday</div>
      {blocks.map((block) => (
        <div className={`home-block ${block.kind}`} key={block.time}>
          <small>{block.time}</small>
          <span>
            {block.label}
            {block.match && <i>Matches {block.match}</i>}
          </span>
          {block.kind === "event" && (
            <em>
              <Check size={12} /> Fits
            </em>
          )}
        </div>
      ))}
    </div>
  );
}

function AssistantVisual() {
  return (
    <div className="home-panel home-chat">
      <div className="home-bubble me">Anything free on Thursday after 3?</div>
      <div className="home-bubble">
        <span className="home-avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/allison.png" alt="" />
        </span>
        <div>
          I found 2 free events after 3 PM on Thursday:
          <div className="home-chat-event">
            <BellRing size={14} /> Hack Night · Thornton Hall · 3:30
          </div>
          <div className="home-chat-event">
            <BellRing size={14} /> Open Mic · Rosa Parks Room · 6:00
          </div>
        </div>
      </div>
    </div>
  );
}
