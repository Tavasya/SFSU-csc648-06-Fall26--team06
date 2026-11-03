# Student profile, recommendations, saved events and RSVP

Personal preferences and class schedules are managed from `/profile`. A user's schedule is private to their own account and is used by For You, the event RSVP warning, and the calendar.

## Database setup

Apply the migrations in order, including [the schedule and ownership migration](../supabase/migrations/20261102000000_schedule_recommendations_and_self_rsvp_guards.sql), after the existing student migration. The schedule column is stored on `student_preferences`; the same owner-only row-level security protects interests and schedule data. The migration also prevents authenticated users from saving or RSVPing to events they host, including direct database writes.

## Pages

- `/profile`: manage categories of interest and add, scan, edit, or remove weekly classes. The schedule scanner requires `GEMINI_API_KEY`; manual schedule entry works without it.
- `/events/for-you`: choose **Interests + schedule**, **Interests only**, or **Schedule only**. The default matches at least one selected interest and excludes events that overlap a saved class. Missing schedules do not block events. Search, date, location and category filters narrow the resulting list.
- `/events`: browse published upcoming events. Your own events are omitted from discovery.
- `/events/[eventId]`: independently save/unsave and choose Attending, Interested or Not Attending. Hosts cannot save or RSVP to their own events. An Attending RSVP that overlaps a saved class displays a confirmation; the student may continue.
- `/saved`: bookmarks, including cancelled or completed published events; open an event to remove it.
- `/calendar`: a week view of saved/RSVP'd events and the saved class schedule.

The old `/interests` and `/schedule` URLs redirect to `/profile`. Anonymous visitors can still explore events; personalized pages prompt for sign-in.

## API

All personalized endpoints authenticate with the session cookie and derive the user ID on the server. Mutations enforce the same-origin check.

| Endpoint | Contract |
| --- | --- |
| GET `/api/users/me/interests` | `{ categories, category_ids, classes }` |
| PUT `/api/users/me/interests` | Accepts `{ category_ids: UUID[] }`; replaces interests |
| GET `/api/users/me/schedule` | `{ classes: [{ name, days, startTime, endTime }] }` |
| PUT `/api/users/me/schedule` | Accepts `{ classes }`; validates and replaces the weekly schedule |
| POST `/api/users/me/schedule/scan` | Multipart `image`; requires a signed-in user and `GEMINI_API_KEY` |
| GET `/api/events/for-you` | `{ categories, category_ids, classes, events }`; events include `recommendation_reasons` |
| GET/PUT `/api/events/:eventId/rsvps/me` | `{ rsvp }`; PUT accepts an RSVP status |
| GET/PUT/DELETE `/api/events/:eventId/saved` | `{ saved: boolean }`; PUT/DELETE are idempotent |
| GET `/api/users/me/saved-events` | `{ events, categories }` |
| GET `/api/users/me/rsvps` | `{ rsvps }`, each with status, timestamp and joined event |

Schedule days use Mon–Sun separated by commas; times use 24-hour `HH:mm`. Entries with missing or invalid days or times are rejected when saved.

## Demo and verification

1. Apply the migrations and sign in with a test account.
2. Visit Your profile, choose interests, add or scan classes, and save both.
3. Open For You and switch between the three recommendation modes.
4. Create and publish an event from My Events. Confirm it is not shown in your Explore or For You results.
5. From a different account, RSVP to an event that overlaps a saved class and confirm the warning still allows the RSVP.
6. Save events and RSVP to others, then verify the saved items, RSVPs, and class schedule appear in Calendar.
7. Verify a host cannot save or RSVP to their own event through the UI or API.

Run `npm test`, `npm run lint`, and `npm run build`. Live persistence and RLS verification require the migrations and authenticated Supabase accounts.
