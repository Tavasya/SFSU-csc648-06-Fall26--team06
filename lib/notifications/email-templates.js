function safeSubject(value) {
    return String(value ?? "GatorAid notification")
        .replace(/[\r\n]+/g, " ")
        .trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatDate(value) {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Not specified";

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "America/Los_Angeles",
    }).format(date) + " PT";
}

function emailLayout({ heading, intro, eventTitle, content }) {
    const safeTitle = escapeHtml(eventTitle || "Your GatorAid event");
    const safeHeading = escapeHtml(heading);
    const safeIntro = escapeHtml(intro);

    const html = `
        <div style="margin:0;padding:32px 12px;background:#f4f6f8;font-family:Arial,sans-serif;color:#243447;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8ee;">
                <div style="padding:24px 28px;background:#46779f;color:#ffffff;">
                    <div style="font-size:13px;letter-spacing:1px;font-weight:bold;">GATORAID</div>
                    <h1 style="font-size:24px;line-height:1.3;margin:12px 0 0;">${safeHeading}</h1>
                </div>
                <div style="padding:28px;">
                    <p style="margin:0 0 12px;line-height:1.6;">${safeIntro}</p>
                    <h2 style="font-size:19px;margin:20px 0 12px;">${safeTitle}</h2>
                    ${content}
                    <p style="font-size:12px;color:#687887;line-height:1.5;margin:28px 0 0;">
                        You are receiving this email because of your GatorAid event notification preferences.
                    </p>
                </div>
            </div>
        </div>`;

    const text = `${heading}

${intro}

${eventTitle || "Your GatorAid event"}

${content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}

You are receiving this email because of your GatorAid event notification preferences.`;

    return { html, text };
}

function detailRow(label, value) {
    return `<tr>
        <th align="left" style="padding:9px 12px;border-bottom:1px solid #e8edf1;color:#526273;font-size:13px;">
            ${escapeHtml(label)}
        </th>
        <td style="padding:9px 12px;border-bottom:1px solid #e8edf1;font-size:13px;">
            ${escapeHtml(value || "Not specified")}
        </td>
    </tr>`;
}

function eventDetails({ start, end, location, room }) {
    return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0 0;">
        ${detailRow("When", formatDate(start))}
        ${detailRow("Ends", formatDate(end))}
        ${detailRow("Location", location)}
        ${detailRow("Room", room)}
    </table>`;
}

// 1. Cancellation email
function buildCancellation(notification, event) {
    const message =
        notification.payload?.cancellation_message ||
        event.cancellation_message ||
        "The event host has cancelled this event.";

    const content = `
        <p style="line-height:1.6;">
            This event has been cancelled. We’re sorry for the change in plans.
        </p>

        <div style="padding:14px 16px;background:#fff4f2;border-left:4px solid #c94b45;border-radius:4px;margin:16px 0;">
            <strong>Message from the event host</strong>
            <p style="margin:8px 0 0;line-height:1.6;white-space:pre-wrap;">
                ${escapeHtml(message)}
            </p>
        </div>

        ${eventDetails({
            start: notification.payload?.event_start_date_time || event.start_date_time,
            end: event.end_date_time,
            location: event.location_name,
            room: notification.payload?.room_number || event.room_number || "",
        })}`;

    return {
        subject: safeSubject(
            `Cancelled: ${notification.payload?.event_title || event.title}`
        ),

        ...emailLayout({
            heading: "Event cancelled",
            intro: "An event you saved or RSVP’d to has been cancelled.",
            eventTitle: notification.payload?.event_title || event.title,
            content,
        }),
    };
}

// 2. Reminder email
function buildReminder(notification, event) {
    const content = `
        <p style="line-height:1.6;">
            This is a reminder that an event you saved or RSVP’d to is coming up in approximately 24 hours.
        </p>

        ${eventDetails({
            start: notification.payload?.event_start_date_time || event.start_date_time,
            end: notification.payload?.event_end_date_time || event.end_date_time,
            location: event.location_name,
            room: notification.payload?.room_number || "",
        })}`;

    return {
        subject: safeSubject(
            `Reminder: ${notification.payload?.event_title || event.title} is coming up`
        ),

        ...emailLayout({
            heading: "Upcoming event reminder",
            intro: "Here’s a reminder about an upcoming GatorAid event.",
            eventTitle: notification.payload?.event_title || event.title,
            content,
        }),
    };
}

// 3. Event update email
function buildUpdate(notification, event) {
    const oldDetails = notification.payload?.old_details || {};
    const newDetails = notification.payload?.new_details || {};

    const fields = [
        ["Event title", "title"],
        ["Description", "description"],
        ["Start time", "start_date_time", formatDate],
        ["End time", "end_date_time", formatDate],
        ["Room", "room_number"],
        ["Location ID", "location_id"],
        ["Admission", "admission_type"],
        ["Audience", "audience"],
        ["Capacity", "capacity"],
        ["Wheelchair accessible", "wheelchair_accessible", (value) => value ? "Yes" : "No"],
        ["ASL available", "asl_available", (value) => value ? "Yes" : "No"],
        ["RSVP required", "rsvp_required", (value) => value ? "Yes" : "No"],
        ["Contact email", "contact_email"],
    ];

    const changes = fields.filter(([, key]) => {
        return oldDetails[key] !== newDetails[key];
    });

    const rows = changes.map(([label, key, formatter]) => {
        let before = formatter
            ? formatter(oldDetails[key])
            : String(oldDetails[key] ?? "Not specified");

        let after = formatter
            ? formatter(newDetails[key])
            : String(newDetails[key] ?? "Not specified");

        if (key === "location_id") {
            before = event.old_location_name || "Previous location";
            after = event.location_name || "Updated location";
        }

        return `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e8edf1;font-size:13px;vertical-align:top;">
                ${escapeHtml(label)}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e8edf1;font-size:13px;vertical-align:top;color:#687887;">
                ${escapeHtml(before)}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e8edf1;font-size:13px;vertical-align:top;">
                ${escapeHtml(after)}
            </td>
        </tr>`;
    }).join("");

    const content = `
        <p style="line-height:1.6;">
            The host has updated an event you saved or RSVP’d to. Here are the changed details:
        </p>

        ${rows ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:12px 0 0;">
            <tr>
                <th align="left" style="padding:10px 12px;background:#f4f6f8;font-size:12px;">Field</th>
                <th align="left" style="padding:10px 12px;background:#f4f6f8;font-size:12px;">Before</th>
                <th align="left" style="padding:10px 12px;background:#f4f6f8;font-size:12px;">Now</th>
            </tr>
            ${rows}
        </table>` : "<p>The event details have changed.</p>"}`;

    return {
        subject: safeSubject(
            `Event updated: ${notification.payload?.event_title || event.title}`
        ),

        ...emailLayout({
            heading: "Event details updated",
            intro: "An event you saved or RSVP’d to has new information.",
            eventTitle: notification.payload?.event_title || event.title,
            content,
        }),
    };
}

// Select the correct email template.
export function buildNotificationEmail(notification, event) {
    if (notification.notification_type === "cancellation") {
        return buildCancellation(notification, event);
    }

    if (notification.notification_type === "update") {
        return buildUpdate(notification, event);
    }

    if (notification.notification_type === "reminder") {
        return buildReminder(notification, event);
    }

    throw new Error(
        `Unsupported notification type: ${notification.notification_type}`
    );
}