// Messaging API unit tests for GatorAid.
// Supabase is replaced with the in-memory fake from tests/helpers/harness.mjs.
// No real accounts, conversations, messages, environment variables or database
// setup are required.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDb, request, params } from "./helpers/harness.mjs";

const { GET: getConversations, POST: postConversation } =
  await import("../app/api/conversations/route.js");
const {
  GET: getMessages,
  POST: postMessage,
} = await import("../app/api/conversations/[conversationId]/messages/route.js");
const { POST: markRead } =
  await import("../app/api/conversations/[conversationId]/read/route.js");

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";
const HOST = "44444444-4444-4444-8444-444444444444";
const EVENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONVERSATION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MESSAGE_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MESSAGE_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const profile = (userId, displayName = "Student") => ({
  user_id: userId,
  display_name: displayName,
  academic_year: "Junior",
  major: "Computer Science",
});

const event = (hostId = HOST, publicationStatus = "published") => ({
  id: EVENT,
  host_id: hostId,
  publication_status: publicationStatus,
});

const conversation = (overrides = {}) => ({
  id: CONVERSATION,
  user_one_id: USER_A,
  user_two_id: USER_B,
  created_at: "2026-11-26T10:00:00.000Z",
  updated_at: "2026-11-26T10:00:00.000Z",
  ...overrides,
});

const message = (id, senderId, content = "Hello") => ({
  id,
  conversation_id: CONVERSATION,
  sender_id: senderId,
  content,
  created_at: "2026-11-26T10:01:00.000Z",
});

function setup({ user = USER_A, tables = {}, fail = {} } = {}) {
  return createDb({
    user: user ? { id: user } : null,
    fail,
    tables: {
      events: [event()],
      event_rsvps: [
        { event_id: EVENT, user_id: USER_A, status: "attending" },
        { event_id: EVENT, user_id: USER_B, status: "attending" },
      ],
      student_profiles: [profile(USER_A, "Student A"), profile(USER_B, "Student B")],
      conversations: [],
      messages: [],
      message_read_receipts: [],
      ...tables,
    },
  });
}

async function result(response) {
  return { status: response.status, data: await response.json() };
}

function postRequest(body) {
  return request("POST", body, { url: "http://localhost/api/conversations" });
}

function messageContext(conversationId = CONVERSATION) {
  return params({ conversationId });
}

test("messaging GET requires an authenticated user", async () => {
  setup({ user: null });
  const response = await result(await getConversations(request("GET")));
  assert.equal(response.status, 401);
});

test("conversation list is empty when the user has no conversations", async () => {
  setup();
  const response = await result(await getConversations(request("GET")));
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { conversations: [] });
});

test("conversation list hides a conversation that has no messages", async () => {
  setup({ tables: { conversations: [conversation()] } });
  const response = await result(await getConversations(request("GET")));
  assert.equal(response.status, 200);
  assert.deepEqual(response.data.conversations, []);
});

test("conversation list includes the other profile and last message", async () => {
  setup({
    tables: {
      conversations: [conversation()],
      messages: [message(MESSAGE_A, USER_A, "First message")],
    },
  });
  const response = await result(await getConversations(request("GET")));
  assert.equal(response.status, 200);
  assert.equal(response.data.conversations.length, 1);
  assert.equal(response.data.conversations[0].other_user.user_id, USER_B);
  assert.equal(response.data.conversations[0].last_message.content, "First message");
});

test("conversation list counts unread incoming messages", async () => {
  setup({
    tables: {
      conversations: [conversation()],
      messages: [
        message(MESSAGE_A, USER_B, "Unread one"),
        message(MESSAGE_B, USER_B, "Unread two"),
      ],
    },
  });
  const response = await result(await getConversations(request("GET")));
  assert.equal(response.status, 200);
  assert.equal(response.data.conversations[0].unread_count, 2);
});

test("conversation list excludes messages with read receipts from unread count", async () => {
  setup({
    tables: {
      conversations: [conversation()],
      messages: [message(MESSAGE_A, USER_B)],
      message_read_receipts: [{ message_id: MESSAGE_A, user_id: USER_A }],
    },
  });
  const response = await result(await getConversations(request("GET")));
  assert.equal(response.status, 200);
  assert.equal(response.data.conversations[0].unread_count, 0);
});

test("draft request rejects malformed event or recipient IDs", async () => {
  setup();
  const response = await result(await postConversation(postRequest({
    event_id: "not-a-uuid",
    other_user_id: USER_B,
  })));
  assert.equal(response.status, 422);
});

test("draft request rejects messaging yourself", async () => {
  setup();
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_A,
  })));
  assert.equal(response.status, 422);
  assert.match(response.data.error, /yourself/);
});

test("draft request rejects an unpublished or missing event", async () => {
  setup({ tables: { events: [event(HOST, "draft")] } });
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
  })));
  assert.equal(response.status, 404);
});

test("draft request requires the recipient to be attending", async () => {
  setup({
    tables: {
      event_rsvps: [
        { event_id: EVENT, user_id: USER_A, status: "attending" },
        { event_id: EVENT, user_id: USER_B, status: "interested" },
      ],
    },
  });
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
  })));
  assert.equal(response.status, 403);
});

test("student draft request requires the sender to be attending too", async () => {
  setup({
    tables: {
      event_rsvps: [
        { event_id: EVENT, user_id: USER_A, status: "interested" },
        { event_id: EVENT, user_id: USER_B, status: "attending" },
      ],
    },
  });
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
  })));
  assert.equal(response.status, 403);
});

