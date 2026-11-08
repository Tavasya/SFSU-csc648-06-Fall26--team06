
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_KINDS, scheduleKind } from "@/lib/schedule/kinds";

const TABLE = "student_class_schedules";

const VALID_DAYS = new Set([
    "Mon", "Tue", "Wed", "Thu",
    "Fri", "Sat", "Sun",
]);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const VALID_KINDS = new Set(SCHEDULE_KINDS.map((kind) => kind.id));

// Undefined column: the schedule kind migration
// (20261107140000_schedule_kind.sql) hasn't been applied yet.
const MISSING_COLUMN = "42703";

async function authenticatedClient() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return { supabase, user: null };
    }

    return { supabase, user };
}

// GET: Load the current student's schedule
export async function GET() {
    try {
        const { supabase, user } = await authenticatedClient();

        if (!user) {
            return NextResponse.json(
                { error: "Please sign in to view your schedule." },
                { status: 401 }
            );
        }

        const load = (columns) =>
            supabase
                .from(TABLE)
                .select(columns)
                .eq("user_id", user.id)
                .order("start_time");

        let { data, error } = await load(
            "id, class_name, kind, meeting_days, start_time, end_time"
        );

        // Before the migration every entry is a class.
        if (error?.code === MISSING_COLUMN) {
            ({ data, error } = await load(
                "id, class_name, meeting_days, start_time, end_time"
            ));
        }

        if (error) throw error;

        const classes = data.map((course) => ({
            id: course.id,
            name: course.class_name,
            kind: scheduleKind(course.kind),
            days: course.meeting_days.join(", "),
            startTime: course.start_time.slice(0, 5),
            endTime: course.end_time.slice(0, 5),
        }));

        return NextResponse.json({ classes });
    } catch (error) {
        console.error("Load schedule error:", error.message);

        return NextResponse.json(
            { error: "Unable to load your schedule." },
            { status: 500 }
        );
    }
}

// PUT: Replace the current student's schedule
export async function PUT(request) {
    try {
        const { supabase, user } = await authenticatedClient();

        if (!user) {
            return NextResponse.json(
                { error: "Please sign in to save your schedule." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const classes = body.classes;

        if (!Array.isArray(classes) || classes.length > 50) {
            return NextResponse.json(
                { error: "Invalid schedule data." },
                { status: 400 }
            );
        }

        const normalized = [];

        for (const course of classes) {
            if (!course || typeof course !== "object") {
                return NextResponse.json(
                    { error: "Invalid class entry." },
                    { status: 400 }
                );
            }

            const name =
                typeof course.name === "string"
                    ? course.name.trim()
                    : "";

            const days =
                typeof course.days === "string"
                    ? course.days.split(",").map((day) => day.trim())
                    : [];

            const kind = course.kind ?? "class";

            const startTime = course.startTime;
            const endTime = course.endTime;

            if (
                !name ||
                name.length > 150 ||
                !VALID_KINDS.has(kind) ||
                days.length === 0 ||
                !days.every((day) => VALID_DAYS.has(day)) ||
                !TIME_PATTERN.test(startTime) ||
                !TIME_PATTERN.test(endTime) ||
                startTime >= endTime
            ) {
                return NextResponse.json(
                    { error: `Invalid class: ${name || "Unnamed class"}` },
                    { status: 400 }
                );
            }

            normalized.push({
                user_id: user.id,
                class_name: name,
                kind,
                meeting_days: [...new Set(days)],
                start_time: startTime,
                end_time: endTime,
            });
        }


        // Replace the student's schedule atomically
        const { data: savedCount, error: saveError } =
            await supabase.rpc("replace_student_schedule", {
                p_classes: normalized.map((course) => ({
                    class_name: course.class_name,
                    kind: course.kind,
                    meeting_days: course.meeting_days,
                    start_time: course.start_time,
                    end_time: course.end_time,
                })),
            });

        if (saveError) {
            throw saveError;
        }

        // Entry types are only stored once the kind column exists.
        const { error: kindError } = await supabase
            .from(TABLE)
            .select("kind")
            .limit(0);

        return NextResponse.json({
            success: true,
            count: savedCount,
            typesSaved: kindError?.code !== MISSING_COLUMN,
        });


        return NextResponse.json({
            success: true,
            count: normalized.length,
        });
    } catch (error) {
        console.error("Save schedule error:", error.message);

        return NextResponse.json(
            { error: "Unable to save your schedule." },
            { status: 500 }
        );
    }
}
