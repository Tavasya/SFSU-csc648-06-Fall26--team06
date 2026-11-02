
-- Atomically replace the authenticated student's schedule.
-- This function uses the caller's RLS permissions.

CREATE OR REPLACE FUNCTION public.replace_student_schedule(
    p_classes JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID := (SELECT auth.uid());
    v_count INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF jsonb_typeof(p_classes) IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_classes) > 50 THEN
        RAISE EXCEPTION 'Invalid schedule data';
    END IF;

    -- Remove only the current student's classes.
    DELETE FROM public.student_class_schedules
    WHERE user_id = v_user_id;

    -- Insert the new schedule.
    INSERT INTO public.student_class_schedules (
        user_id,
        class_name,
        meeting_days,
        start_time,
        end_time
    )
    SELECT
        v_user_id,
        course.class_name,
        course.meeting_days,
        course.start_time,
        course.end_time
    FROM jsonb_to_recordset(p_classes) AS course(
        class_name TEXT,
        meeting_days TEXT[],
        start_time TIME,
        end_time TIME
    );

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$;

-- Only authenticated users may execute this function.
REVOKE ALL ON FUNCTION
    public.replace_student_schedule(JSONB)
FROM PUBLIC;

REVOKE ALL ON FUNCTION
    public.replace_student_schedule(JSONB)
FROM anon;

GRANT EXECUTE ON FUNCTION
    public.replace_student_schedule(JSONB)
TO authenticated;
