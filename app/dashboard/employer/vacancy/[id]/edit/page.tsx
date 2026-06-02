import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import dbConnect from "@/lib/db/mongoose"
import { Vacancy } from "@/lib/db/schema"
import { VacancyForm, type VacancyFormValues } from "@/components/jobs/vacancy-form"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditVacancyPage({ params }: PageProps) {
  const { id } = await params
  const session = await getSession()
  if (!session || session.user.role !== "EMPLOYER") redirect("/login")

  await dbConnect()
  const vacancy = await Vacancy.findOne({ _id: id, employerId: session.user.id }).lean()
  if (!vacancy) notFound()

  const initialValues: VacancyFormValues = {
    title: vacancy.title,
    description: vacancy.description,
    skillsRequired: vacancy.skillsRequired,
    salaryMin: vacancy.salaryMin,
    salaryMax: vacancy.salaryMax,
    employmentType: vacancy.employmentType || "Full-time",
    workMode: (vacancy.workMode as "REMOTE" | "ONSITE") || "REMOTE",
    country: vacancy.country || "Kazakhstan",
    city: vacancy.city || "",
  }

  return <VacancyForm mode="edit" vacancyId={id} initialValues={initialValues} />
}