test("event host may open a draft with an attending student without an RSVP", async () => {
  setup({
    user: HOST,
    tables: {
      events: [event(HOST)],
      event_rsvps: [{ event_id: EVENT, user_id: USER_B, status: "attending" }],
      student_profiles: [profile(USER_B, "Student B")],
    },
  });
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
  })));
  assert.equal(response.status, 200);
  assert.equal(response.data.conversation, null);
  assert.equal(response.data.other_user.user_id, USER_B);
  assert.equal(globalThis.__testDb.tables.conversations.length, 0);
});

test("opening a new draft returns recipient profile without inserting a conversation", async () => {
  setup();
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
  })));
  assert.equal(response.status, 200);
  assert.equal(response.data.conversation, null);
  assert.equal(response.data.other_user.display_name, "Student B");
  assert.equal(globalThis.__testDb.tables.conversations.length, 0);
});

test("opening an existing conversation with messages returns that conversation", async () => {
  setup({
    tables: {
      conversations: [conversation()],
      messages: [message(MESSAGE_A, USER_B)],
    },
  });
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
  })));
  assert.equal(response.status, 200);
  assert.equal(response.data.conversation.id, CONVERSATION);
  assert.equal(globalThis.__testDb.tables.conversations.length, 1);
});

test("sending the first message creates a conversation and stores trimmed content", async () => {
  setup();
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
    content: "  Hello GatorAid  ",
  })));
  assert.equal(response.status, 200);
  assert.equal(response.data.conversation.user_one_id, USER_A);
  assert.equal(response.data.conversation.user_two_id, USER_B);
  assert.equal(response.data.message.content, "Hello GatorAid");
  assert.equal(response.data.message.sender_id, USER_A);
  assert.equal(globalThis.__testDb.tables.conversations.length, 1);
  assert.equal(globalThis.__testDb.tables.messages.length, 1);
});

test("first-message request rejects empty content", async () => {
  setup();
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
    content: "   ",
  })));
  assert.equal(response.status, 422);
  assert.equal(globalThis.__testDb.tables.conversations.length, 0);
});

test("first-message request rejects content longer than 2,000 characters", async () => {
  setup();
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
    content: "x".repeat(2001),
  })));
  assert.equal(response.status, 422);
});

test("failed first-message insert removes the newly created empty conversation", async () => {
  setup({ fail: { messages: ["insert"] } });
  const response = await result(await postConversation(postRequest({
    event_id: EVENT,
    other_user_id: USER_B,
    content: "Hello",
  })));
  assert.equal(response.status, 503);
  assert.equal(globalThis.__testDb.tables.conversations.length, 0);
});

test("message history is available to a conversation participant", async () => {
  setup({
    tables: {
      conversations: [conversation()],
      messages: [message(MESSAGE_A, USER_B)],
    },
  });
  const response = await result(await getMessages(request("GET"), messageContext()));
  assert.equal(response.status, 200);
  assert.equal(response.data.messages.length, 1);
  assert.equal(response.data.messages[0].content, "Hello");
  assert.equal(response.data.messages[0].read_receipt, null);
});

test("message history is hidden from a nonparticipant", async () => {
  setup({
    user: USER_C,
    tables: { conversations: [conversation()] },
  });
  const response = await result(await getMessages(request("GET"), messageContext()));
  assert.equal(response.status, 404);
});

test("participant can send a reply in an existing conversation", async () => {
  setup({ tables: { conversations: [conversation()] } });
  const response = await result(await postMessage(
    postRequest({ content: "  Reply  " }),
    messageContext()
  ));
  assert.equal(response.status, 200);
  assert.equal(response.data.message.content, "Reply");
  assert.equal(response.data.message.sender_id, USER_A);
});

test("nonparticipant cannot send a message in an existing conversation", async () => {
  setup({
    user: USER_C,
    tables: { conversations: [conversation()] },
  });
  const response = await result(await postMessage(
    postRequest({ content: "Not allowed" }),
    messageContext()
  ));
  assert.equal(response.status, 404);
});

test("message endpoint rejects invalid conversation IDs", async () => {
  setup();
  const response = await result(await getMessages(
    request("GET"),
    messageContext("bad-id")
  ));
  assert.equal(response.status, 404);
});

test("read receipt endpoint records only incoming messages", async () => {
  setup({
    tables: {
      conversations: [conversation()],
      messages: [
        message(MESSAGE_A, USER_B, "Incoming"),
        message(MESSAGE_B, USER_A, "Outgoing"),
      ],
    },
  });
  const response = await result(await markRead(
    postRequest({ message_ids: [MESSAGE_A, MESSAGE_B] }),
    messageContext()
  ));
  assert.equal(response.status, 200);
  assert.equal(response.data.marked_read, 1);
  assert.equal(globalThis.__testDb.tables.message_read_receipts.length, 1);
  assert.equal(globalThis.__testDb.tables.message_read_receipts[0].message_id, MESSAGE_A);
  assert.equal(globalThis.__testDb.tables.message_read_receipts[0].user_id, USER_A);
});

test("read receipt endpoint returns zero when no messages are supplied", async () => {
  setup({ tables: { conversations: [conversation()] } });
  const response = await result(await markRead(
    postRequest({ message_ids: [] }),
    messageContext()
  ));
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, { marked_read: 0 });
});

test("read receipt endpoint rejects more than 100 message IDs", async () => {
  setup({ tables: { conversations: [conversation()] } });
  const ids = Array.from({ length: 101 }, (_, index) =>
    `${String(index).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
  );
  const response = await result(await markRead(
    postRequest({ message_ids: ids }),
    messageContext()
  ));
  assert.equal(response.status, 422);
});

test("read receipt endpoint rejects nonparticipants", async () => {
  setup({
    user: USER_C,
    tables: { conversations: [conversation()] },
  });
  const response = await result(await markRead(
    postRequest({ message_ids: [MESSAGE_A] }),
    messageContext()
  ));
  assert.equal(response.status, 404);
});