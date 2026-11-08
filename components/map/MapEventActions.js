/*
 * components/map/MapEventActions.js
 *
 * PURPOSE:
 * Save and RSVP inside the map's event detail view (MapEventDetail.js), kept
 * to one row of buttons:
 *  - signed out: links to sign in or create an account, which come back to
 *    this event on the map afterwards
 *  - the event's own host: a note instead (hosts can't RSVP to their own events)
 *  - everyone else: Save / Interested / Going (MapQuickActions.js)
 */

"use client";

import Link from "next/link";
import MapQuickActions, { useEventStatuses } from "@/components/map/MapQuickActions";

const linkClass =
  "inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#604398]";

export default function MapEventActions({ event, returnTo }) {
  const statuses = useEventStatuses();

  if (event.hostedByYou) {
    return (
      <p className="mt-3 text-[12px] text-[#51475f]">
        You&apos;re hosting this event. See who&apos;s coming on{" "}
        <Link href="/host/events" className="font-medium text-[#604398] underline underline-offset-2">
          Your events
        </Link>
        .
      </p>
    );
  }

  if (statuses.signedIn === false) {
    const next = encodeURIComponent(returnTo);
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-[#51475f]">Save or RSVP:</span>
        <Link href={`/login?next=${next}`} className={`${linkClass} bg-[#604398] text-white hover:bg-[#503581]`}>
          Sign in
        </Link>
        <Link
          href={`/login?mode=signup&next=${next}`}
          className={`${linkClass} border border-[#ebe7f0] bg-white text-[#262332] hover:border-[#d9cfe8]`}
        >
          Create an account
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <MapQuickActions event={event} statuses={statuses} returnTo={returnTo} />
    </div>
  );
}
