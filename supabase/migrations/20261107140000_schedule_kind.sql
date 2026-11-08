-- Schedule entry types: each row in student_class_schedules can be a class,
-- work, practice (or a club) or something else, so the calendar can tag a
-- work shift as "Work" instead of "Class". Existing rows become classes.
-- replace_student_schedule() saves the new kind; entries sent without one
-- (older app code) are saved as classes.
-- Safe to re-run.

alter table public.student_class_schedules
  add column if not exists kind text not null default 'class';

alter table public.student_class_schedules
  drop constraint if exists valid_schedule_kind;
alter table public.student_class_schedules
  add constraint valid_schedule_kind
  check (kind in ('class', 'work', 'practice', 'other'));

create or replace function public.replace_student_schedule(
    p_classes jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_user_id uuid := (select auth.uid());
    v_count integer;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if jsonb_typeof(p_classes) is distinct from 'array'
       or jsonb_array_length(p_classes) > 50 then
        raise exception 'Invalid schedule data';
    end if;

    -- Remove only the current student's entries.
    delete from public.student_class_schedules
    where user_id = v_user_id;

    insert into public.student_class_schedules (
        user_id,
        class_name,
        kind,
        meeting_days,
        start_time,
        end_time
    )
    select
        v_user_id,
        course.class_name,
        coalesce(course.kind, 'class'),
        course.meeting_days,
        course.start_time,
        course.end_time
    from jsonb_to_recordset(p_classes) as course(
        class_name text,
        kind text,
        meeting_days text[],
        start_time time,
        end_time time
    );

    get diagnostics v_count = row_count;

    return v_count;
end;
$$;

revoke all on function public.replace_student_schedule(jsonb) from public;
revoke all on function public.replace_student_schedule(jsonb) from anon;
grant execute on function public.replace_student_schedule(jsonb) to authenticated;
