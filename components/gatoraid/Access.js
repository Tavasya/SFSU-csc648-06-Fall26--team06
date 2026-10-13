import Link from "next/link";
import { LockKeyhole } from "lucide-react";
export default function Access() {
  return (
    <section className="ga-access ga-card">
      <LockKeyhole size={32} />
      <h2>Your next campus event starts here</h2>
      <p>
        Sign in or create an account to save drafts, preview events, and publish
        them to the SFSU community. Anyone can host an event.
      </p>
      <Link className="ga-button" href="/login">
        Sign in to get started
      </Link>
    </section>
  );
}
