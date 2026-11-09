/*
 * lib/events/accessibility.js
 *
 * PURPOSE:
 * What an event offers for accessibility, as one line of text, so the event
 * page, the map and the filters all describe it the same way.
 */

// The accessibility features an event lists, e.g. ["Wheelchair accessible", "ASL interpretation"].
export function accessibilityFeatures({ wheelchair, asl }) {
  return [wheelchair && "Wheelchair accessible", asl && "ASL interpretation"].filter(Boolean);
}

// "Wheelchair accessible · ASL interpretation", or a plain note when none are listed.
export function accessibilityText(flags) {
  const features = accessibilityFeatures(flags);
  return features.length ? features.join(" · ") : "No accessibility features listed";
}
