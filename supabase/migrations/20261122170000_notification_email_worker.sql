-- ============================================================
-- GatorAid: Notification Email Worker
-- Migration: 20261122170000_notification_email_worker.sql
--
-- Creates the database functions used by the Next.js email
-- worker to claim, complete, and retry queued notifications.
-- ============================================================


-- ============================================================
-- 1. CLAIM NOTIFICATIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_notification_queue(
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    event_id uuid,
    user_id uuid,
    notification_type text,
    notification_key text,
    payload jsonb,
    attempts integer,
    max_attempts integer,
    recipient_email text,
    event_title text,
    event_description text,
    event_start_date_time timestamptz,
    event_end_date_time timestamptz,
    room_number text,
    location_id uuid,
    location_name text,
    old_location_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN

    -- Mark notifications that are no longer eligible as failed.
    -- This includes opted-out users, inactive events, missing
    -- recipient emails, and notifications that exhausted retries.

    UPDATE public.notification_queue AS q
    SET
        status = 'failed',
        last_error = 'Notification is no longer eligible for delivery.',
        locked_at = NULL,
        updated_at = now()
    FROM public.events AS e,
         public.student_profiles AS p,
         auth.users AS u
    WHERE q.event_id = e.id
      AND q.user_id = p.user_id
      AND q.user_id = u.id
      AND q.status IN ('pending', 'processing')
      AND (
          (
              q.notification_type = 'cancellation'
              AND p.notify_cancellations IS NOT TRUE
          )
          OR
          (
              q.notification_type = 'update'
              AND p.notify_updates IS NOT TRUE
          )
          OR
          (
              q.notification_type = 'reminder'
              AND p.notify_reminders IS NOT TRUE
          )
          OR
          (
              q.notification_type IN ('update', 'reminder')
              AND e.status <> 'active'
          )
          OR
          u.email IS NULL
          OR
          q.attempts >= q.max_attempts
      );


    -- Claim due notifications.
    -- SKIP LOCKED prevents concurrent workers from claiming
    -- the same notification.

    RETURN QUERY

    WITH candidates AS (
        SELECT q.id
        FROM public.notification_queue AS q
        INNER JOIN public.events AS e
            ON e.id = q.event_id
        INNER JOIN public.student_profiles AS p
            ON p.user_id = q.user_id
        INNER JOIN auth.users AS u
            ON u.id = q.user_id
        WHERE
            (
                (
                    q.status = 'pending'
                    AND q.scheduled_at <= now()
                )
                OR
                (
                    q.status = 'processing'
                    AND q.locked_at < now() - interval '10 minutes'
                )
            )
            AND q.attempts < q.max_attempts
            AND u.email IS NOT NULL
            AND (
                (
                    q.notification_type = 'cancellation'
                    AND p.notify_cancellations IS TRUE
                )
                OR
                (
                    q.notification_type = 'update'
                    AND p.notify_updates IS TRUE
                    AND e.status = 'active'
                )
                OR
                (
                    q.notification_type = 'reminder'
                    AND p.notify_reminders IS TRUE
                    AND e.status = 'active'
                )
            )
        ORDER BY
            q.scheduled_at ASC,
            q.created_at ASC
        LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50))
        FOR UPDATE OF q SKIP LOCKED
    ),

    claimed AS (
        UPDATE public.notification_queue AS q
        SET
            status = 'processing',
            attempts = q.attempts + 1,
            locked_at = now(),
            updated_at = now()
        FROM candidates AS c
        WHERE q.id = c.id
        RETURNING
            q.id,
            q.event_id,
            q.user_id,
            q.notification_type,
            q.notification_key,
            q.payload,
            q.attempts,
            q.max_attempts
    )

    SELECT
        c.id,
        c.event_id,
        c.user_id,
        c.notification_type,
        c.notification_key,
        c.payload,
        c.attempts,
        c.max_attempts,
        u.email::text,
        e.title::text,
        e.description::text,
        e.start_date_time,
        e.end_date_time,
        e.room_number::text,
        e.location_id,
        l.building_name::text,
        old_l.building_name::text

    FROM claimed AS c

    INNER JOIN auth.users AS u
        ON u.id = c.user_id

    INNER JOIN public.events AS e
        ON e.id = c.event_id

    LEFT JOIN public.locations AS l
        ON l.id = e.location_id

    LEFT JOIN public.locations AS old_l
        ON old_l.id =
            NULLIF(c.payload #>> '{old_details,location_id}', '')::uuid;

END;
$$;


-- ============================================================
-- 2. COMPLETE NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_notification_queue(
    p_notification_id uuid,
    p_smtp_message_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN

    UPDATE public.notification_queue
    SET
        status = 'sent',
        smtp_message_id = p_smtp_message_id,
        sent_at = now(),
        locked_at = NULL,
        last_error = NULL,
        updated_at = now()
    WHERE id = p_notification_id
      AND status = 'processing';

END;
$$;


-- ============================================================
-- 3. FAIL NOTIFICATION AND SCHEDULE RETRY
-- ============================================================

CREATE OR REPLACE FUNCTION public.fail_notification_queue(
    p_notification_id uuid,
    p_error text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_attempts integer;
    maximum_attempts integer;
BEGIN

    SELECT attempts, max_attempts
    INTO current_attempts, maximum_attempts
    FROM public.notification_queue
    WHERE id = p_notification_id
      AND status = 'processing'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;


    UPDATE public.notification_queue
    SET
        status = CASE
            WHEN current_attempts >= maximum_attempts
                THEN 'failed'
            ELSE 'pending'
        END,

        scheduled_at = CASE
            WHEN current_attempts >= maximum_attempts
                THEN scheduled_at
            ELSE now() + (
                LEAST(
                    5 * POWER(2, current_attempts - 1),
                    60
                ) * interval '1 minute'
            )
        END,

        last_error = LEFT(
            COALESCE(p_error, 'Unknown email delivery error.'),
            2000
        ),

        locked_at = NULL,
        updated_at = now()

    WHERE id = p_notification_id
      AND status = 'processing';

END;
$$;


-- ============================================================
-- 4. RESTRICT FUNCTION ACCESS
-- ============================================================

-- These functions should only be callable by the Supabase
-- service role used by the server-side notification worker.

REVOKE ALL ON FUNCTION public.claim_notification_queue(integer)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.complete_notification_queue(uuid, text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.fail_notification_queue(uuid, text)
FROM PUBLIC, anon, authenticated;


GRANT EXECUTE ON FUNCTION public.claim_notification_queue(integer)
TO service_role;

GRANT EXECUTE ON FUNCTION public.complete_notification_queue(uuid, text)
TO service_role;

GRANT EXECUTE ON FUNCTION public.fail_notification_queue(uuid, text)
TO service_role;
