import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/db/mongoose";
import { Resume } from "@/lib/db/schema";
import SalaryClient from "./SalaryClient";

export const dynamic = "force-dynamic";

export default async function SalaryPage() {
  const session = await getSession();
  
  let userSkills: string[] = [];
  if (session && session.user.role === 'EMPLOYEE') {
    await dbConnect();
    const userResumes = await Resume.find({ userId: session.user.id });
    const skillSet = new Set<string>();
    userResumes.forEach(r => {
      if (r.skills) {
        r.skills.split(',').map(s => s.trim()).filter(Boolean).forEach(s => skillSet.add(s));
      }
    });
    userSkills = Array.from(skillSet);
  }

  return <SalaryClient userSkills={userSkills} isAuthenticated={!!session} />;
}
