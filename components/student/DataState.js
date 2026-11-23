/**
 * Public interfaces supporting R2.6.
 * @module components/student/DataState
 */
import Link from "next/link";
/**
 * Render a loading indicator or a retryable error; render nothing when neither applies.
 * @function DataState
 * @memberof module:components/student/DataState
 * @static
 * @param {Object} props - Component properties.
 * @param {*} props.loading - The loading setting or callback.
 * @param {*} props.error - The error setting or callback.
 * @param {*} props.retry - The retry setting or callback.
 * @returns {?React.ReactElement} Rendered component tree.
 */
export default function DataState({ loading, error, retry }) {
  if (loading) return <p role="status">Loading your student account…</p>;
  if (error?.status === 401) return (
    <section className="ga-card ga-empty">
      <h2>Make campus life your own</h2>
      <p>Sign in to save interests, discover recommendations, and manage saved events and RSVPs.</p>
      <Link className="ga-button" href="/login">Sign in or create an account</Link>
    </section>
  );
  return <div className="ga-card ga-empty"><p role="alert">{error?.message}</p>
    <button className="ga-button secondary" onClick={retry}>Try again</button></div>;
}
