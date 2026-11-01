
-- Student class schedules
CREATE TABLE IF NOT EXISTS public.student_class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    class_name TEXT NOT NULL,

    meeting_days TEXT[] NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_class_time
        CHECK (end_time > start_time),

    CONSTRAINT valid_meeting_days
    CHECK (
        COALESCE(array_length(meeting_days, 1), 0) >= 1
        AND array_position(meeting_days, NULL) IS NULL
        AND meeting_days <@ ARRAY[
            'Mon', 'Tue', 'Wed', 'Thu',
            'Fri', 'Sat', 'Sun'
        ]::TEXT[]
    )
);

CREATE INDEX IF NOT EXISTS idx_student_schedules_user
ON public.student_class_schedules(user_id);

-- Enable row-level security
ALTER TABLE public.student_class_schedules
ENABLE ROW LEVEL SECURITY;

-- Students can read their own classes
CREATE POLICY "Students can view own schedules"
ON public.student_class_schedules
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Students can insert their own classes
CREATE POLICY "Students can insert own schedules"
ON public.student_class_schedules
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Students can update their own classes
CREATE POLICY "Students can update own schedules"
ON public.student_class_schedules
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Students can delete their own classes
CREATE POLICY "Students can delete own schedules"
ON public.student_class_schedules
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
