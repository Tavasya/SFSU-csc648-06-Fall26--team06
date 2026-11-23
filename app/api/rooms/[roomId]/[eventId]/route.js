import { createClient } from "@/lib/supabase/server";

/*
  Returns the RSVPs for a specific event.
  RSVPs are filtered to only include those with status "attending" or "interested".
  User-created avatars are instantiated in the unity instance
*/
export async function GET(request, { params }) {

  try {

    const db = await createClient();
    const {eventId, roomId} = await params;

    // get data of the event's host
    const { data : hostData, error: hostError} = await db
      .from("events")
      .select("host_id")
      .eq("id", eventId)
      .single()
    
    if (hostError) {
      console.error(hostError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch host data"
        }),
        {
          status: 500
        }
      );
    }

    // create hostData object for response
    const hostCustom = await GetCustomizationObject(hostData.host_id, db);
    const host = {
      id : hostData.host_id,
      username : "Host",
      profilePictureUrl : "Placeholder",
      customization : hostCustom
    }

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
    const rsvps = await Promise.all(
      eventRsvps.map(async rsvp => {
        const customization = await GetCustomizationObject(rsvp.user_id, db)

        return {
          id: rsvp.user_id,
          username: `User ${rsvp.user_id}`, // Placeholder username
          profilePictureUrl: `placeholder url`, // Placeholder profile picture URL,
          customization : customization
        }

      })
    );

    // Return the RSVP data as JSON
    const body = {
      hostData : host,
      rsvps : rsvps
    }
    return new Response(
      JSON.stringify({body}),
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

async function GetCustomizationObject(userID, database) {
  const { data : customization, error :customizationError} = await database 
    .from('student_avatar')
    .select(`
      gender,
      hair:colors!student_avatar_hair_color_fkey (
        name
      ),
      skin:colors!student_avatar_skin_color_fkey (
        name
      ),
      outfit:colors!student_avatar_outfit_color_fkey (
        name
      )
    `)
    .eq('user_id', userID);
  
    if (customizationError || customization.length <= 0) {
      console.error(customizationError)
      return null;
    }

    const obj = {
      gender : customization[0].gender,
      skinColor : customization[0].skin?.name,
      hairColor : customization[0].hair?.name,
      outfitColor: customization[0].outfit?.name
    }

    return obj
}
