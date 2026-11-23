# Student profile

The account menu links to `/profile`. This implements the profile portion of David's M4 frontend scope: name, academic year, major, optional gender, existing interests, notification preferences, appearance, and links to schedule and account tools. Interests use the existing categories and recommendation API; the profile does not keep a second copy.

## Setup

Apply [the student profiles migration](../supabase/migrations/20261116160000_student_profiles.sql), followed by [avatar colors](../supabase/migrations/20261121150000_avatar_colors.sql), [discovery and demographics](../supabase/migrations/20261121160000_discovery_and_demographics.sql), [attendee connections](../supabase/migrations/20261121170000_event_messaging.sql), and [the messaging pause](../supabase/migrations/20261122000000_pause_event_messages.sql), in order. Profile rows are private to their owner through RLS. Email and verification status come from Supabase Auth and cannot be changed by the profile payload.

## API

- `GET /api/users/me/profile`: returns `{ profile, email, email_verified }`. Accounts without a row receive empty defaults, with a name from auth metadata when available.
- `PUT /api/users/me/profile`: replaces editable profile details and the three boolean notification preferences; returns `{ profile }`. Requires a nonempty name (80 characters maximum), a major of at most 120 characters, supported academic year/gender values or empty strings, and boolean notification choices. Identity is always supplied by the authenticated session. Foreign origins and anonymous requests are rejected.

Preferences are persisted, but email delivery remains a future backend enhancement, as indicated in the Figma reference and the UI. Theme changes apply immediately and use the same browser preference as the header. Profile details, avatar colors and notifications save together; interests save separately using the existing form. The profile includes a 3D color preview. Gaussian-splat event previews display opted-in attendees at illustrative positions; Unity scans do not yet support avatar rendering. Photo uploads remain separate work.

Attendee connections are off by default. When enabled, other opted-in attendees at the same active event can see the student's name, academic details, interests and avatar colors. Both participants must RSVP attending. Email addresses are not shared. Messaging is a placeholder and the UI does not send or load messages. Organizer demographics show aggregate groups of at least five attendees, with percentages calculated among the groups shown. Popularity currently uses saved events and attending/interested RSVPs; view and external registration counts are not available.

## Verification

Apply [the attended-events migration](../supabase/migrations/20261122010000_attended_events.sql) to enable the self-reported attendance view. Students can mark a past, non-cancelled event as attended on its detail page; this does not assert that attendance was verified by the organizer.

Apply [the avatar customization migration](../supabase/migrations/20261122020000_avatar_customization.sql) for the Figma color palette and presentation choices. Existing saved colors remain valid.

`npm test` covers profile validation, persistence, forged identity fields, authentication, request origin checks, and isolation in the mocked API boundary. To verify deployed RLS, sign in as two different accounts and confirm each can only read/update its own profile and attendance. Check save/reload, discard, interests/recommendations, schedule navigation, both themes, and a narrow mobile viewport. Notification delivery is not implemented by this change.
