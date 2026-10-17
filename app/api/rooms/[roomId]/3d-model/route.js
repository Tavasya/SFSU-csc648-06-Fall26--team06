import { createClient } from "@/lib/supabase/server";



const BUCKET = "rooms";

export async function GET(request, { params }) {
  try {
    const db = await createClient();

    const { roomId } = await params;
    console.log("roomId is ", roomId);

    // query your rooms table
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("has_3d_view, model_view_path")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      console.error("Error fetching room:", roomError);
      return new Response(
        JSON.stringify({
          error: "room not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // no 3d model exists yet
    if (!room.has_3d_view) {
      console.log("room has no 3D model");
      return new Response(
        JSON.stringify({
          error: "room has no 3D model"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
    

    const { data, error } = await db.storage
      .from(BUCKET)
      .download(room.model_view_path);

    if (error) {
      console.log(room.model_view_path);
      console.error("Error downloading GLB file:", error);
      return new Response(
        JSON.stringify({
          error: "GLB file not found"
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const arrayBuffer = await data.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Length": arrayBuffer.byteLength.toString()
      }
    });

  } catch (err) {
    console.error(err);

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