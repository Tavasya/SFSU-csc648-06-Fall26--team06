/**
 * Public interfaces supporting R7.3.
 * @module app/api/rooms/roomId/3d-model/route
 */
import { createClient } from "@/lib/supabase/server";

const BUCKET = "rooms";

/**
 * Download the selected room's GLB model as a binary response, with errors for missing rooms or models.
 * @function GET
 * @memberof module:app/api/rooms/roomId/3d-model/route
 * @static
 * @param {Request} request - Incoming HTTP request.
 * @param {Object} options - Grouped function options.
 * @param {Promise<Object>} options.params - Promise resolving the dynamic route parameters.
 * @returns {Promise<Response>} HTTP response containing the result or an error.
 */
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

    // download the GLB file from Supabase storage
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