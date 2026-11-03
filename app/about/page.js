"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import "./about.css";

const TEAM_MEMBERS = [
  {
    image: "/images/member1.jpg",
    name: "Emely Sarceno Bravo",
    role: "Team Lead",
    bio: "I am a senior at San Francisco State University pursuing a major in Computer Science with a minor in Marketing. In my free time, I enjoy baking delicious pastries and taking pictures on my digital camera!",
    github: "https://github.com/emelysarcenobravo",
    linkedin: "https://www.linkedin.com/in/emely-sarceno-bravo",
  },
  {
    image: "/images/member2.jpg",
    name: "Tavasya Ganpati",
    role: "GitHub Master",
    bio: "Hi! I'm a senior at SFSU. I love combat sports like Muay Thai, Brazilian jiu jitsu, and MMA. I also try and travel as much as I can!",
    github: "https://github.com/tavasya",
    linkedin: "https://www.linkedin.com/in/tavasyaganpati/",
  },
  {
    image: "/images/member3.jpg",
    name: "Emerson Berido",
    role: "Scrum Master",
    bio: "I am a 4th year Computer Science student at SFSU. I enjoy developing video games and learning new skills that help me as a developer. I am also an officer of the Game Development Club at SFSU.",
    github: "https://github.com/EmersonBerido",
    linkedin: "https://www.linkedin.com/in/emerson-berido/",
  },
  {
    image: "/images/member4.jpg",
    name: "Kelsey Codilla",
    role: "Backend Developer",
    bio: "I am a 4th year student at SFSU studying computer science. I enjoy playing basketball, game development, and watching movies.",
    github: "https://github.com/Malv-Kelpo",
    linkedin: "https://www.linkedin.com/in/kelsey-codilla/",
  },
  {
    image: "/images/member5.jpg",
    name: "Phong Nguyen",
    role: "AI Engineer",
    bio: "I am a current 4th year at SFSU studying computer science. I enjoy working on cars and am from San Francisco.",
    github: "https://github.com/gitphongn",
    linkedin: "https://www.linkedin.com/in/phong-nguyen-132868284/",
  },
  {
    image: "/images/member6.jpg",
    name: "David Gomez",
    role: "Front-End Developer",
    bio: "I am a 4th year Computer Science student at SFSU. I enjoy playing video games, going to the gym, and learning new skills as I prepare to enter the cybersecurity field.",
    github: "https://github.com/Inkdg8",
    linkedin: "https://www.linkedin.com/in/inkdg8",
  },
];

export default function AboutPage() {
  const [activeMember, setActiveMember] = useState(null);

  useEffect(() => {
    if (!activeMember) return;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event) {
      if (event.key === "Escape") setActiveMember(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMember]);

  return (
    <div className="about-page">
      <div className="ga-heading">
        <div>
          <p className="about-eyebrow">About GatorAid</p>
          <h1>Meet the team</h1>
          <p className="ga-muted">
            Get to know the team building a better way to discover campus life at SFSU.
          </p>
        </div>
      </div>

      <section className="about-intro ga-card">
        <span className="about-mark" aria-hidden="true">G</span>
        <div>
          <h2>Campus life, connected.</h2>
          <p className="ga-muted">
            GatorAid helps students find campus events, discover new opportunities,
            and make the most of their time at San Francisco State University.
          </p>
        </div>
      </section>

      <section className="about-team" aria-labelledby="team-heading">
        <div className="about-section-heading">
          <div>
            <h2 id="team-heading">The people behind the project</h2>
            <p className="ga-muted">A collaborative team of SFSU computer science students.</p>
          </div>
        </div>
        <div className="about-team-grid">
          {TEAM_MEMBERS.map((member) => (
            <article className="about-member ga-card" key={member.name}>
              <Image src={member.image} alt="" width={480} height={360} className="about-member-image" />
              <h3>{member.name}</h3>
              <p className="ga-muted">{member.role}</p>
              <button
                type="button"
                className="ga-button secondary"
                onClick={() => setActiveMember(member)}
              >
                View profile
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="about-values" aria-label="How we work">
        <article className="ga-card">
          <h3>Our goal</h3>
          <p className="ga-muted">
            Help SFSU students discover events that match their interests and connect
            with their campus community.
          </p>
        </article>
        <article className="ga-card">
          <h3>How we collaborate</h3>
          <p className="ga-muted">
            We coordinate weekly, share progress, and work together to make campus
            events easier to find and attend.
          </p>
        </article>
        <article className="ga-card">
          <h3>Built at SFSU</h3>
          <p className="ga-muted">
            GatorAid is a student-built project created for the SFSU community.
          </p>
        </article>
      </section>

      {activeMember && (
        <div
          className="about-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveMember(null);
          }}
        >
          <section
            className="about-modal ga-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-modal-title"
          >
            <button
              type="button"
              className="about-modal-close"
              aria-label="Close profile"
              onClick={() => setActiveMember(null)}
            >
              ×
            </button>
            <p className="about-eyebrow">GatorAid team</p>
            <h2 id="about-modal-title">{activeMember.name}</h2>
            <p className="ga-badge">{activeMember.role}</p>
            <p className="about-modal-bio">{activeMember.bio}</p>
            <div className="about-modal-links">
              <a className="ga-button secondary" href={activeMember.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a className="ga-button secondary" href={activeMember.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
