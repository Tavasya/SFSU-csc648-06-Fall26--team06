import { notFound } from "next/navigation";
import { pageContext, options } from "@/lib/events/page-data";
import Access from "@/components/gatoraid/Access";
import EventDetails from "@/components/gatoraid/EventDetails";
import PublishBar from "@/components/gatoraid/PublishBar";
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
  const { categories, locations } = await options(db);
  let coverUrl = null;
  if (event.cover_path) {
    const { data } = await db.storage
      .from("event-covers")
      .createSignedUrl(event.cover_path, 3600);
    coverUrl = data?.signedUrl;
  }
  return (
    <>
      <PublishBar event={event} />
      <EventDetails
        preview
        event={event}
        categories={categories}
        location={locations.find((l) => l.id === event.location_id)}
        hostName={host.display_name}
        coverUrl={coverUrl}
      />
    </>
  );
}
