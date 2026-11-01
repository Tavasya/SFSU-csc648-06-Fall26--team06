"use client";
/*
 * components/calendar/CalendarView.js  —  the /calendar page
 *
 * A week view of the student's saved and RSVP'd events. Events load from 
 * GET /api/users/me/saved-events and GET /api/users/me/rsvps. 
 * The week math and layout live in lib/calendar/week.js.
 *
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Info,
  Star,
} from "lucide-react";
import DataState from "@/components/student/DataState";
import { useStudentData } from "@/components/student/useStudentData";
import {
  classBlocks,
  eventBlocks,
  formatMinutes,
  layoutDay,
  mergeStudentEvents,
  scrollHour,
  toPacific,
  weekDays,
  weekLabel,
  weekStart,
  addDays,
} from "@/lib/calendar/week";
import "./calendar.css";

const HOUR_HEIGHT = 52; // px per hour row
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// The student's class schedule ({ name, days, startTime, endTime }[]).
function useClasses() {
  return [];
}

const KIND = {
  class: { label: "Class", Icon: BookOpen },
  saved: { label: "Saved", Icon: Bookmark },
  attending: { label: "RSVP'd", Icon: CircleCheck },
  interested: { label: "Interested", Icon: Star },
};

export default function CalendarView() {
  const saved = useStudentData("/api/users/me/saved-events");
  const rsvps = useStudentData("/api/users/me/rsvps");
  const classes = useClasses();

  const [today] = useState(() => toPacific(Date.now()));
  const [start, setStart] = useState(() => weekStart(today.day));
  const [selectedDay, setSelectedDay] = useState(today.day);

  const loading = saved.loading || rsvps.loading;
  const error = saved.error || rsvps.error;
  const retry = () => {
    saved.retry();
    rsvps.retry();
  };

  const allEvents = useMemo(
    () =>
      loading || error
        ? []
        : eventBlocks(mergeStudentEvents(saved.data.events, rsvps.data.rsvps)),
    [loading, error, saved.data, rsvps.data],
  );

  const days = useMemo(() => weekDays(start), [start]);
  const weekBlocks = useMemo(() => {
    const inWeek = allEvents.filter((b) => b.day >= start && b.day <= days[6].key);
    return [...inWeek, ...classBlocks(classes, days)];
  }, [allEvents, classes, days, start]);

  // Open the grid near the current time (this week) or the first block.
  const gridRef = useRef(null);
  const isThisWeek = start === weekStart(today.day);
  const openHour = scrollHour(weekBlocks, isThisWeek ? today.minutes : null);
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = openHour * HOUR_HEIGHT;
  }, [openHour, start, loading]);

  // The next week with an event, for the "nothing this week" message.
  const nextEventDay = allEvents
    .map((b) => b.day)
    .filter((day) => day > days[6].key)
    .sort()[0];

  function goToWeek(newStart) {
    setStart(newStart);
    setSelectedDay(newStart === weekStart(today.day) ? today.day : newStart);
  }

  return (
    <div className="ga-calendar">
      <div className="ga-heading">
        <div>
          <h1>Calendar</h1>
          <p className="ga-muted">Your RSVPs, saved events, and class schedule in one week.</p>
        </div>
        <Link className="ga-button secondary" href="/events">
          Explore events
        </Link>
      </div>

      {loading || error ? (
        <DataState loading={loading} error={error} retry={retry} />
      ) : (
        <>
          <div className="ga-calendar-toolbar">
            <div className="ga-calendar-nav">
              <button
                className="ga-calendar-arrow"
                onClick={() => goToWeek(addDays(start, -7))}
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="ga-calendar-arrow"
                onClick={() => goToWeek(addDays(start, 7))}
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>
              <h2>{weekLabel(start)}</h2>
              {!isThisWeek && (
                <button className="ga-button secondary" onClick={() => goToWeek(weekStart(today.day))}>
                  Today
                </button>
              )}
            </div>
            <ul className="ga-calendar-legend" aria-label="Legend">
              <li><span className="ga-calendar-swatch is-class" />Class (schedule entry)</li>
              <li><span className="ga-calendar-swatch is-saved" />Saved</li>
              <li><span className="ga-calendar-swatch is-rsvp" />RSVP&apos;d / registered</li>
            </ul>
          </div>

          {/* Phones show one day at a time. This strip picks the day. */}
          <div className="ga-calendar-daystrip" role="tablist" aria-label="Day">
            {days.map((day) => (
              <button
                key={day.key}
                role="tab"
                aria-selected={day.key === selectedDay}
                className={day.key === today.day ? "is-today" : ""}
                onClick={() => setSelectedDay(day.key)}
              >
                <small>{day.name.slice(0, 1)}</small>
                <strong>{day.date}</strong>
              </button>
            ))}
          </div>

          <div className="ga-calendar-frame">
            <div className="ga-calendar-grid" ref={gridRef}>
              <div className="ga-calendar-corner" />
              {days.map((day) => (
                <div
                  key={day.key}
                  className={
                    "ga-calendar-dayhead" +
                    (day.key === today.day ? " is-today" : "") +
                    (day.key === selectedDay ? " is-selected" : "")
                  }
                >
                  {day.name} {day.date}
                </div>
              ))}

              <div className="ga-calendar-times" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                {HOURS.map((hour) => (
                  <span key={hour} style={{ top: hour * HOUR_HEIGHT }}>
                    {formatMinutes(hour * 60)}
                  </span>
                ))}
              </div>

              {days.map((day) => (
                <div
                  key={day.key}
                  className={"ga-calendar-col" + (day.key === selectedDay ? " is-selected" : "")}
                  style={{ height: HOURS.length * HOUR_HEIGHT, "--hour": `${HOUR_HEIGHT}px` }}
                >
                  {day.key === today.day && (
                    <div
                      className="ga-calendar-now"
                      style={{ top: (today.minutes / 60) * HOUR_HEIGHT }}
                      aria-hidden="true"
                    />
                  )}
                  {layoutDay(weekBlocks.filter((b) => b.day === day.key)).map((block) => (
                    <CalendarBlock key={block.id} block={block} />
                  ))}
                </div>
              ))}
            </div>

            {weekBlocks.length === 0 && (
              <div className="ga-calendar-empty">
                <CalendarDays size={28} />
                {allEvents.length === 0 ? (
                  <>
                    <h2>Nothing on your calendar yet</h2>
                    <p className="ga-muted">
                      Save or RSVP to events and they&apos;ll show up here.
                    </p>
                    <Link className="ga-button" href="/events">
                      Explore events
                    </Link>
                  </>
                ) : (
                  <>
                    <h2>Nothing this week</h2>
                    {nextEventDay && (
                      <button className="ga-button secondary" onClick={() => goToWeek(weekStart(nextEventDay))}>
                        Jump to your next event
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <aside className="ga-calendar-note">
            <Info size={18} />
            <div>
              <strong>Classes come from your confirmed schedule</strong>
              <p className="ga-muted">
                Class entries are read-only schedule blocks. Overlaps are shown side by side, never blocked.
              </p>
            </div>
            <Link href="/schedule">
              Manage schedule <ArrowRight size={14} />
            </Link>
          </aside>
        </>
      )}
    </div>
  );
}

function CalendarBlock({ block }) {
  // "class", "saved", "attending" or "interested"
  const variant = block.kind === "rsvp" ? block.rsvpStatus : block.kind;
  const kind = KIND[variant] ?? KIND.saved;
  const style = {
    top: (block.start / 60) * HOUR_HEIGHT,
    height: Math.max(((block.end - block.start) / 60) * HOUR_HEIGHT, 24),
    left: `calc(${(block.lane / block.lanes) * 100}% + 2px)`,
    width: `calc(${100 / block.lanes}% - 4px)`,
  };
  const className =
    "ga-calendar-block is-" + (variant === "attending" ? "rsvp" : variant) +
    (block.cancelled ? " is-cancelled" : "");
  const title = [block.title, block.timeLabel, block.place].filter(Boolean).join(" · ");
  const content = (
    <>
      <span className="ga-calendar-tag">
        <kind.Icon size={12} />
        {block.cancelled ? "Cancelled" : kind.label}
      </span>
      <strong>{block.title}</strong>
      <small>
        {block.timeLabel}
        {block.place ? ` · ${block.place}` : ""}
      </small>
    </>
  );

  // Classes are read-only. Events open their details page.
  return block.kind === "class" ? (
    <div className={className} style={style} title={title}>
      {content}
    </div>
  ) : (
    <Link className={className} style={style} title={title} href={`/events/${block.eventId}`}>
      {content}
    </Link>
  );
}
