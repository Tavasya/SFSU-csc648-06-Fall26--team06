"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  CalendarRange,
  Plus,
  Home,
  GraduationCap,
  LogOut,
  MapPin,
  Map as MapIcon,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export default function Shell({ children }) {
  const router = useRouter(),
    path = usePathname(),
    [user, setUser] = useState(null);
  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) =>
      setUser(session?.user || null),
    );
    return () => subscription.unsubscribe();
  }, []);
  return (
    <div className="ga">
      <aside className="ga-sidebar">
        <Link href="/host/events" className="ga-brand">
          <span>G</span>GatorAid
        </Link>
        <div className="ga-nav-label">Campus life, connected</div>
        <nav>
          <Link
            className={path.startsWith("/events") && path !== "/events/for-you" ? "active" : ""}
            href="/events"
          >
            <Home size={18} />
            Explore events
          </Link>
          <Link className={path === "/events/for-you" ? "active" : ""} href="/events/for-you">
            <GraduationCap size={18} /> For you
          </Link>
          <Link className={path === "/saved" ? "active" : ""} href="/saved">
            <Bookmark size={18} /> Saved events
          </Link>
          <Link className={path === "/calendar" ? "active" : ""} href="/calendar">
            <CalendarRange size={18} /> Calendar
          </Link>
          <Link className={path === "/profile" ? "active" : ""} href="/profile">
            <UserRound size={18} /> Your profile
          </Link>
          <Link
            className={path.startsWith("/map") ? "active" : ""}
            href="/map"
          >
            <MapIcon size={18} />
            Campus map
          </Link>
          <Link className={path === "/about" ? "active" : ""} href="/about">
            <GraduationCap size={18} />
            Meet the team
          </Link>
          <div className="ga-nav-label">Your events</div>
          <Link
            className={path === "/host/events" ? "active" : ""}
            href="/host/events"
          >
            <CalendarDays size={18} />
            My Events
          </Link>
          <Link
            className={path.includes("/new") ? "active" : ""}
            href="/host/events/new"
          >
            <Plus size={18} />
            Create event
          </Link>
        </nav>
        <div className="ga-sidebar-bottom">
          <div className="ga-campus">
            <MapPin size={18} />
            <div>
              <strong>San Francisco State</strong>
              <small>Your campus. Your community.</small>
            </div>
          </div>
          {user ? (
            <>
              <div className="ga-account">
                <span>{user.email?.[0]?.toUpperCase()}</span>
                <small>{user.email}</small>
              </div>
              <button
                className="ga-text-button"
                onClick={async () => {
                  await createClient().auth.signOut();
                  router.push("/login");
                  router.refresh();
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <Link className="ga-button secondary" href="/login">
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <div className="ga-main">
        <main className="ga-content">{children}</main>
      </div>
    </div>
  );
}
