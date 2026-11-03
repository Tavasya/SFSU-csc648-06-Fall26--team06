/*
 * components/assistant/AssistantChat.js
 *
 * PURPOSE:
 * The AI Event Assistant page (/assistant): a chat with Allison, the GatorAid
 * gator. Answers come from POST /api/assistant and show as event cards like
 * Explore events (two per row), with Save / Interested / Going and a 3D venue
 * preview that opens in the cell next to its card (one preview open at a time).
 *
 * The conversation is kept in this browser (localStorage, one per signed-in
 * student) until the student clicks "Clear chat", so it is still there after
 * opening an event, reloading, or coming back later.
 *
 * Save and RSVP state for every card is loaded once from
 * GET /api/users/me/saved-events and GET /api/users/me/rsvps (instead of two
 * requests per card), then updated as the student taps the card buttons.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Box, CalendarDays, DollarSign, LayoutGrid, Map as MapIcon,
  Search, Sparkles, Sunset, Trash2,
} from "lucide-react";
import AssistantEventCard, { VenuePreview } from "@/components/assistant/AssistantEventCard";
import { gridItems } from "@/lib/assistant/grid";
import { studentRequest } from "@/components/student/useStudentData";
import { createClient } from "@/lib/supabase/client";
import "@/components/assistant/assistant.css";

const NAME = "Allison";
const STORAGE_PREFIX = "gatoraid-allison-chat:";
const MAX_SAVED_MESSAGES = 40;

// General starting points: dates, time of day, categories, cost, a building and
// summaries. Creative Arts has the Art Gallery 3D scan, so its events show a 3D preview.
const SUGGESTIONS = [
  { icon: CalendarDays, text: "What's happening on campus today?", hint: "Today" },
  { icon: Sunset, text: "Evening events tomorrow", hint: "Time of day" },
  { icon: DollarSign, text: "Free events this week", hint: "Cost" },
  { icon: LayoutGrid, text: "Career events next week", hint: "Category" },
  { icon: Box, text: "What events are happening at the Creative Arts building?", hint: "Building · 3D art gallery preview" },
  { icon: Sparkles, text: "Summarize this week's arts events", hint: "Summary" },
];

function Avatar({ size = 34 }) {
  return <Image className="ga-assistant-avatar" src="/images/allison.png" alt="" width={size} height={size} />;
}

function readChat(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// { [eventId]: { saved, rsvp } } from the student's saved events and RSVPs.
async function loadStatuses() {
  const [saved, rsvps] = await Promise.all([
    studentRequest("/api/users/me/saved-events"),
    studentRequest("/api/users/me/rsvps"),
  ]);
  const statuses = {};
  for (const event of saved.events ?? []) statuses[event.id] = { saved: true, rsvp: null };
  for (const row of rsvps.rsvps ?? []) {
    const id = row.events?.id;
    if (!id) continue;
    statuses[id] = { saved: statuses[id]?.saved ?? false, rsvp: row.status === "not_attending" ? null : row.status };
  }
  return statuses;
}

export default function AssistantChat() {
  const [storageKey, setStorageKey] = useState(null);
  const [chat, setChat] = useState([]); // [{ role: "user" | "assistant", text, events, categories, total }]
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState(null); // null until loaded
  const [preview, setPreview] = useState(null); // "<message index>:<event id>"
  const bottom = useRef(null);

  // Restore this student's conversation (localStorage only exists in the browser).
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const key = STORAGE_PREFIX + data.user.id;
      setStorageKey(key);
      setChat(readChat(key));
    });
    loadStatuses().then(setStatuses, () => setStatuses({}));
  }, []);

  // Save the conversation and scroll to the newest message.
  useEffect(() => {
    if (!storageKey) return;
    try {
      if (chat.length) localStorage.setItem(storageKey, JSON.stringify(chat.slice(-MAX_SAVED_MESSAGES)));
      else localStorage.removeItem(storageKey);
    } catch {
      // Storage can be full or blocked; the chat still works, it just won't be kept.
    }
  }, [chat, storageKey]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, loading]);

  const updateStatus = useCallback((eventId, changes) => {
    setStatuses((current) => ({
      ...current,
      [eventId]: { saved: false, rsvp: null, ...current?.[eventId], ...changes },
    }));
  }, []);

  async function ask(question) {
    const text = question.trim();
    if (!text || loading) return;
    setChat((c) => [...c, { role: "user", text }]);
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json();
      setChat((c) => [...c, response.ok
        ? { role: "assistant", text: data.reply, events: data.events ?? [], categories: data.categories ?? [], total: data.total ?? 0 }
        : { role: "assistant", text: data.error || "Something went wrong. Please try again." }]);
    } catch {
      setChat((c) => [...c, { role: "assistant", text: "I couldn't reach the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setChat([]);
    setPreview(null);
  }

  return (
    <div className="ga-assistant">
      <div className="ga-assistant-main">
        <header className="ga-assistant-header">
          <Avatar size={68} />
          <div>
            <h1>{NAME} <span className="ga-assistant-beta">AI Event Assistant · Beta</span></h1>
            <p className="ga-muted">Your guide to campus events. Answers come only from published GatorAid events.</p>
          </div>
          {chat.length > 0 && (
            <button type="button" className="ga-button secondary ga-assistant-clear" onClick={clearChat}>
              <Trash2 size={14} /> Clear chat
            </button>
          )}
        </header>

        {storageKey && chat.length === 0 && (
          <section className="ga-card ga-assistant-welcome">
            <h2>Hi, I&apos;m {NAME}!</h2>
            <p className="ga-muted">
              Ask in plain language: by day, time of day, category, cost or building. I can also
              summarize what&apos;s coming up and compare two events.
            </p>
            <div className="ga-assistant-suggestions">
              {SUGGESTIONS.map(({ icon: Icon, text, hint }) => (
                <button type="button" key={text} onClick={() => ask(text)}>
                  <span className="ga-assistant-suggestion-icon"><Icon size={18} /></span>
                  <span>
                    <strong>{text}</strong>
                    <small>{hint}</small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="ga-assistant-thread" aria-live="polite">
          {chat.map((m, i) => m.role === "user" ? (
            <p key={i} className="ga-assistant-user">{m.text}</p>
          ) : (
            <div key={i} className="ga-assistant-reply">
              <div className="ga-assistant-bubble-row">
                <Avatar />
                <div className="ga-assistant-bubble">
                  <small>{NAME}</small>
                  <p>{m.text}</p>
                </div>
              </div>
              {m.events?.length > 0 && (
                <div className="ga-public-grid ga-assistant-grid">
                  {gridItems(m.events, preview?.startsWith(`${i}:`) ? preview.slice(`${i}:`.length) : null).map(({ type, event }) => {
                    const key = `${i}:${event.id}`;
                    if (type === "preview") {
                      return <VenuePreview key={`preview-${event.id}`} event={event} onClose={() => setPreview(null)} />;
                    }
                    return (
                      <AssistantEventCard
                        key={event.id}
                        event={event}
                        categories={m.categories}
                        status={statuses ? statuses[event.id] ?? { saved: false, rsvp: null } : undefined}
                        onStatus={updateStatus}
                        previewOpen={preview === key}
                        onPreview={() => setPreview(preview === key ? null : key)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="ga-assistant-bubble-row" role="status">
              <Avatar />
              <div className="ga-assistant-bubble ga-muted">
                <small>{NAME}</small>
                <p className="ga-assistant-thinking">Looking through campus events<span>.</span><span>.</span><span>.</span></p>
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>

        <form className="ga-assistant-input" onSubmit={(e) => { e.preventDefault(); ask(message); }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder='Ask Allison, e.g. "free tech events this week"'
            maxLength={500}
            aria-label={`Ask ${NAME} about campus events`}
          />
          <button className="ga-assistant-send" disabled={loading || !message.trim()} aria-label="Send">
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      <aside className="ga-assistant-aside">
        <section className="ga-card">
          <h2>How {NAME} answers</h2>
          <p className="ga-muted">
            She searches published GatorAid events by date, time, category, cost, building and
            description, so she only suggests events that really exist. Summaries are written by AI
            from the event details. Always check Event Details before you go.
          </p>
        </section>
        <section className="ga-card">
          <h2>Try asking about</h2>
          <ul className="ga-assistant-tips">
            <li><strong>Dates:</strong> today, tomorrow, Friday, Nov 12, next week</li>
            <li><strong>Time:</strong> morning, lunchtime, afternoon, tonight</li>
            <li><strong>Categories:</strong> academic, arts, career, health &amp; wellness, social, sports, technology</li>
            <li><strong>Details:</strong> free, paid, drop-in, wheelchair accessible, ASL</li>
            <li><strong>Places:</strong> Student Center, Creative Arts, Science, Library</li>
          </ul>
        </section>
        <section className="ga-card">
          <h2>Prefer to browse?</h2>
          <div className="ga-chip-group">
            <Link className="ga-chip" href="/events"><Search size={13} /> Explore events</Link>
            <Link className="ga-chip" href="/map"><MapIcon size={13} /> Campus map</Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
