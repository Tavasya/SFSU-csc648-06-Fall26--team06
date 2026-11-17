"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

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
    name: "Tavasya Ganpati",
    role: "Github Master",
    modalRole: "Github Master",
    bio: "Hi! I'm a senior at SFSU. I love combat sports like Muy Thai, Brazilian jiu jitsu, and MMA.\n I also try and travel as much as I can! I just came back from Puerto Rico🇵🇷",
    github: "https://github.com/tavasya",
    linkedin: "https://www.linkedin.com/in/tavasyaganpati/",
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
    name: "Phong Nguyen",
    role: "AI Engineer",
    modalRole: "AI Engineer",
    bio: "I am a current 4th year at SFSU studying computer science. I enjoy working on cars and is from San Francisco.",
    github: "https://github.com/gitphongn",
    linkedin: "https://www.linkedin.com/in/phong-nguyen-132868284/",
  },
  {
    image: "/images/member6.jpg",
    name: "David Gomez",
    role: "Front-End Developer",
    modalRole: "Front-End Developer",
    bio: "I am a 4th year Computer Science student at SFSU. I enjoy playing video games, going to the gym, and learning new skills that help me as a developer. Plan to enter Cybersecurity field.",
    github: "https://github.com/Inkdg8",
    linkedin: "https://www.linkedin.com/in/inkdg8",
  },
];

export default function TeamProfiles() {
  const [activeMember, setActiveMember] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (activeMember && !dialogRef.current.open) dialogRef.current.showModal();
  }, [activeMember]);

  return <>
    <div className="team-grid">
      {TEAM_MEMBERS.map((member) => <article className="ga-card team-card" key={member.name}>
        <div className="team-portrait"><Image src={member.image} alt={member.name} width={480} height={480}
          sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" /></div>
        <div className="team-card-details"><p className="team-role">{member.role}</p><h2>{member.name}</h2>
          <button type="button" className="ga-button secondary" onClick={() => setActiveMember(member)}
            aria-label={`View profile for ${member.name}`}>View profile <ArrowUpRight size={16} /></button>
        </div>
      </article>)}
    </div>
    <dialog ref={dialogRef} className="team-dialog" aria-labelledby="team-dialog-name" aria-describedby="team-dialog-bio"
      onClose={() => setActiveMember(null)} onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current.close();
      }}>
      {activeMember && <div className="team-dialog-content">
        <button type="button" className="team-dialog-close" aria-label="Close profile" onClick={() => dialogRef.current.close()}><X size={20} /></button>
        <Image className="team-dialog-photo" src={activeMember.image} alt="" width={100} height={100} />
        <p className="team-role">{activeMember.role}</p><h2 id="team-dialog-name">{activeMember.name}</h2>
        <p id="team-dialog-bio">{activeMember.bio}</p>
        <div className="team-social-links">
          <a className="ga-button secondary" href={activeMember.github} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17} />GitHub<span className="sr-only"> (opens in a new tab)</span></a>
          <a className="ga-button secondary" href={activeMember.linkedin} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17} />LinkedIn<span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </div>}
    </dialog>
  </>;
}
