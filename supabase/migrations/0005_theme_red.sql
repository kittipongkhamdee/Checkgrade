alter table public.settings drop constraint settings_theme_check;
alter table public.settings add constraint settings_theme_check check (theme in ('academic','pastel','mono','red'));
