/*
 * lib/assistant/personalize.js
 *
 * PURPOSE:
 * Interest-aware answers for Allison (R8.5): put events that match a signed-in
 * student's interests first and say why. Students without interests get the
 * same answers as before. No imports, so it can be tested on its own
 * (tests/assistant-personalize.test.mjs).
 *
 * STATUS: the unit is ready; POST /api/assistant doesn't call it yet.
 */

// How many of the student's interests an event shares.
export function interestMatches(event, interestIds) {
  const wanted = new Set(interestIds ?? []);
  return (event.category_ids ?? []).filter((id) => wanted.has(id));
}

// Events with the most shared interests first; ties keep their original order
// (usually soonest first). Without interests the list is returned unchanged.
export function rankByInterests(events, interestIds) {
  if (!interestIds?.length) return events;
  return events
    .map((event, index) => ({ event, index, score: interestMatches(event, interestIds).length }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ event }) => event);
}

// "Matches your interests: Technology, Career", or "" when nothing matches.
export function interestNote(event, interestIds, categories) {
  const names = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const matched = interestMatches(event, interestIds).map((id) => names.get(id)).filter(Boolean);
  return matched.length ? `Matches your interests: ${matched.join(", ")}` : "";
}

// The intro line for a personalized answer.
export function personalizedIntro(matchCount, total) {
  if (!total) return "";
  if (!matchCount) return "None of these match your saved interests, so here's everything that fits your question.";
  return `${matchCount} of ${total} ${total === 1 ? "event matches" : "events match"} your interests, so ${matchCount === 1 ? "it's" : "they're"} listed first.`;
}
