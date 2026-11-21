"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EventConnections({ eventId }) {
  const [attendees, setAttendees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const db = createClient();
    async function load() {
      const { data: auth } = await db.auth.getUser();
      if (!active) return;
      if (!auth.user) { setError("Sign in to connect with attendees."); setLoading(false); return; }
      setUserId(auth.user.id);
      const result = await db.rpc("event_attendees", { p_event: eventId });
      if (!active) return;
      if (result.error) setError("Could not load attendees. Please try again.");
      else setAttendees(result.data.filter((attendee) => attendee.user_id !== auth.user.id));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [eventId]);

  const refresh = useCallback(async () => {
    if (!selected) return;
    const { data, error: requestError } = await createClient().rpc("event_conversation", { p_event: eventId, p_other: selected.user_id });
    if (requestError) setError("Could not load this conversation.");
    else { setMessages(data); setError(""); }
  }, [eventId, selected]);
  useEffect(() => {
    if (!selected) return;
    // Polling keeps the thread up to date without a separate realtime subscription.
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 5000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh, selected]);
  async function send(event) {
    event.preventDefault(); setBusy(true); setError("");
    const { error: requestError } = await createClient().rpc("send_event_message", { p_event: eventId, p_other: selected.user_id, p_body: body });
    setBusy(false);
    if (requestError) return setError("Could not send your message. Check that you and the other attendee are still participating.");
    setBody(""); await refresh();
  }
  return <div className="ga-card event-connections">
    <h2>Connect with attendees</h2>
    <p className="ga-muted">Attending and opted-in students can meet before this event. Enable connections in <Link href="/profile">your profile</Link>.</p>
    {loading ? <p role="status">Loading attendees…</p> : attendees.length ? <div className="connection-layout">
      <div><h3>Attendees</h3><ul className="connection-list">{attendees.map((person) => <li key={person.user_id}>
        <button type="button" className="connection-person" aria-pressed={selected?.user_id === person.user_id}
          title={`${person.display_name}${person.major ? ` · ${person.major}` : ""}${person.interests?.length ? ` · ${person.interests.join(", ")}` : ""}`}
          onClick={() => { setMessages([]); setSelected(person); }}>
          <span className="connection-avatar" aria-hidden="true" style={{ "--skin": person.avatar_skin_color, "--hair": person.avatar_hair_color, "--shirt": person.avatar_shirt_color }}><span /></span>
          <span>{person.display_name}<small>{person.major || "Attendee"}</small></span></button></li>)}</ul></div>
      <div>{selected ? <><h3>{selected.display_name}</h3><p className="ga-muted">{[selected.academic_year, selected.major].filter(Boolean).join(" · ")}</p>
        <p>Interests: {selected.interests?.join(", ") || "None shared"}</p>
        <div className="connection-thread" aria-label={`Conversation with ${selected.display_name}`} aria-live="polite">
          {messages.length ? messages.map((message) => <p key={message.id}><strong>{message.sender_id === userId ? "You" : selected.display_name}:</strong> {message.body}</p>) : <p className="ga-muted">Start a conversation about the event.</p>}
        </div>
        <form onSubmit={send}><label>Message<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} required /></label>
          <button className="ga-button" disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send message"}</button></form></> : <p>Select an attendee to start a conversation.</p>}</div>
    </div> : <p>No other attendees are available yet. Confirm your RSVP and enable connections in your profile to join.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
