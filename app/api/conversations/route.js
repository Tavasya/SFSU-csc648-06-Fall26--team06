
/**
 * List the signed-in user's one-to-one conversations
 * and create or retrieve conversations when the first
 * message is actually sent.
 */
import { respond, ApiError } from "@/lib/events/api";
import { studentContext, checked, body } from "@/lib/student/api";
import { isUuid } from "@/lib/student/validation";
import { createAdminClient } from "@/lib/supabase/admin";

function checkedWithLog(result, operation) {
  if (result.error) {
    console.error(`[Conversations] ${operation} failed:`, {
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      code: result.error.code,
    });

    throw new ApiError(
      "Could not load or save your data. Please try again.",
      503
    );
  }

  return result.data;
}

export const GET = respond(async (request) => {
  const { user } = await studentContext(request);
  const admin = createAdminClient();

  const conversations = checked(
    await admin.from("conversations")
      .select("id, user_one_id, user_two_id, created_at, updated_at")
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
  );

  if (!conversations.length) {
    return { conversations: [] };
  }

  const otherIds = conversations.map((conversation) =>
    conversation.user_one_id === user.id
      ? conversation.user_two_id
      : conversation.user_one_id
  );

  const profiles = checked(
    await admin.from("student_profiles")
      .select("user_id, display_name, academic_year, major")
      .in("user_id", otherIds)
  );

  const profileById = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  // Retrieve incoming messages from all conversations.
  const incomingMessages = checked(
    await admin.from("messages")
      .select("id, conversation_id")
      .in(
        "conversation_id",
        conversations.map((conversation) => conversation.id)
      )
      .neq("sender_id", user.id)
  );

  // Find which incoming messages have already been read.
  let readMessageIds = new Set();

  if (incomingMessages.length > 0) {
    const receipts = checked(
      await admin.from("message_read_receipts")
        .select("message_id")
        .eq("user_id", user.id)
        .in(
          "message_id",
          incomingMessages.map((message) => message.id)
        )
    );

    readMessageIds = new Set(
      receipts.map((receipt) => receipt.message_id)
    );
  }

  // Count unread incoming messages per conversation.
  const unreadCounts = new Map();

  for (const message of incomingMessages) {
    if (!readMessageIds.has(message.id)) {
      const currentCount =
        unreadCounts.get(message.conversation_id) || 0;

      unreadCounts.set(
        message.conversation_id,
        currentCount + 1
      );
    }
  }

  const result = await Promise.all(
    conversations.map(async (conversation) => {
      const otherId =
        conversation.user_one_id === user.id
          ? conversation.user_two_id
          : conversation.user_one_id;

      const lastMessage = checked(
        await admin.from("messages")
          .select("id, sender_id, content, created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      );

      return {
        ...conversation,
        other_user: profileById.get(otherId) || null,
        last_message: lastMessage,
        unread_count: unreadCounts.get(conversation.id) || 0,
      };
    })
  );

  // Do not display conversations that have no messages.
  return {
    conversations: result.filter(
      (conversation) =>
        conversation.other_user && conversation.last_message
    ),
  };
});

export const POST = respond(async (request) => {
  const { user } = await studentContext(request);
  const input = await body(request);

  const {
    event_id: eventId,
    other_user_id: otherUserId,
    content,
  } = input;

  if (!isUuid(eventId) || !isUuid(otherUserId)) {
    throw new ApiError("Choose a valid event and student.", 422);
  }

  if (otherUserId === user.id) {
    throw new ApiError(
      "You cannot start a conversation with yourself.",
      422
    );
  }

  // Message content is optional when checking whether a
  // conversation already exists. It is required to create
  // a new conversation.
  if (
    content !== undefined &&
    (
      typeof content !== "string" ||
      content.trim().length < 1 ||
      content.trim().length > 2000
    )
  ) {
    throw new ApiError(
      "Messages must contain between 1 and 2,000 characters.",
      422
    );
  }

  const admin = createAdminClient();

  const event = checkedWithLog(
    await admin.from("events")
      .select("id, host_id, publication_status")
      .eq("id", eventId)
      .eq("publication_status", "published")
      .maybeSingle(),
    "Published event query"
  );

  if (!event) {
    throw new ApiError("Event not found.", 404);
  }

  // Determine whether the signed-in user owns this event.
  const isHost = event.host_id === user.id;

  // The person receiving the message must always be attending.
  const requiredUserIds = [otherUserId];

  // Non-host students must also be attending.
  if (!isHost) {
    requiredUserIds.push(user.id);
  }

  const rsvps = checkedWithLog(
    await admin.from("event_rsvps")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "attending")
      .in("user_id", requiredUserIds),
    "Attending RSVP query"
  );

  const attendingIds = new Set(
    rsvps.map((rsvp) => rsvp.user_id)
  );

  if (!attendingIds.has(otherUserId)) {
    throw new ApiError(
      "The student must be attending this event to start a conversation.",
      403
    );
  }

  if (!isHost && !attendingIds.has(user.id)) {
    throw new ApiError(
      "You must be attending this event to start a conversation.",
      403
    );
  }

  // Retrieve the recipient's profile for the draft window.
  const otherUser = checkedWithLog(
    await admin.from("student_profiles")
      .select("user_id, display_name, academic_year, major")
      .eq("user_id", otherUserId)
      .maybeSingle(),
    "Recipient profile query"
  );

  if (!otherUser) {
    throw new ApiError("Student profile not found.", 404);
  }

  // Normalize the pair so the same two users always reuse
  // the same conversation.
  const [userOneId, userTwoId] = [user.id, otherUserId].sort();

  let conversation = checkedWithLog(
    await admin.from("conversations")
      .select("id, user_one_id, user_two_id, created_at, updated_at")
      .eq("user_one_id", userOneId)
      .eq("user_two_id", userTwoId)
      .maybeSingle(),
    "Existing conversation query"
  );

  // Check whether the existing conversation actually has messages.
  let hasMessages = false;

  if (conversation) {
    const existingMessage = checkedWithLog(
      await admin.from("messages")
        .select("id")
        .eq("conversation_id", conversation.id)
        .limit(1)
        .maybeSingle(),
      "Existing conversation message query"
    );

    hasMessages = Boolean(existingMessage);
  }

  // No message content means this is only a request to open
  // a conversation window. Do not create a database record.
  if (content === undefined) {
    return {
      conversation: hasMessages ? conversation : null,
      other_user: otherUser,
    };
  }

  let createdByRequest = false;

  // Create the conversation only when the first message is sent.
  if (!conversation) {
    const inserted = await admin.from("conversations")
      .insert({
        user_one_id: userOneId,
        user_two_id: userTwoId,
      })
      .select("id, user_one_id, user_two_id, created_at, updated_at")
      .single();

    if (inserted.error && inserted.error.code !== "23505") {
      console.error("[Conversations] Conversation insert failed:", {
        message: inserted.error.message,
        details: inserted.error.details,
        hint: inserted.error.hint,
        code: inserted.error.code,
      });

      throw new ApiError(
        "Could not start this conversation. Please try again.",
        503
      );
    }

    if (inserted.data) {
      conversation = inserted.data;
      createdByRequest = true;
    } else {
      conversation = checkedWithLog(
        await admin.from("conversations")
          .select("id, user_one_id, user_two_id, created_at, updated_at")
          .eq("user_one_id", userOneId)
          .eq("user_two_id", userTwoId)
          .single(),
        "Conversation lookup after duplicate insert"
      );
    }
  }

  // Save the first message.
  const insertedMessage = await admin.from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: content.trim(),
    })
    .select("id, conversation_id, sender_id, content, created_at")
    .single();

  if (insertedMessage.error) {
    console.error("[Conversations] First message insert failed:", {
      message: insertedMessage.error.message,
      details: insertedMessage.error.details,
      hint: insertedMessage.error.hint,
      code: insertedMessage.error.code,
    });

    // If this request created the conversation but failed to
    // save the first message, remove the empty conversation.
    if (createdByRequest) {
      const cleanup = await admin.from("conversations")
        .delete()
        .eq("id", conversation.id);

      if (cleanup.error) {
        console.error(
          "[Conversations] Empty conversation cleanup failed:",
          cleanup.error
        );
      }
    }

    throw new ApiError(
      "Could not send your message. Please try again.",
      503
    );
  }

  return {
    conversation,
    message: insertedMessage.data,
  };
});
