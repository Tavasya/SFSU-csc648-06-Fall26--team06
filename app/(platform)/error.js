/**
 * Public interfaces supporting R2.6.
 * @module app/platform/error
 */
"use client";
/**
 * Render the platform error boundary with a reset/retry action.
 * @function Error
 * @memberof module:app/platform/error
 * @static
 * @param {Object} props - Component properties.
 * @param {function} props.reset - Retry callback supplied by the error boundary.
 * @returns {React.ReactElement} Rendered component tree.
 */
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
