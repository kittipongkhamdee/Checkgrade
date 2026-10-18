export type Theme = "academic" | "pastel" | "mono" | "red";

export type Settings = {
  system_name: string;
  school_name: string;
  logo_url: string | null;
  semester: number;
  academic_year: number;
  open_semesters: number[];
  levels: string[];
  rooms: string[];
  open_at: string | null;
  close_at: string | null;
  theme: Theme;
  primary_color: string | null;
  fx_confetti: boolean;
  fx_sound: boolean;
  fx_spotlight: boolean;
  fx_min_gpa: number;
};

export type Subject = { code: string; name: string; type: string; hours: number | null; credit: number };
export type Score = { code: string; score: string | number | null; grade: string | number | null };

export type StudentRow = {
  id?: string;
  no: number | null;
  student_code: string;
  full_name: string;
  scores: Score[];
  total: number | null;
  percent: number | null;
  gpa: number | null;
  rank: number | null;
  club: string | null;
  traits: string | null;
  thinking: string | null;
  activity: string | null;
  comment: string | null;
};

export type ReportSet = {
  id?: string;
  teacher_id?: string;
  school_name: string;
  level: string;
  room: string;
  semester: number;
  academic_year: number;
  homeroom_teacher: string;
  director: string;
  subjects: Subject[];
};

export type StudentTerm = ReportSet & StudentRow;
