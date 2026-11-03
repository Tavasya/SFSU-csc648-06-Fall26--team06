/*
 * lib/rooms/splat-view.js
 *
 * PURPOSE:
 * Picks where the camera starts in the splat viewer (components/rooms/SplatCanvas.js).
 * Scans aren't lined up with the x/z axes (a hallway can run diagonally), so
 * this finds the scan's longest horizontal direction from a sample of splat
 * centers and starts at one end of it, looking toward the middle, like
 * standing at the door of a room. Y is up.
 * No imports, so it can be tested on its own.
 */

// points: [[x, y, z], ...] (a sample of splat centers is enough)
// Returns { position: [x, y, z], target: [x, y, z], length } or null without points.
//  - length: about how long the scan is, for the camera's near/far range
export function startView(points) {
  const n = points.length;
  if (!n) return null;

  let mx = 0, my = 0, mz = 0;
  for (const [x, y, z] of points) { mx += x; my += y; mz += z; }
  mx /= n; my /= n; mz /= n;

  // Covariance of the horizontal (x, z) spread.
  let xx = 0, xz = 0, zz = 0;
  for (const [x, , z] of points) {
    const dx = x - mx, dz = z - mz;
    xx += dx * dx; xz += dx * dz; zz += dz * dz;
  }
  xx /= n; xz /= n; zz /= n;

  // Its main direction (largest eigenvector) is the scan's long side.
  const angle = 0.5 * Math.atan2(2 * xz, xx - zz);
  const dir = [Math.cos(angle), Math.sin(angle)];
  const spread = Math.sqrt(Math.max(
    (xx + zz) / 2 + Math.sqrt(((xx - zz) / 2) ** 2 + xz ** 2),
    1e-12,
  ));

  // About 2 spreads from the middle is near the end of the scan, but still inside.
  return {
    position: [mx - dir[0] * 1.6 * spread, my, mz - dir[1] * 1.6 * spread],
    target: [mx + dir[0] * spread, my, mz + dir[1] * spread],
    length: 4 * spread,
  };
}
