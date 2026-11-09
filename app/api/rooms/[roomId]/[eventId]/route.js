import { createClient } from "@/lib/supabase/server";

/*
  Returns the RSVPs for a specific event.
  RSVPs are filtered to only include those with status "attending" or "interested".
*/
export async function GET(request, { params }) {

  try {

    const db = await createClient();
    const {eventId, roomId} = await params;

    // Fetch the RSVPs for the event from the database
    const { data : eventRsvps, error : eventRsvpsError } = await db
      .from("event_rsvps")
      .select("user_id")
      .eq("event_id", eventId)
      .in("status", ["attending", "interested"]);
    
    if (eventRsvpsError) {
      console.error(eventRsvpsError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch RSVPs"
        }),
        {
          status: 500
        }
      );
    } 

    // Return the RSVP data as JSON
    // Format: "rsvps" : [{id, username, profilePictureUrl}, ..., {}]
    // For now, since theres no user table, just return userID
    const rsvps = eventRsvps.map(rsvp => ({
      id: rsvp.user_id,
      username: `User ${rsvp.user_id}`, // Placeholder username
      profilePictureUrl: `https://example.com/user${rsvp.user_id}.png` // Placeholder profile picture URL
    }));

    // Return the RSVP data as JSON
    return new Response(
      JSON.stringify({ rsvps }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (err) {

    // Return Error
    return new Response(
      JSON.stringify({
        error: "Internal Server Error"
      }),
      {
        status: 500
      }
    );
  }
}