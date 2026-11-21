# Student profile

The account menu links to `/profile`. This implements the profile portion of David's M4 frontend scope: name, academic year, major, optional gender, existing interests, notification preferences, appearance, and links to schedule and account tools. Interests use the existing categories and recommendation API; the profile does not keep a second copy.

## Setup

Apply [the student profiles migration](../supabase/migrations/20261116160000_student_profiles.sql), followed by [avatar colors](../supabase/migrations/20261121150000_avatar_colors.sql), [discovery and demographics](../supabase/migrations/20261121160000_discovery_and_demographics.sql), and [event messaging](../supabase/migrations/20261121170000_event_messaging.sql), in order. Profile rows are private to their owner through RLS. Email and verification status come from Supabase Auth and cannot be changed by the profile payload.

## API

- `GET /api/users/me/profile`: returns `{ profile, email, email_verified }`. Accounts without a row receive empty defaults, with a name from auth metadata when available.
- `PUT /api/users/me/profile`: replaces editable profile details and the three boolean notification preferences; returns `{ profile }`. Requires a nonempty name (80 characters maximum), a major of at most 120 characters, supported academic year/gender values or empty strings, and boolean notification choices. Identity is always supplied by the authenticated session. Foreign origins and anonymous requests are rejected.

Preferences are persisted, but email delivery remains a future backend enhancement, as indicated in the Figma reference and the UI. Theme changes apply immediately and use the same browser preference as the header. Profile details, avatar colors and notifications save together; interests save separately using the existing form. The profile includes a 3D color preview; photo uploads and venue integration remain separate work.

Attendee connections are off by default. When enabled, other opted-in attendees at the same active event can see the student's name, academic details, interests and avatar colors, and exchange event messages. Both participants must RSVP attending. Email addresses are not shared. Messages poll every five seconds and are accessible only while both users remain opted in and attending; access ends when the event ends or is cancelled. Organizer demographics show aggregate groups of at least five attendees, with percentages calculated among the groups shown. Popularity currently uses saved events and attending/interested RSVPs; view and external registration counts are not available.

## Verification

`npm test` covers profile validation, persistence, forged identity fields, authentication, request origin checks, and isolation in the mocked API boundary. To verify deployed RLS, sign in as two different accounts and confirm each can only read/update its own profile. Check save/reload, discard, interests/recommendations, schedule navigation, both themes, and a narrow mobile viewport. Notification delivery and actual attendance tracking are not implemented by this change.
