import Link from "next/link";
import { ArrowRight, GraduationCap, HeartHandshake, MessagesSquare } from "lucide-react";
import TeamProfiles from "@/components/about/TeamProfiles";
import "@/components/about/team.css";

export const metadata = {
  title: "Meet the team | GatorAid",
  description: "Meet the six SF State students building GatorAid to help you discover campus events and find your community.",
};

export default function AboutPage() {
  return <div className="team-page">
    <section className="team-hero" aria-labelledby="team-heading">
      <span className="team-eyebrow"><GraduationCap size={16} />Built at SF State</span>
      <h1 id="team-heading">A campus community.<br />A team of six Gators.</h1>
      <p>Meet the students behind GatorAid. We’re building a simpler way to discover campus events, find your people, and make the most of life at SF State.</p>
      <Link href="/about-gatoraid" className="ga-button secondary">Our mission <ArrowRight size={16} /></Link>
    </section>
    <section className="team-members" aria-labelledby="team-members-heading">
      <div className="team-section-heading"><div><p className="team-eyebrow">The people behind the project</p><h2 id="team-members-heading">Meet the team</h2></div>
        <p className="ga-muted">Six perspectives. One shared campus.</p></div>
      <TeamProfiles />
    </section>
    <section className="team-working" aria-label="How we work">
      <article className="ga-card"><HeartHandshake size={24} /><h2>Built for our community</h2><p>We help SFSU students discover events, explore their interests, and connect with the campus community.</p></article>
      <article className="ga-card"><GraduationCap size={24} /><h2>Learning by building</h2><p>Created for CSC 648, GatorAid brings together our work in design, frontend development, backend systems, and AI.</p></article>
      <article className="ga-card"><MessagesSquare size={24} /><h2>Better together</h2><p>We coordinate through Discord, share progress, and work through challenges as a team.</p></article>
    </section>
  </div>;
}
