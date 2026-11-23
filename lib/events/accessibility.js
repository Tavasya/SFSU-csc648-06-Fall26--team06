/**
 * Public interfaces supporting R2.2.
 * @module lib/events/accessibility
 */
/*
 * lib/events/accessibility.js
 *
 * PURPOSE:
 * What an event offers for accessibility, as one line of text, so the event
 * page, the map and the filters all describe it the same way.
 */

// The accessibility features an event lists, e.g. ["Wheelchair accessible", "ASL interpretation"].
/**
 * Build the list of supported accessibility features from event flags.
 * @function accessibilityFeatures
 * @memberof module:lib/events/accessibility
 * @static
 * @param {Object} options - Grouped function options.
 * @param {boolean} options.wheelchair - Whether the event offers wheelchair access.
 * @param {boolean} options.asl - Whether the event offers ASL interpretation.
 * @returns {Array<string>} Display labels for enabled wheelchair and ASL features.
 */
export function accessibilityFeatures({ wheelchair, asl }) {
  return [wheelchair && "Wheelchair accessible", asl && "ASL interpretation"].filter(Boolean);
}

// "Wheelchair accessible · ASL interpretation", or a plain note when none are listed.
/**
 * Format the supported accessibility flags for display.
 * @function accessibilityText
 * @memberof module:lib/events/accessibility
 * @static
 * @param {Object} flags - Wheelchair and ASL accessibility flags.
 * @returns {string} Joined feature labels or a message that no features are listed.
 */
export function accessibilityText(flags) {
  const features = accessibilityFeatures(flags);
  return features.length ? features.join(" · ") : "No accessibility features listed";
}
