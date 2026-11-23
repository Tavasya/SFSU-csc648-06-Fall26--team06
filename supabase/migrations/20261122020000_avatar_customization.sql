-- Preserve existing avatar colors while adding the Figma palette and body presentation.
alter table public.student_profiles
  add column avatar_presentation text not null default 'Androgynous'
    check (avatar_presentation in ('Feminine', 'Masculine', 'Androgynous')),
  drop constraint student_profiles_avatar_skin_color_check,
  drop constraint student_profiles_avatar_hair_color_check,
  drop constraint student_profiles_avatar_shirt_color_check,
  add constraint student_profiles_avatar_skin_color_check check (avatar_skin_color in ('#f2c6a0', '#d99b72', '#a96845', '#70432f', '#f6d7c3', '#ebc1a0', '#d29e77', '#a9714b', '#7c4f33', '#4e3222')),
  add constraint student_profiles_avatar_hair_color_check check (avatar_hair_color in ('#241b19', '#563527', '#b47a45', '#e5c27b', '#a3422e', '#a4a4a4', '#2b1d16', '#6b4226', '#c08a3e', '#e8d3a2', '#7858ba')),
  add constraint student_profiles_avatar_shirt_color_check check (avatar_shirt_color in ('#532b88', '#245c94', '#307357', '#ad4a4a', '#e6b84a', '#7858ba', '#e8ac0a', '#3070ea', '#1f9d63', '#dc4438', '#1b1925'));
