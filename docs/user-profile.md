# Student profile

The account menu links to `/profile`. This implements the profile portion of David's M4 frontend scope: name, academic year, major, optional gender, existing interests, notification preferences, appearance, and links to schedule and account tools. Interests use the existing categories and recommendation API; the profile does not keep a second copy.

## Setup

Apply [the student profiles migration](../supabase/migrations/20261116160000_student_profiles.sql) before using the page. No existing profile or schedule tables are modified. All profile rows are private to their owner through RLS. Email and verification status come from Supabase Auth and cannot be changed by the profile payload.

## API

- `GET /api/users/me/profile`: returns `{ profile, email, email_verified }`. Accounts without a row receive empty defaults, with a name from auth metadata when available.
- `PUT /api/users/me/profile`: replaces editable profile details and the three boolean notification preferences; returns `{ profile }`. Requires a nonempty name (80 characters maximum), a major of at most 120 characters, supported academic year/gender values or empty strings, and boolean notification choices. Identity is always supplied by the authenticated session. Foreign origins and anonymous requests are rejected.

Preferences are persisted, but email delivery remains a future backend enhancement, as indicated in the Figma reference and the UI. Theme changes apply immediately and use the same browser preference as the header. Profile details and notifications save together; interests save separately using the existing form. The profile currently uses an initial avatar; photo uploads and customizable 3D avatars are separate work.

## Verification

`npm test` covers profile validation, persistence, forged identity fields, authentication, request origin checks, and isolation in the mocked API boundary. To verify deployed RLS, sign in as two different accounts and confirm each can only read/update its own profile. Check save/reload, discard, interests/recommendations, schedule navigation, both themes, and a narrow mobile viewport. Notification delivery and actual attendance tracking are not implemented by this change.
