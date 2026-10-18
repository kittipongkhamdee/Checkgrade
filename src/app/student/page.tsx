import { getSettings } from "@/lib/settings";
import StudentApp from "./StudentApp";

export default async function StudentPage() {
  const s = await getSettings();
  return <StudentApp settings={s} />;
}
