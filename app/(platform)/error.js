"use client";
export default function Error({ reset }) {
  return (
    <section className="ga-card ga-empty">
      <h1>We couldn’t load this page</h1>
      <p>Please try again in a moment.</p>
      <button className="ga-button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
