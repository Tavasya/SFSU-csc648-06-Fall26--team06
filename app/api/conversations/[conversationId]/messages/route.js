/**
 * Read messages or send a message in a conversation the student belongs to.
 */
import { respond, ApiError } from "@/lib/events/api";
import { studentContext, checked, body } from "@/lib/student/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/student/validation";

async function participantConversation(admin, conversationId, userId) {
  if (!isUuid(conversationId)) {
    throw new ApiError("Conversation not found.", 404);
  }

  const conversation = checked(await admin.from("conversations")
    .select("id, user_one_id, user_two_id")
    .eq("id", conversationId)
    .maybeSingle());

  if (
    !conversation ||
    ![conversation.user_one_id, conversation.user_two_id].includes(userId)
  ) {
    throw new ApiError("Conversation not found.", 404);
  }

  return conversation;
}

export const GET = respond(async (request, context) => {
  const { user } = await studentContext(request);
  const { conversationId } = await context.params;
  const admin = createAdminClient();

  await participantConversation(admin, conversationId, user.id);

  const messages = checked(await admin.from("messages")
    .select("id, conversation_id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100));

  const messageIds = messages.map((message) => message.id);

  let receipts = [];

  if (messageIds.length) {
    receipts = checked(await admin.from("message_read_receipts")
      .select("message_id, user_id, read_at")
      .in("message_id", messageIds));
  }

  const receiptByMessage = new Map(
    receipts.map((receipt) => [receipt.message_id, receipt])
  );

  return {
    messages: messages.map((message) => ({
      ...message,
      read_receipt: receiptByMessage.get(message.id) || null,
    })),
  };
});

export const POST = respond(async (request, context) => {
  const { user } = await studentContext(request);
  const { conversationId } = await context.params;
  const { content } = await body(request);

  if (
    typeof content !== "string" ||
    content.trim().length < 1 ||
    content.trim().length > 2000
  ) {
    throw new ApiError(
      "Messages must contain between 1 and 2,000 characters.",
      422
    );
  }

  const admin = createAdminClient();

  await participantConversation(admin, conversationId, user.id);

  const message = checked(await admin.from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select("id, conversation_id, sender_id, content, created_at")
    .single());

  return { message };
});