"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { studentRequest } from "@/components/student/useStudentData";

export default function MessagesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialConversationId = searchParams.get("conversation");
  const initialRecipientId = searchParams.get("recipient");
  const initialEventId = searchParams.get("event");
  const searchParamsKey = searchParams.toString();

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(initialConversationId);

  const [draftRecipientId, setDraftRecipientId] = useState(
    initialRecipientId
  );
  const [draftEventId, setDraftEventId] = useState(initialEventId);
  const [draftOtherUser, setDraftOtherUser] = useState(null);
  const [openingDraft, setOpeningDraft] = useState(
    Boolean(initialRecipientId && initialEventId)
  );

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedId
      ) || null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async () => {
    try {
      const data = await studentRequest("/api/conversations");

      setConversations(data.conversations || []);
      setError("");

      return data.conversations || [];
    } catch (requestError) {
      setError(requestError.message);
      return [];
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Load the signed-in user and conversation list.
  useEffect(() => {
    const db = createClient();

    db.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });

    loadConversations();
  }, [loadConversations]);

  // Keep the selected conversation synchronized with the URL.
  // This also handles navigating from an existing conversation
  // to a new draft conversation without unmounting this component.
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    const recipientId = searchParams.get("recipient");
    const eventId = searchParams.get("event");

    if (conversationId) {
      setSelectedId(conversationId);

      setDraftRecipientId(null);
      setDraftEventId(null);
      setDraftOtherUser(null);
      setOpeningDraft(false);

      setDraft("");
      setError("");

      return;
    }

    if (recipientId && eventId) {
      setSelectedId(null);

      setDraftRecipientId(recipientId);
      setDraftEventId(eventId);
      setDraftOtherUser(null);

      setMessages([]);
      setDraft("");
      setError("");

      setOpeningDraft(true);

      return;
    }

    setSelectedId(null);

    setDraftRecipientId(null);
    setDraftEventId(null);
    setDraftOtherUser(null);
    setOpeningDraft(false);

    setMessages([]);
    setDraft("");
  }, [searchParamsKey]);

  // Prepare a draft conversation.
  // This request checks eligibility and looks for an existing
  // conversation, but does not create a new conversation row.
  useEffect(() => {
    if (
      !draftRecipientId ||
      !draftEventId ||
      selectedId
    ) {
      return;
    }

    const controller = new AbortController();

    async function prepareDraftConversation() {
      setOpeningDraft(true);
      setError("");

      try {
        const result = await studentRequest("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            event_id: draftEventId,
            other_user_id: draftRecipientId,
          }),
        });

        if (controller.signal.aborted) {
          return;
        }

        // An existing conversation with messages was found.
        // Open it instead of creating a separate draft.
        if (result.conversation) {
          setDraftRecipientId(null);
          setDraftEventId(null);
          setDraftOtherUser(null);

          setSelectedId(result.conversation.id);

          router.replace(
            `/messages?conversation=${result.conversation.id}`
          );

          return;
        }

        // No existing conversation with messages.
        // Keep this as a temporary draft until the first message
        // is sent.
        setDraftOtherUser(result.other_user || null);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message);

          setDraftRecipientId(null);
          setDraftEventId(null);
          setDraftOtherUser(null);

          router.replace("/messages");
        }
      } finally {
        if (!controller.signal.aborted) {
          setOpeningDraft(false);
        }
      }
    }

    prepareDraftConversation();

    return () => controller.abort();
  }, [
    draftRecipientId,
    draftEventId,
    selectedId,
    router,
  ]);

  // Load messages whenever the selected conversation changes.
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    const controller = new AbortController();

    async function loadSelected() {
      setLoadingMessages(true);

      try {
        const data = await studentRequest(
          `/api/conversations/${selectedId}/messages`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) {
          return;
        }

        setMessages(data.messages || []);

        // Find incoming messages that have not been read.
        // The messages API returns a singular read_receipt object.
        const unreadIds = currentUserId
          ? (data.messages || [])
              .filter(
                (message) =>
                  message.sender_id !== currentUserId &&
                  !message.read_receipt
              )
              .map((message) => message.id)
          : [];

        if (unreadIds.length > 0) {
          await studentRequest(
            `/api/conversations/${selectedId}/read`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message_ids: unreadIds }),
            }
          );

          if (!controller.signal.aborted) {
            await loadConversations();
          }
        }

        setError("");
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMessages(false);
        }
      }
    }

    loadSelected();

    return () => controller.abort();
  }, [selectedId, currentUserId, loadConversations]);

  // Subscribe to new messages and read-receipt changes.
  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const db = createClient();

    const channel = db
      .channel(`messages-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        async () => {
          const data = await studentRequest(
            `/api/conversations/${selectedId}/messages`
          );

          setMessages(data.messages || []);

          const unreadIds = currentUserId
            ? (data.messages || [])
                .filter(
                  (message) =>
                    message.sender_id !== currentUserId &&
                    !message.read_receipt
                )
                .map((message) => message.id)
            : [];

          if (unreadIds.length > 0) {
            await studentRequest(
              `/api/conversations/${selectedId}/read`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message_ids: unreadIds }),
              }
            );
          }

          await loadConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_read_receipts",
        },
        async () => {
          const data = await studentRequest(
            `/api/conversations/${selectedId}/messages`
          );

          setMessages(data.messages || []);
          await loadConversations();
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [selectedId, currentUserId, loadConversations]);

  // Send a message.
  // If this is a draft conversation, the first message creates
  // the conversation and message together through the conversations API.
  async function sendMessage(event) {
    event.preventDefault();

    if (!draft.trim() || sending || openingDraft) {
      return;
    }

    if (!selectedId && (!draftRecipientId || !draftEventId)) {
      return;
    }

    setSending(true);
    setError("");

    try {
      // First message in a new conversation.
      if (!selectedId && draftRecipientId && draftEventId) {
        const result = await studentRequest("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: draftEventId,
            other_user_id: draftRecipientId,
            content: draft,
          }),
        });

        if (!result.conversation || !result.message) {
          throw new Error("Could not start the conversation. Please try again.");
        }

        const newConversationId = result.conversation.id;

        setSelectedId(newConversationId);
        setMessages([result.message]);

        setDraft("");
        setDraftRecipientId(null);
        setDraftEventId(null);
        setDraftOtherUser(null);

        router.replace(
          `/messages?conversation=${newConversationId}`
        );

        await loadConversations();

        return;
      }

      // Message in an existing conversation.
      await studentRequest(
        `/api/conversations/${selectedId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: draft }),
        }
      );

      setDraft("");

      const data = await studentRequest(
        `/api/conversations/${selectedId}/messages`
      );

      setMessages(data.messages || []);
      await loadConversations();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  // Return to the conversation list.
  function returnToConversationList() {
    setSelectedId(null);

    setDraftRecipientId(null);
    setDraftEventId(null);
    setDraftOtherUser(null);
    setOpeningDraft(false);

    setMessages([]);
    setDraft("");
    setError("");

    router.replace("/messages");
  }

  const hasActiveConversation = Boolean(
    selectedId || draftRecipientId
  );

  const displayedOtherUser =
    selectedConversation?.other_user || draftOtherUser;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#302344]">
          Messages
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Private conversations with other GatorAid students.
        </p>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-[#E5DDF0] bg-white md:grid-cols-[320px_1fr]">
        <aside
          className={`${
            hasActiveConversation ? "hidden md:block" : "block"
          } border-r border-[#E5DDF0]`}
        >
          <div className="border-b border-[#E5DDF0] px-4 py-4 font-semibold">
            Your conversations
          </div>

          {loadingList && (
            <p className="p-4 text-sm text-gray-500">
              Loading conversations…
            </p>
          )}

          {!loadingList && conversations.length === 0 && (
            <p className="p-4 text-sm text-gray-500">
              No conversations yet. Open an event and message a student who is attending.
            </p>
          )}

          <ul>
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDraftRecipientId(null);
                    setDraftEventId(null);
                    setDraftOtherUser(null);
                    setOpeningDraft(false);

                    setSelectedId(conversation.id);

                    router.replace(
                      `/messages?conversation=${conversation.id}`
                    );
                  }}
                  className={`w-full border-b border-[#F0ECF5] px-4 py-4 text-left hover:bg-[#F8F5FC] ${
                    selectedId === conversation.id
                      ? "bg-[#F3EEFA]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="block text-sm text-[#302344]">
                      {conversation.other_user.display_name}
                    </strong>

                    {conversation.unread_count > 0 && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#65449B]"
                        title="Unread messages"
                        aria-label="Unread messages"
                      />
                    )}
                  </div>

                  <span className="mt-1 block truncate text-xs text-gray-500">
                    {conversation.last_message?.content || "Start the conversation"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section
          className={`${
            hasActiveConversation ? "flex" : "hidden md:flex"
          } min-w-0 flex-col`}
        >
          {!hasActiveConversation ? (
            <div className="m-auto max-w-sm p-8 text-center text-gray-500">
              <MessageCircle className="mx-auto mb-3" size={36} />
              <p>Select a conversation to start messaging.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-[#E5DDF0] px-4 py-4">
                <button
                  type="button"
                  className="md:hidden"
                  onClick={returnToConversationList}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={19} />
                </button>

                <div>
                  <strong className="block text-[#302344]">
                    {displayedOtherUser?.display_name ||
                      (openingDraft ? "Opening conversation…" : "Conversation")}
                  </strong>

                  <span className="text-xs text-gray-500">
                    {[
                      displayedOtherUser?.academic_year,
                      displayedOtherUser?.major,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#FBFAFD] p-4">
                {openingDraft && (
                  <p className="py-10 text-center text-sm text-gray-500">
                    Preparing conversation…
                  </p>
                )}

                {loadingMessages && (
                  <p className="text-sm text-gray-500">
                    Loading messages…
                  </p>
                )}

                {!openingDraft &&
                  !loadingMessages &&
                  messages.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-500">
                      This is the beginning of your conversation.
                    </p>
                  )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === currentUserId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`message-bubble max-w-[80%] rounded-2xl border px-4 py-2 text-sm ${
                        message.sender_id === currentUserId
                          ? "message-bubble--outgoing bg-[#65449B] text-white"
                          : "message-bubble--incoming bg-white text-[#302344] shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                      <span className="mt-1 block text-right text-[10px] opacity-70">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}

                        {message.sender_id === currentUserId &&
                          message.read_receipt
                          ? " · Read"
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={sendMessage}
                className="flex gap-2 border-t border-[#E5DDF0] p-3"
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2000}
                  placeholder="Write a message…"
                  aria-label="Write a message"
                  disabled={openingDraft || sending}
                  className="min-w-0 flex-1 rounded-full border border-[#D8CDE9] px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#65449B] disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={!draft.trim() || sending || openingDraft}
                  className="rounded-full bg-[#65449B] px-4 text-white disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
