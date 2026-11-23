/*
 * components/about/FaqBrowser.js
 *
 * PURPOSE:
 * The question list on /faq (app/(platform)/faq/page.js): a search box, a
 * topic list on the side, and the answers as <details> accordions. Searching
 * matches questions and answers; picking a topic shows only that topic.
 */

"use client";

import { useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronDown,
  Map as MapIcon,
  Megaphone,
  Bookmark,
  Rocket,
  Search,
  X,
} from "lucide-react";

// Topic icons, by the `icon` name in each section.
const ICONS = { start: Rocket, saves: Bookmark, calendar: CalendarRange, map: MapIcon, hosting: Megaphone };

export default function FaqBrowser({ sections }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    return sections
      .filter((section) => topic === "all" || section.title === topic)
      .map((section) => ({
        ...section,
        questions: section.questions.filter(
          ([q, a]) => !words || `${q} ${a}`.toLowerCase().includes(words),
        ),
      }))
      .filter((section) => section.questions.length > 0);
  }, [sections, query, topic]);

  const total = sections.reduce((n, s) => n + s.questions.length, 0);

  return (
    <div className="ga-faq">
      <label className="ga-faq-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search questions</span>
        <input
          type="search"
          placeholder="Search questions, like “RSVP” or “3D”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </label>

      <div className="ga-faq-layout">
        <nav className="ga-faq-topics" aria-label="FAQ topics">
          <button
            type="button"
            className={topic === "all" ? "active" : ""}
            aria-pressed={topic === "all"}
            onClick={() => setTopic("all")}
          >
            <span>All topics</span>
            <small>{total}</small>
          </button>
          {sections.map((section) => {
            const Icon = ICONS[section.icon] ?? Rocket;
            return (
              <button
                type="button"
                key={section.title}
                className={topic === section.title ? "active" : ""}
                aria-pressed={topic === section.title}
                onClick={() => setTopic(section.title)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{section.title}</span>
                <small>{section.questions.length}</small>
              </button>
            );
          })}
        </nav>

        <div className="ga-faq-results" aria-live="polite">
          {shown.length === 0 && (
            <div className="ga-faq-empty">
              <p>No questions match “{query}”.</p>
              <button
                type="button"
                className="ga-button secondary"
                onClick={() => {
                  setQuery("");
                  setTopic("all");
                }}
              >
                Show all questions
              </button>
            </div>
          )}
          {shown.map((section) => {
            const Icon = ICONS[section.icon] ?? Rocket;
            return (
              <section key={section.title} className="ga-faq-group">
                <h2>
                  <span className="ga-about-icon">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  {section.title}
                </h2>
                <div className="ga-faq-list">
                  {section.questions.map(([question, answer]) => (
                    <details className="ga-faq-item" key={question} open={Boolean(query.trim())}>
                      <summary>
                        {question}
                        <ChevronDown size={18} aria-hidden="true" />
                      </summary>
                      <p>{answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
