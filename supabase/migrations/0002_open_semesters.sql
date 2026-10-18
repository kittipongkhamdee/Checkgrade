-- Admin chooses which semesters students may view; lookup only returns those.
alter table public.settings add column open_semesters int[] not null default '{1}';

create or replace function public.student_lookup(p_code text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.settings; res jsonb;
begin
  select * into s from public.settings where id = 1;
  if (s.open_at is not null and now() < s.open_at) or (s.close_at is not null and now() > s.close_at)
     or cardinality(s.open_semesters) = 0 then
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
  where r.student_code = trim(p_code) and rs.academic_year = s.academic_year
    and rs.semester = any(s.open_semesters);
  if res is null then return jsonb_build_object('status','notfound'); end if;
  return jsonb_build_object('status','ok','terms',res);
end $$;
