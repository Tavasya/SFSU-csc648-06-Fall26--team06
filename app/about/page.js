"use client";

import { useEffect, useState } from "react";
import "./about.css";

const TEAM_MEMBERS = [
  {
    image: "/images/member1.jpg",
    name: "Team Member 1",
    role: "role",
    modalRole: "Project Manager",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    discord: "https://discord.com/users/USERID",
  },
  {
    image: "/images/member2.jpg",
    name: "Team Member 2",
    role: "role",
    modalRole: "Front-End Developer",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    discord: "https://discord.com/users/USERID",
  },
  {
    image: "/images/member3.jpg",
    name: "Team Member 3",
    role: "role",
    modalRole: "Back-End Developer",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    discord: "https://discord.com/users/USERID",
  },
  {
    image: "/images/member4.jpg",
    name: "Team Member 4",
    role: "placeholder",
    modalRole: "UI / UX Designer",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    discord: "https://discord.com/users/USERID",
  },
  {
    image: "/images/member5.jpg",
    name: "Team Member 5",
    role: "place holder",
    modalRole: "Database Engineer",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    discord: "https://discord.com/users/USERID",
  },
  {
    image: "/images/member6.jpg",
    name: "Team Member 6",
    role: "place holder",
    modalRole: "QA & Documentation",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    discord: "https://discord.com/users/USERID",
  },
];

export default function AboutPage() {
  const [activeMember, setActiveMember] = useState(null);

  const closeModal = () => setActiveMember(null);

  useEffect(() => {
    document.body.classList.toggle("modal-open", activeMember !== null);
  }, [activeMember]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="header">
        <div className="brand">
          <h1>SFSU</h1>
          <div className="brand-text">
            <span>CSC 648</span>
            <small>Build • Collaborate • Create</small>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1>
            ALL ABOUT <span>US</span>
          </h1>
          <div className="title-line"></div>
          <h2>Meet the Team</h2>
          <p>Buzz words. one liner</p>
        </div>
      </section>

      <main className="team-section">
        <div className="team-grid">
          {TEAM_MEMBERS.map((member) => (
            <article className="profile-card" key={member.name}>
              <div className="profile-image-wrapper">
                <img
                  src={member.image}
                  alt={member.name}
                  className="profile-image"
                />
              </div>

              <h3>{member.name}</h3>

              <p className="role">{member.role}</p>

              <button
                className="profile-button"
                onClick={() => setActiveMember(member)}
              >
                View Profile
                <span>→</span>
              </button>
            </article>
          ))}
        </div>

        <section className="team-info">
          <div className="info-box">
            <div className="info-icon">◆</div>
            <h3>Our Goals</h3>
            <p>
              A short description about our team&apos;s goals, what we are
              building, and what we hope to accomplish together.
            </p>
          </div>

          <div className="info-box">
            <div className="info-icon">◇</div>
            <h3>Meeting Schedule</h3>
            <p>
              Our team meeting schedule and other information about when we
              meet will go here.
            </p>
          </div>

          <div className="info-box">
            <div className="info-icon">○</div>
            <h3>Communication</h3>
            <p>
              Information about how our team communicates and collaborates
              will go here.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <h2>SFSU</h2>
          <div>
            <p>San Francisco State University</p>
            <small>buzz words</small>
          </div>
        </div>

        <p className="footer-message">Buzz Words</p>
      </footer>

      <div className={`profile-modal${activeMember ? " active" : ""}`}>
        <div className="modal-overlay" onClick={closeModal}></div>

        <div className="modal-content">
          <button
            className="modal-close"
            aria-label="Close profile"
            onClick={closeModal}
          >
            ×
          </button>

          <div className="modal-header">
            <div className="modal-icon">SFSU</div>
            <div>
              <p className="modal-label">TEAM PROFILE</p>
              <h2>{activeMember?.name ?? "Team Member"}</h2>
            </div>
          </div>

          <div className="modal-divider"></div>

          <div className="modal-info">
            <div className="modal-section">
              <h3>Role:</h3>
              <p>{activeMember?.modalRole ?? "Team Role"}</p>
            </div>

            <div className="modal-section">
              <h3>Bio:</h3>
              <p>{activeMember?.bio ?? "Bio description will go here."}</p>
            </div>

            <div className="modal-links">
              <a
                className="profile-link"
                href={activeMember?.github ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>

              <a
                className="profile-link"
                href={activeMember?.discord ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
