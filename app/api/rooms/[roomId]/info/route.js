import { createClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  try {
    const db = await createClient();

    const { roomId } = await params;

    // query your rooms table
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("room_name, scan_date, model_view_path")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({
          error: "room not found"
        }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // return room info
    return new Response(
      JSON.stringify({
        room_name: room.room_name,
        scan_date: room.scan_date,
        // the scan file: .glb opens in Unity, .spz in the Spark viewer
        model_view_path: room.model_view_path
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({
        error: "Internal Server Error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  }
}