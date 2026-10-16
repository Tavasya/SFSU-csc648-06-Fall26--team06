// Next.js may normalize request.url to localhost in development. The Host
// header retains the authority actually requested by the browser.
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
