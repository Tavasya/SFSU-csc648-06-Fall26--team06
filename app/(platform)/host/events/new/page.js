import { pageContext, options } from "@/lib/events/page-data";
import Access from "@/components/gatoraid/Access";
import EventForm from "@/components/gatoraid/EventForm";
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
