alter table public.settings add column primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.settings alter column theme set default 'red';
