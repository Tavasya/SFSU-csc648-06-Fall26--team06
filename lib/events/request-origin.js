/**
 * Public interfaces supporting R4.2.
 * @module lib/events/request-origin
 */
// Next.js may normalize request.url to localhost in development. The Host
// header retains the authority actually requested by the browser.
/**
 * Check Origin or Referer against the request URL before accepting a mutation.
 * @function validRequestOrigin
 * @memberof module:lib/events/request-origin
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @returns {boolean} Whether the mutation origin is accepted.
 */
export function validRequestOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    return (
      parsed.origin === origin &&
      parsed.host === host &&
      parsed.protocol === target.protocol
    );
  } catch {
    return false;
  }
}
