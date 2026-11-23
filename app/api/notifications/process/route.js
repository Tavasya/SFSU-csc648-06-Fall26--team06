import { timingSafeEqual } from "node:crypto";
import transporter from "@/lib/email/transporter";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildNotificationEmail } from "@/lib/notifications/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidCronSecret(request) {
    const secret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization") || "";

    if (!secret || !authorization.startsWith("Bearer ")) {
        return false;
    }

    const provided = Buffer.from(authorization.slice(7));
    const expected = Buffer.from(secret);

    if (provided.length !== expected.length) {
        return false;
    }

    return timingSafeEqual(provided, expected);
}

export async function POST(request) {
    // Verify the request is authorized.
    if (!hasValidCronSecret(request)) {
        return Response.json(
            { error: "Unauthorized." },
            { status: 401 }
        );
    }

    // Make sure Gmail credentials exist.
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return Response.json(
            { error: "Email delivery is not configured." },
            { status: 503 }
        );
    }

    let db;

    try {
        db = createAdminClient();
    } catch (error) {
        console.error("Notification worker configuration error:", error);

        return Response.json(
            { error: "Notification worker is not configured." },
            { status: 503 }
        );
    }

    // Claim up to 20 eligible notifications.
    const { data: notifications, error: claimError } = await db.rpc(
        "claim_notification_queue",
        { p_limit: 20 }
    );

    if (claimError) {
        console.error(
            "Could not claim notification queue entries:",
            claimError
        );

        return Response.json(
            { error: "Could not load pending notifications." },
            { status: 503 }
        );
    }

    const results = {
        claimed: notifications?.length || 0,
        sent: 0,
        retried_or_failed: 0,
    };

    // Process each claimed notification.
    for (const notification of notifications || []) {
        try {
            const email = buildNotificationEmail(notification, {
                status: notification.event_status,
                title: notification.event_title,
                start_date_time: notification.event_start_date_time,
                end_date_time: notification.event_end_date_time,
                cancellation_message: notification.payload?.cancellation_message,
                location_name: notification.location_name,
                room_number: notification.room_number,
                old_location_name: notification.old_location_name,
            });

            // Send the email using Gmail SMTP.
            const message = await transporter.sendMail({
                from: `GatorAid <${process.env.GMAIL_USER}>`,
                to: notification.recipient_email,
                subject: email.subject,
                text: email.text,
                html: email.html,

                // Stable ID helps identify retries of the same queue item.
                messageId: `<${notification.id}@gatoraid.local>`,
            });

            // Mark the notification as sent.
            const { data: completed, error: completeError } = await db.rpc(
                "complete_notification_queue",
                {
                    p_notification_id: notification.id,
                    p_smtp_message_id: message.messageId || null,
                }
            );

            if (completeError) {
                throw new Error(
                    completeError.message ||
                    "Email was sent, but its queue status could not be updated."
                );
            }

            results.sent += 1;

        } catch (error) {
            console.error(
                `Notification ${notification.id} failed:`,
                error
            );

            // Record the failure and schedule a retry if possible.
            const { error: failureError } = await db.rpc(
                "fail_notification_queue",
                {
                    p_notification_id: notification.id,
                    p_error: error instanceof Error
                        ? error.message
                        : String(error),
                }
            );

            if (failureError) {
                console.error(
                    `Could not update failed notification ${notification.id}:`,
                    failureError
                );
            }

            results.retried_or_failed += 1;
        }
    }

    return Response.json({
        success: true,
        ...results,
    });
}