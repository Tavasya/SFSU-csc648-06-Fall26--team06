import { createClient } from "@/lib/supabase/server";



const BUCKET = "rooms";

export async function GET(request, { params }) {
  try {
    const db = await createClient();

    const { roomId } = await params;

    // query your rooms table
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("has_3d_view, model_view_path")
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
        }
      );
    }

    // no 3d model exists yet
    if (!room.has_3d_view) {
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