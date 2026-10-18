import * as XLSX from "xlsx";
import type { ReportSet, Score, StudentRow, Subject } from "./types";

const CODE_RE = /^[ก-ฮ]\d{5}$/;

type Cell = string | number | null;
type Grid = Cell[][];

function grid(ws: XLSX.WorkSheet): Grid {
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, defval: null, raw: true });
}

function clean(v: Cell): string {
  return v == null ? "" : String(v).replace(/\s+/g, " ").trim();
}

/** "#N/A", empty -> null; numeric strings -> numbers; keep marks like ร / มส */
function value(v: Cell): string | number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const s = clean(v);
  if (!s || s.startsWith("#")) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
}

function num(v: Cell): number | null {
  const x = value(v);
  return typeof x === "number" ? x : null;
}

function findRight(g: Grid, label: string): string {
  for (const row of g) {
    const i = row.findIndex((c) => clean(c) === label);
    if (i >= 0) {
      for (let j = i + 1; j < row.length; j++) if (clean(row[j])) return clean(row[j]);
    }
  }
  return "";
}

/** Strip stray parentheses like "นางก)   (นางข" -> "นางก, นางข" */
function tidyNames(s: string) {
  return s
    .split(/[()]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");
}

/** One sheet that looks like a grade sheet. `title` is the sheet heading, shown so the teacher can pick the right one. */
export type ParsedTerm = { sheet: string; title: string; set: ReportSet; students: StudentRow[]; warnings: string[] };

export function parseWorkbook(buf: ArrayBuffer): ParsedTerm[] {
  const wb = XLSX.read(buf, { type: "array" });
  const main = wb.Sheets["หน้าหลัก"] ? grid(wb.Sheets["หน้าหลัก"]) : [];

  // subject catalogue from main sheet: code, name, type, hours, credit
  const catalogue = new Map<string, Omit<Subject, "code">>();
  for (const row of main) {
    row.forEach((c, i) => {
      const code = clean(c);
      if (CODE_RE.test(code) && !catalogue.has(code + "|" + clean(row[i + 1]))) {
        catalogue.set(code + "|" + clean(row[i + 1]), {
          name: clean(row[i + 1]),
          type: clean(row[i + 2]),
          hours: num(row[i + 3]),
          credit: num(row[i + 4]) ?? 0,
        });
      }
    });
  }

  const school = findRight(main, "โรงเรียน");
  const level = findRight(main, "ระดับชั้น");
  const homeroom = tidyNames(findRight(main, "ครูประจำชั้น"));
  const director = findRight(main, "ผู้อำนวยการ");
  const room = findRight(main, "ห้อง");
  const year = Number(findRight(main, "ปีการศึกษา")) || 0;

  const out: ParsedTerm[] = [];
  // Any sheet with a "เลขประจำตัว" header row is a candidate, whatever it is named.
  for (const name of wb.SheetNames) {
    const g = grid(wb.Sheets[name]);
    const warnings: string[] = [];
    const headerIdx = g.findIndex((r) => r.some((c) => clean(c) === "เลขประจำตัว"));
    if (headerIdx < 0) continue;
    const header = g[headerIdx];
    const codeRow = g[headerIdx + 1] ?? [];
    const nameRow = g[headerIdx + 2] ?? [];
    const creditRow = g[headerIdx + 3] ?? [];
    const col = (label: string) => header.findIndex((c) => clean(c) === label);
    const cNo = col("เลขที่"), cId = col("เลขประจำตัว"), cName = col("ชื่อ-สกุล");

    const subjects: (Subject & { col: number })[] = [];
    codeRow.forEach((c, i) => {
      const code = clean(c);
      if (!CODE_RE.test(code)) return;
      const sname = clean(nameRow[i]);
      const info = catalogue.get(code + "|" + sname);
      subjects.push({
        col: i,
        code,
        name: sname || info?.name || code,
        type: info?.type ?? "",
        hours: info?.hours ?? null,
        credit: num(creditRow[i]) ?? info?.credit ?? 0,
      });
    });

    // title e.g. "... ห้อง 2 ภาคเรียนที่ 1  ปีการศึกษา 2569"
    const title = g.slice(0, headerIdx).flat().map(clean).filter((x) => x && !/^\d+$/.test(x)).join(" ");
    const tRoom = title.match(/ห้อง\s*(\S+)/)?.[1];
    const tYear = Number(title.match(/ปีการศึกษา\s*(\d{4})/)?.[1]) || 0;

    const students: StudentRow[] = [];
    for (let r = headerIdx + 5; r < g.length; r++) {
      const row = g[r];
      const code = clean(row[cId]);
      const first = clean(row[cName]);
      if (!code || !first) continue;
      const scores: Score[] = subjects.map((s) => ({ code: s.code, score: value(row[s.col]), grade: value(row[s.col + 1]) }));
      students.push({
        no: num(row[cNo]),
        student_code: code,
        full_name: [first, clean(row[cName + 1])].filter(Boolean).join(" "),
        scores,
        total: num(row[col("รวมคะแนน")]),
        percent: num(row[col("ร้อยละ")]),
        gpa: num(row[col("เกรดเฉลี่ย")]),
        rank: num(row[col("ได้ที่")]),
        club: clean(row[col("ชื่อชุมนุม")]) || null,
        traits: clean(row[col("คุณลักษณะ")]) || null,
        thinking: clean(row[col("คิดวิเคราะห์")]) || null,
        activity: clean(row[col("กิจกรรมพัฒนาผู้เรียน")]) || null,
        comment: clean(row[col("ความเห็นของครูที่ปรึกษา")]) || null,
      });
    }
    const missing = students.filter((s) => s.scores.some((x) => x.grade == null)).length;
    if (missing) warnings.push(`${missing} คนมีบางวิชาไม่มีเกรด (เช่น ร / มส)`);

    const guess = Number(title.match(/ภาคเรียนที่\s*(\d)/)?.[1] ?? name.match(/(\d)\s*$/)?.[1]) || 1;
    out.push({
      sheet: name,
      title,
      set: {
        school_name: school,
        level,
        room: room || tRoom || "",
        semester: guess,
        academic_year: year || tYear,
        homeroom_teacher: homeroom,
        director,
        subjects: subjects.map(({ col: _c, ...s }) => s),
      },
      students,
      warnings,
    });
  }
  return out;
}
