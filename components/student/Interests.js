"use client";
import Link from "next/link";
import { useState } from "react";
import { useStudentData, studentRequest } from "./useStudentData";
import DataState from "./DataState";

function InterestForm({ data }) {
  const [selected, setSelected] = useState(data.category_ids);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    try {
      const result = await studentRequest("/api/users/me/interests", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_ids: selected }),
      });
      setSelected(result.category_ids);
      setMessage("Your interests are saved. Your recommendations are ready.");
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <form className="ga-card student-preferences" onSubmit={save}>
    <fieldset disabled={busy}>
      <legend>What interests you?</legend>
      <p className="ga-muted">Choose as many as you like. You can change or clear your selection anytime.</p>
      <div className="student-interest-grid">
        {data.categories.map((category) => <label key={category.id} className="student-interest">
          <input type="checkbox" checked={selected.includes(category.id)} onChange={(event) => {
            setSelected(event.target.checked ? [...selected, category.id] : selected.filter((id) => id !== category.id));
            setMessage("");
          }} />
          {category.name}
        </label>)}
      </div>
    </fieldset>
    <p className="ga-muted">{selected.length} interests selected</p>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="student-actions">
      <button className="ga-button" disabled={busy}>{busy ? "Saving…" : "Save interests"}</button>
      <Link className="ga-button secondary" href="/events/for-you">View recommendations</Link>
    </div>
  </form>;
}
export default function Interests() {
  const state = useStudentData("/api/users/me/interests");
  return <>
    <div className="ga-heading"><div><h1>Your interests</h1>
      <p className="ga-muted">Find events that feel like you.</p></div></div>
    {state.loading || state.error ? <DataState {...state} /> : <InterestForm data={state.data} />}
  </>;
}
