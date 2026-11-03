/*
 * lib/assistant/grid.js
 *
 * PURPOSE:
 * The order of items in an AI Assistant answer's 2-column card grid
 * (components/assistant/AssistantChat.js) when one card's 3D preview is open.
 * The preview takes the grid cell next to its card, and the cards after it
 * move down:
 *  - card in the left column:  [card | preview], the rest follow
 *  - card in the right column: it moves to the left, [card | preview], and the
 *    card it was paired with moves down to the next row
 * On one-column (phone) layouts the same order puts the preview under its card.
 * No imports, so it can be tested on its own.
 */

// items: the answer's events; openId: the event whose preview is open (or null)
// Returns [{ type: "card" | "preview", event }].
export function gridItems(events, openId) {
  const cards = events.map((event) => ({ type: "card", event }));
  const index = events.findIndex((event) => event.id === openId);
  if (index < 0) return cards;

  const preview = { type: "preview", event: events[index] };
  if (index % 2 === 0) {
    return [...cards.slice(0, index + 1), preview, ...cards.slice(index + 1)];
  }
  // Right column: swap with its row partner so the preview can sit beside it.
  return [
    ...cards.slice(0, index - 1),
    cards[index],
    preview,
    cards[index - 1],
    ...cards.slice(index + 1),
  ];
}
