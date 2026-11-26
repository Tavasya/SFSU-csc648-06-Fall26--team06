
/**
 * Return the attendee directory for an event to students who are attending it.
 */
import { respond, ApiError } from "@/lib/events/api";
import {
    studentContext,
    publishedEvent,
    checked,
} from "@/lib/student/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const GET = respond(async (request, context) => {
    const { db, user } = await studentContext(request);

    const event = await publishedEvent(db, context);

    const admin = createAdminClient();

    // Hosts can view the attendee list without an RSVP.
    const isHost = event.host_id === user.id;

    // Non-host students must have an attending RSVP.
    if (!isHost) {
        const ownRsvpResult = await admin
            .from("event_rsvps")
            .select("status")
            .eq("event_id", event.id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (ownRsvpResult.error) {
            console.error("[Attendees] Own RSVP query failed:", {
                message: ownRsvpResult.error.message,
                details: ownRsvpResult.error.details,
                hint: ownRsvpResult.error.hint,
                code: ownRsvpResult.error.code,
            });

            throw new ApiError(
                "Could not load or save your data. Please try again.",
                503
            );
        }

        const ownRsvp = ownRsvpResult.data;

        if (ownRsvp?.status !== "attending") {
            throw new ApiError(
                "You must be attending this event to view its attendee list.",
                403
            );
        }
    }

    // Retrieve all students who are attending this event.
    const rsvps = checked(
        await admin
            .from("event_rsvps")
            .select("user_id, created_at")
            .eq("event_id", event.id)
            .eq("status", "attending")
            .order("created_at", { ascending: true })
    );

    const userIds = rsvps.map((rsvp) => rsvp.user_id);

    // An empty attendee list is valid.
    if (userIds.length === 0) {
        return {
            attendees: [],
            count: 0,
        };
    }

    // Retrieve the profiles belonging to the attending students.
    const profiles = checked(
        await admin
            .from("student_profiles")
            .select("user_id, display_name, academic_year, major")
            .in("user_id", userIds)
    );

    const profileByUserId = new Map(
        profiles.map((profile) => [profile.user_id, profile])
    );

    // Combine RSVP information with student profile information.
    const attendees = rsvps
        .map((rsvp) => {
            const profile = profileByUserId.get(rsvp.user_id);

            if (!profile) {
                return null;
            }

            return {
                user_id: profile.user_id,
                display_name: profile.display_name,
                academic_year: profile.academic_year,
                major: profile.major,
                is_self: profile.user_id === user.id,
            };
        })
        .filter(Boolean);

    return {
        attendees,
        count: attendees.length,
    };
});
