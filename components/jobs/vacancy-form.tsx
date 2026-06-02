"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createVacancyAction, updateVacancyAction } from "@/app/actions/employer"
import { getCountryCityOptionsAction } from "@/app/actions/location"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/provider"

interface CountryRecord {
  country: string
  cities: string[]
}

export type VacancyFormValues = {
  title: string
  description: string
  skillsRequired: string
  salaryMin: number
  salaryMax: number
  employmentType: string
  workMode: "REMOTE" | "ONSITE"
  country: string
  city: string
}

type VacancyFormProps = {
  mode: "create" | "edit"
  vacancyId?: string
  initialValues?: VacancyFormValues
}

export function VacancyForm({ mode, vacancyId, initialValues }: VacancyFormProps) {
  const { t } = useI18n()
  const [locations, setLocations] = useState<CountryRecord[]>([])
  const [country, setCountry] = useState(initialValues?.country || "Kazakhstan")
  const [city, setCity] = useState(initialValues?.city || "")
  const [workMode, setWorkMode] = useState<string>(initialValues?.workMode || "REMOTE")
  const [salaryMin, setSalaryMin] = useState(initialValues?.salaryMin ?? 0)
  const [salaryMax, setSalaryMax] = useState(initialValues?.salaryMax ?? 0)
  const [isLoadingLocations, startLoadingLocations] = useTransition()

  const formAction = mode === "edit" ? updateVacancyAction : createVacancyAction
  const heading = mode === "edit" ? t.dashboard.editVacancy : t.forms.postNewVacancy
  const submitLabel = mode === "edit" ? t.dashboard.saveVacancy : t.forms.publishVacancy

  useEffect(() => {
    startLoadingLocations(async () => {
      try {
        const data = await getCountryCityOptionsAction()
        setLocations(data)
        if (mode === "create") {
          const hasKazakhstan = data.some((entry: CountryRecord) => entry.country === "Kazakhstan")
          const initialCountry = hasKazakhstan ? "Kazakhstan" : data[0]?.country || ""
          setCountry(initialCountry)
        }
      } catch {
        toast.error(t.forms.couldNotLoadLocations)
      }
    })
  }, [mode, t.forms.couldNotLoadLocations])

  const cityOptions = useMemo(() => {
    const selectedCountry = locations.find((entry) => entry.country === country)
    return selectedCountry?.cities || []
  }, [country, locations])

  useEffect(() => {
    if (workMode === "REMOTE") {
      setCity("")
      return
    }

    if (cityOptions.length > 0 && !cityOptions.includes(city)) {
      setCity(cityOptions[0])
    }
  }, [city, cityOptions, workMode])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold">{heading}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.forms.vacancyDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
          action={formAction}
          className="space-y-5"
          onSubmit={(e) => {
            if (salaryMin > salaryMax) {
              e.preventDefault()
              toast.error(t.forms.salaryMinMaxError)
            }
          }}
        >
            {mode === "edit" && vacancyId ? (
              <input type="hidden" name="vacancyId" value={vacancyId} />
            ) : null}

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                {t.forms.jobTitle}
              </label>
              <Input
                id="title"
                name="title"
                placeholder={t.forms.jobTitlePlaceholder}
                defaultValue={initialValues?.title}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t.forms.jobDescription}
              </label>
              <Textarea
                id="description"
                name="description"
                rows={8}
                placeholder={t.forms.jobDescPlaceholder}
                defaultValue={initialValues?.description}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="skillsRequired" className="text-sm font-medium">
                {t.forms.requiredSkills}
              </label>
              <Input
                id="skillsRequired"
                name="skillsRequired"
                placeholder={t.forms.skillsPlaceholder}
                defaultValue={initialValues?.skillsRequired}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="employmentType" className="text-sm font-medium">
                  {t.forms.employmentType}
                </label>
                <select
                  id="employmentType"
                  name="employmentType"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  defaultValue={initialValues?.employmentType || "Full-time"}
                >
                  <option value="Full-time">{t.forms.fullTime}</option>
                  <option value="Part-time">{t.forms.partTime}</option>
                  <option value="Internship">{t.forms.internship}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="workMode" className="text-sm font-medium">
                  {t.forms.workFormat}
                </label>
                <select
                  id="workMode"
                  name="workMode"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                >
                  <option value="REMOTE">{t.forms.remote}</option>
                  <option value="ONSITE">{t.forms.onsite}</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium">
                  {t.forms.country}
                </label>
                <select
                  id="country"
                  name="country"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={isLoadingLocations || locations.length === 0}
                >
                  {locations.map((entry) => (
                    <option key={entry.country} value={entry.country}>
                      {entry.country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium">
                  {t.forms.city}
                </label>
                <select
                  id="city"
                  name="city"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={workMode === "REMOTE" || cityOptions.length === 0}
                  required={workMode === "ONSITE"}
                >
                  {workMode === "REMOTE" ? (
                    <option value="">{t.forms.remoteVacancy}</option>
                  ) : (
                    cityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="salaryMin" className="text-sm font-medium">
                  {t.forms.minSalary}
                </label>
                <Input
                  id="salaryMin"
                  name="salaryMin"
                  type="number"
                  placeholder="50000"
                  value={salaryMin || ''}
                  onChange={(e) => setSalaryMin(Number(e.target.value))}
                  min={0}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="salaryMax" className="text-sm font-medium">
                  {t.forms.maxSalary}
                </label>
                <Input
                  id="salaryMax"
                  name="salaryMax"
                  type="number"
                  placeholder="100000"
                  value={salaryMax || ''}
                  onChange={(e) => setSalaryMax(Number(e.target.value))}
                  min={salaryMin > 0 ? salaryMin : 0}
                  required
                />
                {salaryMin > 0 && salaryMax > 0 && salaryMin > salaryMax ? (
                  <p className="text-xs text-destructive">{t.forms.salaryMinMaxError}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button type="submit" className="flex-1">
                {submitLabel}
              </Button>
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" asChild>
                <Link href="/dashboard/employer?tab=profile">{t.common.cancel}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
