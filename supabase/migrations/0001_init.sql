-- Checkgrade schema
create table public.settings (
  id int primary key default 1 check (id = 1),
  system_name text not null default 'ระบบตรวจสอบผลการเรียน',
  school_name text not null default 'โรงเรียนบ้านละมงค์',
  logo_url text,
  semester int not null default 1,
  academic_year int not null default 2569,
  levels text[] not null default array['มัธยมศึกษาปีที่ 1','มัธยมศึกษาปีที่ 2','มัธยมศึกษาปีที่ 3'],
  rooms text[] not null default array['1','2'],
  open_at timestamptz,
  close_at timestamptz,
  theme text not null default 'academic' check (theme in ('academic','pastel','mono')),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'teacher' check (role in ('admin','teacher')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.report_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles on delete cascade default auth.uid(),
  school_name text,
  level text not null,
  room text not null,
  semester int not null,
  academic_year int not null,
  homeroom_teacher text,
  director text,
  subjects jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (teacher_id, level, room, semester, academic_year)
);

create table public.student_results (
  id uuid primary key default gen_random_uuid(),
  report_set_id uuid not null references public.report_sets on delete cascade,
  teacher_id uuid not null references public.profiles on delete cascade default auth.uid(),
  student_code text not null,
  no int,
  full_name text not null,
  scores jsonb not null default '[]',
  total numeric, percent numeric, gpa numeric, rank int,
  club text, traits text, thinking text, activity text, comment text,
  updated_at timestamptz not null default now(),
  unique (report_set_id, student_code)
);
create index on public.student_results (student_code);

create table public.access_logs (
  id bigint generated always as identity primary key,
  role text not null check (role in ('student','teacher','admin')),
  actor text not null,
  name text,
  action text not null,
  created_at timestamptz not null default now()
);
create index on public.access_logs (role, created_at desc);

-- helpers
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active) $$;
create function public.is_active_teacher() returns boolean language sql stable security definer set search_path = '' as
$$ select exists (select 1 from public.profiles where id = auth.uid() and active) $$;

-- first registered user becomes admin
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''),
          case when exists (select 1 from public.profiles) then 'teacher' else 'admin' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS
alter table public.settings enable row level security;
alter table public.profiles enable row level security;
alter table public.report_sets enable row level security;
alter table public.student_results enable row level security;
alter table public.access_logs enable row level security;

create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for update using (public.is_admin());

create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_upd on public.profiles for update using (id = auth.uid() or public.is_admin());

create policy sets_own on public.report_sets for all
  using ((teacher_id = auth.uid() and public.is_active_teacher()) or public.is_admin())
  with check ((teacher_id = auth.uid() and public.is_active_teacher()) or public.is_admin());
create policy results_own on public.student_results for all
  using ((teacher_id = auth.uid() and public.is_active_teacher()) or public.is_admin())
  with check ((teacher_id = auth.uid() and public.is_active_teacher()) or public.is_admin());

create policy logs_admin on public.access_logs for select using (public.is_admin());
create policy logs_teacher_insert on public.access_logs for insert to authenticated
  with check (role in ('teacher','admin') and actor = auth.uid()::text);

-- prevent role escalation by teachers
create function public.guard_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and (new.role <> old.role or new.active <> old.active) then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- student lookup (anon). Returns only when the window is open.
create function public.student_lookup(p_code text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.settings; res jsonb;
begin
  select * into s from public.settings where id = 1;
  if (s.open_at is not null and now() < s.open_at) or (s.close_at is not null and now() > s.close_at) then
    return jsonb_build_object('status','closed');
  end if;
  select jsonb_agg(jsonb_build_object(
      'semester', rs.semester, 'academic_year', rs.academic_year, 'level', rs.level, 'room', rs.room,
      'school_name', rs.school_name, 'homeroom_teacher', rs.homeroom_teacher, 'subjects', rs.subjects,
      'no', r.no, 'full_name', r.full_name, 'student_code', r.student_code, 'scores', r.scores,
      'total', r.total, 'percent', r.percent, 'gpa', r.gpa, 'rank', r.rank, 'club', r.club,
      'traits', r.traits, 'thinking', r.thinking, 'activity', r.activity, 'comment', r.comment)
      order by rs.academic_year desc, rs.semester desc)
    into res
  from public.student_results r join public.report_sets rs on rs.id = r.report_set_id
  join public.profiles p on p.id = rs.teacher_id and p.active
  where r.student_code = trim(p_code) and rs.academic_year = s.academic_year;
  if res is null then return jsonb_build_object('status','notfound'); end if;
  return jsonb_build_object('status','ok','terms',res);
end $$;

create function public.log_student(p_code text, p_name text, p_action text) returns void language sql security definer set search_path = '' as
$$ insert into public.access_logs (role, actor, name, action) values ('student', left(p_code,20), left(p_name,120), left(p_action,40)) $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.student_lookup(text), public.log_student(text,text,text) to anon, authenticated;
grant execute on function public.is_admin(), public.is_active_teacher() to authenticated;

-- logo storage
insert into storage.buckets (id, name, public) values ('assets','assets', true) on conflict do nothing;
create policy assets_admin_write on storage.objects for insert to authenticated with check (bucket_id = 'assets' and public.is_admin());
create policy assets_admin_update on storage.objects for update to authenticated using (bucket_id = 'assets' and public.is_admin());

-- trigger functions are not callable via API
revoke execute on function public.guard_profile(), public.handle_new_user() from authenticated, anon, public;

-- upsert needs select; logos are small images only
create policy assets_admin_select on storage.objects for select to authenticated using (bucket_id = 'assets' and public.is_admin());
create policy assets_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'assets' and public.is_admin());
update storage.buckets set file_size_limit = 1048576, allowed_mime_types = array['image/webp','image/png','image/jpeg'] where id = 'assets';
