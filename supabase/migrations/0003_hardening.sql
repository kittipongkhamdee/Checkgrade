-- Applied via MCP: approval for new teachers, lookup dedupe, RLS initplan, indexes.
alter table public.profiles alter column active set default false;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare first boolean := not exists (select 1 from public.profiles);
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''),
          case when first then 'admin' else 'teacher' end, first);
  return new;
end $$;
revoke execute on function public.handle_new_user() from authenticated, anon, public;

alter policy profiles_self on public.profiles using (id = (select auth.uid()) or (select public.is_admin()));
alter policy profiles_self_upd on public.profiles using (id = (select auth.uid()) or (select public.is_admin()));
alter policy sets_own on public.report_sets
  using ((teacher_id = (select auth.uid()) and (select public.is_active_teacher())) or (select public.is_admin()))
  with check ((teacher_id = (select auth.uid()) and (select public.is_active_teacher())) or (select public.is_admin()));
alter policy results_own on public.student_results
  using ((teacher_id = (select auth.uid()) and (select public.is_active_teacher())) or (select public.is_admin()))
  with check ((teacher_id = (select auth.uid()) and (select public.is_active_teacher())) or (select public.is_admin()));
alter policy logs_teacher_insert on public.access_logs
  with check (role in ('teacher','admin') and actor = (select auth.uid())::text);
create index if not exists student_results_teacher_idx on public.student_results (teacher_id);
create index if not exists student_results_set_idx on public.student_results (report_set_id);
-- student_lookup: distinct on (semester), latest upload wins (see 0003 in DB)
