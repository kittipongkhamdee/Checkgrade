-- ==== วางไฟล์นี้ใน Supabase > SQL Editor แล้วกด Run ====
-- บันทึกผลการเรียนแบบ "ทั้งหมดหรือไม่มีเลย" ข้อมูลไม่หายถ้าบันทึกล้มเหลวกลางทาง
create or replace function public.save_report_set(p_set jsonb, p_rows jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_teacher uuid;
begin
  if p_set->>'id' is not null then
    v_id := (p_set->>'id')::uuid;
    update public.report_sets set
      school_name = p_set->>'school_name', level = p_set->>'level', room = p_set->>'room',
      semester = (p_set->>'semester')::int, academic_year = (p_set->>'academic_year')::int,
      homeroom_teacher = p_set->>'homeroom_teacher', director = p_set->>'director',
      subjects = coalesce(p_set->'subjects', subjects)
    where id = v_id returning teacher_id into v_teacher;
    if v_teacher is null then raise exception 'not found'; end if;
  else
    v_teacher := auth.uid();
    insert into public.report_sets (teacher_id, school_name, level, room, semester, academic_year, homeroom_teacher, director, subjects)
    values (v_teacher, p_set->>'school_name', p_set->>'level', p_set->>'room', (p_set->>'semester')::int,
            (p_set->>'academic_year')::int, p_set->>'homeroom_teacher', p_set->>'director', coalesce(p_set->'subjects','[]'))
    on conflict (teacher_id, level, room, semester, academic_year) do update set
      school_name = excluded.school_name, homeroom_teacher = excluded.homeroom_teacher,
      director = excluded.director, subjects = excluded.subjects
    returning id into v_id;
  end if;
  delete from public.student_results where report_set_id = v_id;
  insert into public.student_results (report_set_id, teacher_id, student_code, no, full_name, scores, total, percent, gpa, rank, club, traits, thinking, activity, comment)
  select v_id, v_teacher, r.student_code, r.no, r.full_name, coalesce(r.scores,'[]'), r.total, r.percent, r.gpa, r.rank, r.club, r.traits, r.thinking, r.activity, r.comment
  from jsonb_to_recordset(p_rows) as r(student_code text, no int, full_name text, scores jsonb, total numeric, percent numeric, gpa numeric, rank int,
                                        club text, traits text, thinking text, activity text, comment text)
  where coalesce(r.student_code,'') <> '' and coalesce(r.full_name,'') <> '';
  return v_id;
end $$;
revoke execute on function public.save_report_set(jsonb, jsonb) from anon, public;
grant execute on function public.save_report_set(jsonb, jsonb) to authenticated;

-- ลบประวัติการใช้งานที่เก่ากว่า 180 วัน (เรียกวันละครั้งโดย Vercel)
create or replace function public.keepalive() returns int language sql security definer set search_path = '' as $$
  with d as (delete from public.access_logs where created_at < now() - interval '180 days' returning 1)
  select count(*)::int from d
$$;
revoke execute on function public.keepalive() from public, authenticated;
grant execute on function public.keepalive() to anon;
