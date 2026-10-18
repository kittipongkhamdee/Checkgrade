alter table public.settings
  add column fx_confetti boolean not null default true,
  add column fx_sound boolean not null default true,
  add column fx_spotlight boolean not null default true,
  add column fx_min_gpa numeric not null default 0 check (fx_min_gpa between 0 and 4);
