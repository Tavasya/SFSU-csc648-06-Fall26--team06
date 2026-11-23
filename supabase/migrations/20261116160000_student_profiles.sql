create table public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  academic_year text not null default '' check (academic_year in ('', 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other')),
  major text not null default '' check (char_length(major) <= 120),
  gender text not null default '' check (gender in ('', 'Woman', 'Man', 'Nonbinary', 'Self-described', 'Prefer not to say')),
  notify_cancellations boolean not null default false,
  notify_updates boolean not null default false,
  notify_reminders boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
grant select, insert, update on public.student_profiles to authenticated;
create policy "Read own profile" on public.student_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Create own profile" on public.student_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own profile" on public.student_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
