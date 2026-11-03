# Student calendar

Route: `/calendar` (sidebar: Calendar). A week view of the signed-in student's saved and RSVP'd events and saved class schedule.

Copy `.env.example` to `.env.local` and supply the Supabase URL and publishable key. Run `npm ci`, then `npm run dev`.

## Where the data comes from

The calendar reads three student endpoints (see [student-features.md](student-features.md)). The schedule is persisted on `student_preferences` by the profile API.

| Endpoint | Used for |
| --- | --- |
| GET `/api/users/me/saved-events` | Saved events (`{ events }`) |
| GET `/api/users/me/rsvps` | RSVPs with their joined event (`{ rsvps: [{ status, events }] }`) |
| GET `/api/users/me/schedule` | Weekly classes (`{ classes }`) |

Both load in the browser with `useStudentData`, so signed-out visitors, loading and errors use the same `DataState` messages as the Saved page.

An event that is both saved and RSVP'd shows once, as its RSVP. Not Attending RSVPs are hidden unless the event is also saved. Cancelled events stay on the calendar with their title struck through.

## What the calendar shows

| Block | Style | Clicking it |
| --- | --- | --- |
| Class (schedule entry) | Gray, read-only | Nothing |
| Saved | Dashed purple outline | Opens the event page |
| RSVP'd (Attending) | Solid purple | Opens the event page |
| Interested | Light purple | Opens the event page |

- Weeks run Monday to Sunday in campus time (America/Los_Angeles), whatever the viewer's time zone.
- The grid shows the full day (12 AM – 12 AM) and scrolls. The current week opens an hour before now; other weeks open at 9 AM, or earlier if a block starts earlier. Events that run past midnight are split across both days.
- Overlapping blocks are shown side by side, never hidden.
- Today is highlighted, with a gold line at the current time.
- Previous and next arrows change the week; Today returns to the current week.
- With nothing saved or RSVP'd, the page says "Nothing on your calendar yet" and links to Explore. With nothing in the current week, it offers to jump to the next week that has an event.
- On phones (800px and narrower) the calendar shows one day at a time with a day picker above it.

## Code

- `app/(platform)/calendar/page.js`: the route; renders `CalendarView`.
- `components/calendar/CalendarView.js`: loads the data and draws the week (Client Component).
- `components/calendar/calendar.css`: calendar styles, all scoped to `.ga-calendar-*`.
- `lib/calendar/week.js`: plain functions for week math, Pacific time, turning events and classes into blocks, and the side-by-side layout. They have no React or imports and are tested in `tests/calendar.test.mjs` (`npm test`).
- `components/gatoraid/Shell.js`: the Calendar sidebar link.

## Class schedule

Classes are managed on `/profile`, which supports manual entry and schedule-image scanning. Saving returns them from GET `/api/users/me/schedule` as:

```json
{ "classes": [{ "name": "CSC 648", "days": "Mon, Wed", "startTime": "14:00", "endTime": "15:15" }] }
```

`days` uses Mon–Sun separated by commas, and times are 24-hour `HH:mm`. `classBlocks()` in `lib/calendar/week.js` already turns these into blocks and skips entries with missing or invalid times.

The scanner uses `GEMINI_API_KEY`; students can add classes manually when scanning is unavailable. Invalid or incomplete class entries must be corrected before saving.

## Verification

1. Sign in as a student, open an event, and choose Save event. Open another event and choose Attending, and a third and choose Interested.
2. Open Calendar: each event appears on its day and time with the matching style, and clicking one opens its event page.
3. Change one RSVP to Not Attending: the event disappears unless it is also saved.
4. Use the arrows to move between weeks and Today to come back.
5. Narrow the window below 800px: the day picker appears and the page does not scroll sideways.
6. Run `npm test`.
