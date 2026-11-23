/**
 * Public helper contracts for student/empty-state.
 * @module lib/student/empty-state
 */
/*
 * lib/student/empty-state.js
 *
 * PURPOSE:
 * What "Recommended for You" and "Saved events" show when the list is empty
 * (R5.6 Recommendation Fallback, R2.6). Used by
 * components/student/StudentEvents.js; tested in tests/student-empty-state.test.mjs.
 */

export const EXPLORE_LINK = Object.freeze({ href: "/events", label: "Explore all events" });
export const INTERESTS_LINK = Object.freeze({ href: "/interests", label: "Choose interests" });

// { title, text, links } for an empty list.
//  - saved: the Saved events page (otherwise Recommended for You)
//  - hasInterests: the student has picked at least one interest
/**
 * Choose empty-state copy and links for saved or recommended events.
 * @function studentEmptyState
 * @memberof module:lib/student/empty-state
 * @static
 * @param {Object} options - Saved page flag and whether interests are configured.
 * @returns {Object} Title, explanatory text and action links.
 */
export function studentEmptyState({ saved = false, hasInterests = false } = {}) {
  if (saved) {
    return {
      title: "No saved events yet",
      text: "Open an event and choose Save event to add it here.",
      links: [EXPLORE_LINK],
    };
  }
  return {
    title: hasInterests ? "No matching recommendations yet" : "Start with your interests",
    text: "Choose or update your interests, or explore all campus events while you wait for a match.",
    links: [INTERESTS_LINK, EXPLORE_LINK],
  };
}
