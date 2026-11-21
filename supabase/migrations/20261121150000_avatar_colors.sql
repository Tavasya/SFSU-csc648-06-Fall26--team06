-- Avatar colors are private profile preferences, protected by the existing profile RLS.
alter table public.student_profiles
  add column avatar_skin_color text not null default '#d99b72' check (avatar_skin_color in ('#f2c6a0', '#d99b72', '#a96845', '#70432f')),
  add column avatar_hair_color text not null default '#563527' check (avatar_hair_color in ('#241b19', '#563527', '#b47a45', '#e5c27b', '#a3422e', '#a4a4a4')),
  add column avatar_shirt_color text not null default '#532b88' check (avatar_shirt_color in ('#532b88', '#245c94', '#307357', '#ad4a4a', '#e6b84a'));
