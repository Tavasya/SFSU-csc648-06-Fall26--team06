# Student interests, recommendations, saved events and RSVP

David Gomez's M2 feature uses the existing Supabase accounts, event categories and published events.

## Database setup

Apply [the student migration](../supabase/migrations/20261020120000_student_interests_saved_rsvps.sql) after the existing migrations using your Supabase migration workflow or SQL editor. No service-role key is needed by the application. Until this migration is applied, the UI reports a data error rather than pretending preferences or RSVPs were saved.

The migration adds `student_preferences`, `saved_events` and `event_rsvps`. Composite primary keys prevent duplicate bookmarks and RSVPs; every table has owner-only row-level security. Saving never writes to RSVPs and changing an RSVP never writes to bookmarks. Deleted events cascade to both tables. Cancelled/completed events remain in saved lists but reject new attending RSVPs, including direct authenticated database writes.

## Pages

- `/interests`: choose, clear and update categories from the shared category catalog.
- `/events/for-you`: active, current/upcoming published events matching at least one saved interest, with matching-category explanations. Date, location, category and keyword filters operate only within this matched set.
- `/events/[eventId]`: independently save/unsave and choose Attending, Interested or Not Attending. Reloading retrieves the persisted values.
- `/saved`: bookmarks, including cancelled or completed published events; open an event to remove it.

Anonymous visitors can still explore events. Personalized screens prompt for sign-in. Loading, retryable errors, no-interest and no-match states are provided.

## API

All endpoints authenticate with the session cookie; the server derives the user ID. Mutations enforce the existing same-origin check.

| Endpoint | Contract |
| --- | --- |
| GET `/api/users/me/interests` | `{ categories, category_ids }` |
| PUT `/api/users/me/interests` | Accepts `{ category_ids: UUID[] }`; replaces preferences, including an empty selection |
| GET `/api/events/for-you` | `{ categories, category_ids, events }`; events include `recommendation_reasons` |
| GET/PUT `/api/events/:eventId/rsvps/me` | `{ rsvp }`; PUT accepts `{ status: "attending" \| "interested" \| "not_attending" }` |
| GET/PUT/DELETE `/api/events/:eventId/saved` | `{ saved: boolean }`; PUT/DELETE are idempotent |
| GET `/api/users/me/saved-events` | `{ events, categories }` |
| GET `/api/users/me/rsvps` | `{ rsvps }`, each with status, timestamp and joined event; available for calendar integration |

## Demo and verification

1. Apply the migration, then sign in with a test student.
2. Select Technology and Career under Your interests; save and reload.
3. Publish an active future event with a matching category using the existing organizer flow.
4. Open For you, verify the explanation, and filter by its date/location.
5. Open the event, save it and select Attending; reload and verify both values.
6. Unsave it; confirm Attending remains. Change RSVP; confirm saving is unaffected.
7. Sign in with a different account and verify preferences/bookmarks/RSVPs are separate.
8. Cancel the event through the organizer flow. It disappears from recommendations, stays identifiable if bookmarked, and rejects Attending.
9. Verify signed-out requests receive 401, invalid input receives 400/422, and repeated writes do not create duplicate rows.

Run `npm test`, `npm run lint`, and `npm run build`. Unit tests cover interest validation and recommendation/RSVP eligibility. API tests exercise the actual handlers against an in-memory Supabase boundary, checking authentication, origin validation, per-user queries, duplicate writes and independent saved/RSVP state. Live persistence and RLS verification require the migration and authenticated test accounts.

Schedule scanning and calendar UI belong to the other assigned sections. The scanner currently does not persist a confirmed schedule, so recommendations do not claim to check class availability.
