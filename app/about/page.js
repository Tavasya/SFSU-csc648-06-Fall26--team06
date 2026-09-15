"use client";

import { useEffect, useState } from "react";
import "./about.css";

const TEAM_MEMBERS = [
  {
    image: "/images/member1.jpg",
    name: "Emely Sarceno Bravo",
    role: "Team Lead",
    modalRole: "Team Lead",
    bio: "I am a senior at San Francisco State University pursuing a major in Computer Science with a minor in Marketing. In my free time, I enjoy baking delicious pastries and taking pictures on my digital camera!",
    github: "https://github.com/emelysarcenobravo",
    linkedin: "https://www.linkedin.com/in/emely-sarceno-bravo",
  },
  {
    image: "/images/member2.jpg",
    name: "Team Member 2",
    role: "role",
    modalRole: "Front-End Developer",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    linkedin: "https://discord.com/users/USERID",
  },
  {
    image: "/images/member3.jpg",
    name: "Emerson Berido",
    role: "Scrum Master",
    modalRole: "Scrum Master",
    bio: "I am a 4th year Computer Science student at SFSU. I enjoy developing video games and learning new skills that help me as a developer. I am also an officer of the Game Development Club at SFSU.",
    github: "https://github.com/EmersonBerido",
    linkedin: "https://www.linkedin.com/in/emerson-berido/",
  },
  {
    image: "/images/member4.jpg",
    name: "Kelsey Codilla",
    role: "Backend Developer",
    modalRole: "Backend Developer",
    bio: "I am a 4th year student at SFSU studying computer science. I enjoy playing basketball, game development, and watching movies.",
    github: "https://github.com/Malv-Kelpo",
    linkedin: "https://www.linkedin.com/in/kelsey-codilla/",
  },
  {
    image: "/images/member5.jpg",
    name: "Team Member 5",
    role: "place holder",
    modalRole: "Database Engineer",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    linkedin: "https://discord.com/users/USERID",
  },
  {
    image: "/images/member6.jpg",
    name: "Team Member 6",
    role: "place holder",
    modalRole: "QA & Documentation",
    bio: "Bio description goes here.",
    github: "https://github.com/USERNAME",
    linkedin: "https://discord.com/users/USERID",
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
            <b><span>CSC 648</span></b>
            <b><small>Build • Collaborate • Create</small></b>
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
          <p>
            Get to know the team behind the Career Path App and the work we
            are building together!
          </p>
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
              Our goal is to build a user-friendly career platform that helps
              students explore career opportunities, identify areas for
              growth, and connect their skills and aspirations with
              meaningful career paths.
            </p>
          </div>

          <div className="info-box">
            <div className="info-icon">◇</div>
            <h3>Meeting Schedule</h3>
            <p>
              We meet weekly on Fridays at 7PM via Discord voice channels to
              discuss project progress, coordinate responsibilities, address
              challenges, and plan upcoming tasks.
            </p>
          </div>

          <div className="info-box">
            <div className="info-icon">○</div>
            <h3>Communication</h3>
            <p>
              Our primary communication platform is Discord, with dedicated
              channels for project updates, technical support, study
              resources, and assignment-related information.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <h2>SFSU</h2>
          <div>
            <p>San Francisco State University</p>
            <b><small>Build • Collaborate • Create</small></b>
          </div>
        </div>

        <p className="footer-message">
          Empowering students to build their path forward.
        </p>
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
                href={activeMember?.linkedin ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
