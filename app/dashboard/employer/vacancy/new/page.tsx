import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NewVacancyForm } from "@/components/jobs/new-vacancy-form";

export const dynamic = "force-dynamic";

export default async function NewVacancyPage() {
  const session = await getSession();
  if (!session || session.user.role !== "EMPLOYER") redirect("/login");

  return <NewVacancyForm />;
}
