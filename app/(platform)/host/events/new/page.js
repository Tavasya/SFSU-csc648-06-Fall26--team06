/**
 * Public interfaces supporting R4.1.
 * @module app/platform/host/events/new/page
 */
import { pageContext, options } from "@/lib/events/page-data";
import Access from "@/components/gatoraid/Access";
import EventForm from "@/components/gatoraid/EventForm";
/**
 * Load organizer context and form options to create a draft event.
 * @function Page
 * @memberof module:app/platform/host/events/new/page
 * @static
 * @returns {Promise<React.ReactElement>} Rendered component tree.
 */
export default async function Page() {
  const { db, user, host } = await pageContext();
  if (!host) return <Access user={user} />;
  return (
    <EventForm
      {...await options(db)}
      userId={user.id}
      hostName={host.display_name}
      email={user.email}
    />
  );
}
