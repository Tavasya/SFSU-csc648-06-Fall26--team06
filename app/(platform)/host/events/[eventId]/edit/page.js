/**
 * Public interfaces supporting R4.3.
 * @module app/platform/host/events/eventId/edit/page
 */
import { notFound } from "next/navigation";
import { pageContext, options } from "@/lib/events/page-data";
import Access from "@/components/gatoraid/Access";
import EventForm from "@/components/gatoraid/EventForm";
/**
 * Require ownership and load an existing event into the organizer edit form.
 * @function Page
 * @memberof module:app/platform/host/events/eventId/edit/page
 * @static
 * @param {Object} props - Component properties.
 * @param {Promise<Object>} props.params - Promise resolving the dynamic route parameters.
 * @returns {Promise<React.ReactElement>} Rendered component tree.
 */
export default async function Page({ params }) {
  const { db, user, host } = await pageContext();
  if (!host) return <Access user={user} />;
  const { data: event, error } = await db
    .from("events")
    .select("*")
    .eq("id", (await params).eventId)
    .eq("host_id", user.id)
    .maybeSingle();
  if (error || !event) notFound();
  return (
    <EventForm
      event={event}
      {...await options(db)}
      userId={user.id}
      hostName={host.display_name}
      email={user.email}
    />
  );
}
