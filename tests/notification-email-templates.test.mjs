import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNotificationEmail } from "../lib/notifications/email-templates.js";

const event = {
    title: "Coffee Chat",
    start_date_time: "2026-11-23T17:00:00.000Z",
    end_date_time: "2026-11-23T19:00:00.000Z",
    cancellation_message: "The host had to cancel.",
    location_name: "Rigoberta Menchu Hall",
};

test("builds a cancellation email and escapes user-provided message HTML", () => {
    const email = buildNotificationEmail({
        notification_type: "cancellation",
        payload: {
            event_title: "Coffee Chat",
            cancellation_message: "<script>alert('x')</script>",
            event_start_date_time: event.start_date_time,
        },
    }, event);

    assert.match(email.subject, /^Cancelled:/);
    assert.match(email.html, /&lt;script&gt;/);
    assert.doesNotMatch(email.html, /<script>/);
    assert.match(email.text, /Coffee Chat/);
});

test("builds an update email containing changed event fields", () => {
    const email = buildNotificationEmail({
        notification_type: "update",
        payload: {
            event_title: "Coffee Chat",
            old_details: {
                title: "Coffee Chat",
                room_number: "Room 1",
            },
            new_details: {
                title: "Coffee Chat",
                room_number: "Room 2",
            },
        },
    }, event);

    assert.match(email.subject, /^Event updated:/);
    assert.match(email.html, /Room 1/);
    assert.match(email.html, /Room 2/);
});

test("builds a reminder email with event timing and location", () => {
    const email = buildNotificationEmail({
        notification_type: "reminder",
        payload: {
            event_title: "Coffee Chat",
            event_start_date_time: event.start_date_time,
            event_end_date_time: event.end_date_time,
            room_number: "Floor 1",
        },
    }, event);

    assert.match(email.subject, /^Reminder:/);
    assert.match(email.html, /Rigoberta Menchu Hall/);
    assert.match(email.html, /Floor 1/);
});

test("rejects an unsupported notification type", () => {
    assert.throws(
        () => buildNotificationEmail({
            notification_type: "other",
        }, event),
        /Unsupported notification type/
    );
});