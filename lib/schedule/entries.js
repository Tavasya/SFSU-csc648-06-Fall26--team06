/**
 * Public helper contracts for schedule/entries.
 * @module lib/schedule/entries
 */
/*
 * lib/schedule/entries.js
 *
 * PURPOSE:
 * Checking and tidying schedule entries on /schedule (R9.1, R9.2): the image
 * upload checks, the course name / day / time formatting, and the rules an
 * entry must pass before the schedule can be confirmed. Used by
 * components/schedule/ScheduleUploader.js and tested on its own
 * (tests/schedule-entries.test.mjs).
 */
import { scheduleKind } from "./kinds.js";

export const MAX_SIZE = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Normalize whitespace and uppercase course codes and names.
 * @function formatClassName
 * @memberof module:lib/schedule/entries
 * @static
 * @param {string} value - Course name.
 * @returns {string} Normalized course name.
 */
export function formatClassName(value) {
    const cleaned = value.trim().replace(/\s+/g, " ");

    // csc648, csc 648, CSC-648 -> CSC 648
    const match = cleaned.match(/^([a-zA-Z]+)[\s-]*(\d+[a-zA-Z]?)$/);

    if (match) {
        return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
    }

    // Other course names become uppercase
    return cleaned.toUpperCase();
}

// Course codes are formatted (CSC 648); other entries keep the student's wording.
/**
 * Format class names while preserving the wording of other commitment types.
 * @function formatName
 * @memberof module:lib/schedule/entries
 * @static
 * @param {string} value - Commitment name.
 * @param {string} kind - Schedule entry kind.
 * @returns {string} Normalized name.
 */
export function formatName(value, kind) {
    if (scheduleKind(kind) === "class") return formatClassName(value);
    return value.trim().replace(/\s+/g, " ");
}

/**
 * Normalize recognized weekday aliases and remove duplicate days. Unknown tokens are preserved for validation.
 * @function formatDays
 * @memberof module:lib/schedule/entries
 * @static
 * @param {string} value - Comma, semicolon or slash separated days.
 * @returns {string} Comma separated day labels.
 */
export function formatDays(value) {
    const dayMap = {
        mon: "Mon",
        monday: "Mon",
        tue: "Tue",
        tues: "Tue",
        tuesday: "Tue",
        wed: "Wed",
        wednesday: "Wed",
        thu: "Thu",
        thur: "Thu",
        thurs: "Thu",
        thursday: "Thu",
        fri: "Fri",
        friday: "Fri",
        sat: "Sat",
        saturday: "Sat",
        sun: "Sun",
        sunday: "Sun",
    };

    return [...new Set(
        value
            .split(/[,;/]+/)
            .map((day) => day.trim().toLowerCase())
            .filter(Boolean)
            .map((day) => dayMap[day] || day)
    )].join(", ");
}

// Week order: entries that start earlier in the week (Monday) come first,
// then by start time. Entries without a valid day go last.
/**
 * Copy and sort entries by first weekday, start time and name.
 * @function sortByWeek
 * @memberof module:lib/schedule/entries
 * @static
 * @param {Array<Object>} classes - Schedule entries.
 * @returns {Array<Object>} Sorted entries without reordering the input array.
 */
export function sortByWeek(classes) {
    const firstDay = (course) => {
        const indexes = formatDays(course.days || "")
            .split(",")
            .map((day) => DAYS.indexOf(day.trim()))
            .filter((index) => index >= 0);
        return indexes.length ? Math.min(...indexes) : DAYS.length;
    };

    return [...classes].sort(
        (a, b) =>
            firstDay(a) - firstDay(b) ||
            (a.startTime || "").localeCompare(b.startTime || "") ||
            a.name.localeCompare(b.name)
    );
}

/**
 * Convert valid 24-hour times to a 12-hour label, preserving unrecognized input.
 * @function formatTime12Hour
 * @memberof module:lib/schedule/entries
 * @static
 * @param {string} value - Time text.
 * @returns {string} Formatted time, original invalid text or empty text.
 */
export function formatTime12Hour(value) {
    if (!value) return "";

    const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return value;

    const hours = Number(match[1]);
    const minutes = match[2];

    if (hours > 23 || Number(minutes) > 59) return value;

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${minutes} ${period}`;
}


/**
 * Create a blank commitment with a generated UUID without persisting it.
 * @function emptyClass
 * @memberof module:lib/schedule/entries
 * @static
 * @returns {Object} Blank schedule entry.
 */
export function emptyClass() {
    return {
        id: crypto.randomUUID(),
        name: "",
        kind: "other",
        days: "",
        startTime: "",
        endTime: "",
    };
}

// R9.1: an error message for an uploaded schedule image, or "" when it's fine.
/**
 * Check schedule image presence, supported MIME type and nonzero size up to 5 MiB.
 * @function imageFileError
 * @memberof module:lib/schedule/entries
 * @static
 * @param {File} file - Selected image, if any.
 * @returns {string} First validation message or empty text.
 */
export function imageFileError(file) {
    if (!file) return "Please upload a class schedule image.";
    if (!ALLOWED_TYPES.includes(file.type)) {
        return "Unsupported file. Please upload a PNG, JPG, or WebP image.";
    }
    if (file.size === 0 || file.size > MAX_SIZE) {
        return "Please upload an image smaller than 5 MB.";
    }
    return "";
}

// R9.2: the first problem with an entry, or "" when it can be saved.
//  - index: the entry's position, for "Commitment 2: ..." messages
/**
 * Validate one commitment name, days and time order.
 * @function entryError
 * @memberof module:lib/schedule/entries
 * @static
 * @param {Object} course - Schedule entry.
 * @param {number} index - Zero based entry position for messages.
 * @returns {string} First validation message or empty text.
 */
export function entryError(course, index) {
    const name = formatName(course.name || "", course.kind);
    const days = formatDays(course.days || "")
        .split(",")
        .map((day) => day.trim());

    if (!name) return `Commitment ${index + 1}: Please enter a name.`;
    if (!days.length || !days.every((day) => DAYS.includes(day))) {
        return `Commitment ${index + 1}: Please enter valid days.`;
    }
    if (!course.startTime || !course.endTime) {
        return `Commitment ${index + 1}: Please enter both times.`;
    }
    if (course.startTime >= course.endTime) {
        return `Commitment ${index + 1} (${name}): End time must be later than start time. Check AM and PM.`;
    }
    return "";
}

// R9.2: the first problem with the whole schedule, or "" when it can be confirmed.
/**
 * Check that the schedule contains entries and return its first entry error.
 * @function scheduleError
 * @memberof module:lib/schedule/entries
 * @static
 * @param {Array<Object>} classes - Schedule entries.
 * @returns {string} First validation message or empty text.
 */
export function scheduleError(classes) {
    if (!classes.length) return "Please add at least one class or commitment.";
    for (let index = 0; index < classes.length; index++) {
        const error = entryError(classes[index], index);
        if (error) return error;
    }
    return "";
}

// R9.2: entries tidied and in week order, ready to confirm.
/**
 * Copy entries with normalized names and days, then sort them in week order.
 * @function tidySchedule
 * @memberof module:lib/schedule/entries
 * @static
 * @param {Array<Object>} classes - Schedule entries.
 * @returns {Array<Object>} Normalized sorted entries.
 */
export function tidySchedule(classes) {
    return sortByWeek(
        classes.map((course) => ({
            ...course,
            name: formatName(course.name || "", course.kind),
            days: formatDays(course.days || ""),
        }))
    );
}
