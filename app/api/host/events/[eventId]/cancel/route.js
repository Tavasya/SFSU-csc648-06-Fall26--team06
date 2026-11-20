import {
    hostContext,
    ownedEvent,
    respond,
    ApiError,
} from "@/lib/events/api";

export const POST = respond(async (request, { params }) => {
    const { db, user } = await hostContext(request);
    const { eventId } = await params;

    // Verify that this event belongs to the logged-in host.
    const event = await ownedEvent(db, user, eventId);

    const body = await request.json();

    // Require explicit confirmation from the frontend.
    if (body.confirm !== true) {
        throw new ApiError("Please confirm event cancellation.", 400);
    }

    const message =
        typeof body.cancellation_message === "string"
            ? body.cancellation_message.trim()
            : "";

    if (message.length < 10 || message.length > 1000) {
        throw new ApiError(
            "The cancellation message must be between 10 and 1000 characters.",
            422
        );
    }

    if (event.publication_status !== "published") {
        throw new ApiError(
            "Only published events can be cancelled. Delete an eligible draft instead.",
            409
        );
    }

    if (event.status === "cancelled") {
        throw new ApiError("This event has already been cancelled.", 409);
    }

    if (event.status === "completed") {
        throw new ApiError("Completed events cannot be cancelled.", 409);
    }

    const cancelledAt = new Date().toISOString();

    // Only update an event that is still active and owned by this host.
    const { data, error } = await db
        .from("events")
        .update({
            status: "cancelled",
            cancellation_message: message,
            cancelled_at: cancelledAt,
            cancelled_by: user.id,
            updated_at: cancelledAt,
        })
        .eq("id", eventId)
        .eq("host_id", user.id)
        .eq("status", "active")
        .eq("publication_status", "published")
        .select()
        .maybeSingle();

    if (error) {
        throw new ApiError("Could not cancel the event.", 503);
    }

    if (!data) {
        throw new ApiError(
            "The event could not be cancelled. It may have already changed.",
            409
        );
    }

    return {
        event: data,
        cancelled: true,
    };
});