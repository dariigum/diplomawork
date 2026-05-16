"use server"

import dbConnect from "@/lib/db/mongoose"
import { Response, Resume, SavedVacancy, Vacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"

export type ToolsHubEmployeeStats = {
  savedVacancies: number
  applications: number
  resumes: number
}

export type ToolsHubEmployerStats = {
  activeVacancies: number
  totalApplicants: number
}

export async function getToolsHubEmployeeStats(userId: string): Promise<ToolsHubEmployeeStats> {
  await dbConnect()
  const [savedVacancies, applications, resumes] = await Promise.all([
    SavedVacancy.countDocuments({ userId }),
    Response.countDocuments({ userId }),
    Resume.countDocuments({ userId }),
  ])
  return { savedVacancies, applications, resumes }
}

export async function getToolsHubEmployerStats(employerId: string): Promise<ToolsHubEmployerStats> {
  await dbConnect()
  const vacancies = await Vacancy.find({ employerId }).select("_id").lean()
  const vacancyIds = vacancies.map((v) => v._id)
  const activeVacancies = vacancies.length
  const totalApplicants =
    vacancyIds.length > 0
      ? await Response.countDocuments({ vacancyId: { $in: vacancyIds } })
      : 0
  return { activeVacancies, totalApplicants }
}

export async function getToolsHubContext() {
  const session = await getSession()
  if (!session?.user) {
    return { role: null as null, employee: null, employer: null, savedJobsCount: 0 }
  }

  if (session.user.role === "EMPLOYEE") {
    await dbConnect()
    const [employee, savedJobsCount] = await Promise.all([
      getToolsHubEmployeeStats(session.user.id),
      SavedVacancy.countDocuments({ userId: session.user.id }),
    ])
    return { role: "EMPLOYEE" as const, employee, employer: null, savedJobsCount }
  }

  if (session.user.role === "EMPLOYER") {
    const employer = await getToolsHubEmployerStats(session.user.id)
    return { role: "EMPLOYER" as const, employee: null, employer, savedJobsCount: 0 }
  }

  return { role: session.user.role, employee: null, employer: null, savedJobsCount: 0 }
}
