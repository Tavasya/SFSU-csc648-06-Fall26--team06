/*
 * lib/schedule/kinds.js
 *
 * The types of schedule entry a student can save on /schedule: a class, a work
 * shift, practice or a club meeting, or anything else. The scanner only reads
 * class schedules, so scanned entries are classes; entries added by hand get
 * whatever type the student picks. The calendar tags each entry with its type.
 */

export const SCHEDULE_KINDS = [
  { id: "class", label: "Class" },
  { id: "work", label: "Work" },
  { id: "practice", label: "Practice or club" },
  { id: "other", label: "Other" },
];

const IDS = new Set(SCHEDULE_KINDS.map((kind) => kind.id));

// Anything missing or unknown (older saved schedules) counts as a class.
export function scheduleKind(value) {
  return IDS.has(value) ? value : "class";
}

export function scheduleKindLabel(value) {
  return SCHEDULE_KINDS.find((kind) => kind.id === scheduleKind(value)).label;
}
