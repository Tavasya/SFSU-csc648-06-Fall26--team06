-- Keep existing messages intact while the messaging interface is a placeholder.
revoke execute on function public.event_conversation(uuid, uuid), public.send_event_message(uuid, uuid, text) from authenticated;
