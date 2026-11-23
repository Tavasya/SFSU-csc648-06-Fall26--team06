/**
 * Public interfaces supporting R2.6.
 * @module app/platform/loading
 */
/**
 * Render the platform loading placeholder while a route is being prepared.
 * @function Loading
 * @memberof module:app/platform/loading
 * @static
 * @returns {React.ReactElement} Rendered component tree.
 */
export default function Loading() {
  return (
    <div className="ga-card ga-empty" role="status">
      Loading your campus events…
    </div>
  );
}
