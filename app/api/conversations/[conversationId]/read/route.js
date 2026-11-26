/**
 * Mark incoming messages in a conversation as read.
 */
import { respond, ApiError } from "@/lib/events/api";
import { studentContext, checked, body } from "@/lib/student/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/student/validation";

export const POST = respond(async (request, context) => {
  const { user } = await studentContext(request);
  const { conversationId } = await context.params;

  if (!isUuid(conversationId)) {
    throw new ApiError("Conversation not found.", 404);
  }

  const { message_ids: messageIds } = await body(request);

  if (
    !Array.isArray(messageIds) ||
    messageIds.length > 100 ||
    !messageIds.every(isUuid)
  ) {
    throw new ApiError("Choose valid messages to mark as read.", 422);
  }

  const admin = createAdminClient();

  const conversation = checked(await admin.from("conversations")
    .select("id, user_one_id, user_two_id")
    .eq("id", conversationId)
    .maybeSingle());

  if (
    !conversation ||
    ![conversation.user_one_id, conversation.user_two_id].includes(user.id)
  ) {
    throw new ApiError("Conversation not found.", 404);
  }

  if (!messageIds.length) {
    return { marked_read: 0 };
  }

  const incoming = checked(await admin.from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .in("id", messageIds)
    .neq("sender_id", user.id));

  if (!incoming.length) {
    return { marked_read: 0 };
  }

  const rows = incoming.map((message) => ({
    message_id: message.id,
    user_id: user.id,
  }));

  const result = await admin.from("message_read_receipts")
    .upsert(rows, {
      onConflict: "message_id,user_id",
      ignoreDuplicates: true,
    });

  if (result.error) {
    throw new ApiError("Could not update read receipts.", 503);
  }

  return { marked_read: incoming.length };
});