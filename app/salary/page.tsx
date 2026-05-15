import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Resume } from "@/lib/db/schema";
import SalaryClient from "./SalaryClient";
import { normalizeVacancySkills } from "@/lib/normalize-vacancy-skills";

export const dynamic = "force-dynamic";

export default async function SalaryPage() {
  const session = await getSession();
  
  let userSkills: string[] = [];
  if (session && session.user.role === 'EMPLOYEE') {
    await dbConnect();
    const userResumes = await Resume.find({ userId: session.user.id });
    const skillSet = new Set<string>();
    userResumes.forEach(r => {
      for (const skill of normalizeVacancySkills(r.skills)) {
        skillSet.add(skill);
      }
    });
    userSkills = Array.from(skillSet);
  }

  return <SalaryClient userSkills={userSkills} isAuthenticated={!!session} />;
}
