"use client";
/*
 * components/gatoraid/SiteHeader.js
 *
 * PURPOSE:
 * The one top navigation bar for all of GatorAid: the homepage (app/page.js)
 * and every app page (components/gatoraid/Shell.js). Using the same bar
 * everywhere keeps the site feeling like one product.
 *
 * On small screens the links collapse into a menu button.
 */

import Link from "next/link";
import Logo from "./Logo";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "./site.css";

// Main links, shown in the bar on wide screens.
const MAIN = [
  { href: "/events", label: "Explore", match: (p) => p === "/events" || /^\/events\/(?!for-you)/.test(p) },
  { href: "/events/for-you", label: "For you" },
  { href: "/map", label: "Campus map", match: (p) => p.startsWith("/map") || p.startsWith("/rooms") },
  { href: "/calendar", label: "Your calendar" },
  { href: "/assistant", label: "Ask Allison" },
];

// Personal links, shown in the account menu.
const ACCOUNT = [
  { href: "/saved", label: "Your plans" },
  { href: "/interests", label: "Your interests" },
  { href: "/schedule", label: "Upload schedule" },
];

const isActive = (link, path) => (link.match ? link.match(path) : path === link.href);

// Switches light/dark and remembers the choice (read by the script in app/layout.js).
// Both icons render and CSS shows the right one, so server and browser HTML match.
function ThemeToggle() {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("gatoraid-theme", next);
    } catch {
      /* Private browsing: the choice lasts until the page reloads. */
    }
  };
  return (
    <button type="button" className="site-theme" onClick={toggle} title="Switch light or dark mode">
      <Moon size={18} className="site-theme-moon" />
      <Sun size={18} className="site-theme-sun" />
      <span className="sr-only">Switch light or dark mode</span>
    </button>
  );
}

export default function SiteHeader() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menu, setMenu] = useState(null); // "account" | "mobile" | null
  const accountRef = useRef(null);

  useEffect(() => {
    const db = createClient();
    db.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  // Close menus when the page changes.
  const [menuPath, setMenuPath] = useState(path);
  if (menuPath !== path) {
    setMenuPath(path);
    setMenu(null);
  }

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onClick = (e) => {
      if (menu === "account" && !accountRef.current?.contains(e.target)) setMenu(null);
    };
    const onKey = (e) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const signOut = async () => {
    await createClient().auth.signOut();
    setMenu(null);
    router.push("/login");
    router.refresh();
  };

  const organizer = path.startsWith("/host");

  return (
    <header className="site-header">
      <div className="site-wrap site-header-inner">
        <Link href="/" className="site-brand">
          <Logo />
          GatorAid
        </Link>

        <nav className="site-nav" aria-label="Main">
          {MAIN.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link, path) ? "active" : ""}
              aria-current={isActive(link, path) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions">
          <Link
            href="/host/events"
            className={`site-organizer${organizer ? " active" : ""}`}
          >
            For organizers
          </Link>

          <ThemeToggle />

          {user ? (
            <div className="site-account" ref={accountRef}>
              <button
                type="button"
                className="site-avatar-button"
                aria-expanded={menu === "account"}
                aria-haspopup="menu"
                onClick={() => setMenu(menu === "account" ? null : "account")}
              >
                <span className="site-avatar">{user.email?.[0]?.toUpperCase()}</span>
                <ChevronDown size={14} />
                <span className="sr-only">Account menu</span>
              </button>
              {menu === "account" && (
                <div className="site-menu" role="menu">
                  <small>{user.email}</small>
                  {ACCOUNT.map((link) => (
                    <Link key={link.href} href={link.href} role="menuitem">
                      {link.label}
                    </Link>
                  ))}
                  <button type="button" role="menuitem" onClick={signOut}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="site-button" href="/login">
              Sign in
            </Link>
          )}

          <button
            type="button"
            className="site-menu-button"
            aria-expanded={menu === "mobile"}
            aria-controls="site-mobile-menu"
            onClick={() => setMenu(menu === "mobile" ? null : "mobile")}
          >
            {menu === "mobile" ? <X size={20} /> : <Menu size={20} />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>

      {menu === "mobile" && (
        <nav className="site-mobile" id="site-mobile-menu" aria-label="Menu">
          <div className="site-wrap">
            {[...MAIN, ...ACCOUNT, { href: "/host/events", label: "For organizers", match: (p) => p.startsWith("/host") }].map(
              (link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive(link, path) ? "active" : ""}
                >
                  {link.label}
                </Link>
              ),
            )}
            {user && (
              <button type="button" onClick={signOut}>
                <LogOut size={15} /> Sign out
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
