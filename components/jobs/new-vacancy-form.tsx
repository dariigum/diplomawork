"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createVacancyAction } from "@/app/actions/employer"
import { getCountryCityOptionsAction } from "@/app/actions/location"
import { toast } from "sonner"

interface CountryRecord {
  country: string
  cities: string[]
}

export function NewVacancyForm() {
  const [locations, setLocations] = useState<CountryRecord[]>([])
  const [country, setCountry] = useState("Kazakhstan")
  const [city, setCity] = useState("")
  const [workMode, setWorkMode] = useState("REMOTE")
  const [isLoadingLocations, startLoadingLocations] = useTransition()

  useEffect(() => {
    startLoadingLocations(async () => {
      try {
        const data = await getCountryCityOptionsAction()
        setLocations(data)
        const hasKazakhstan = data.some((entry: CountryRecord) => entry.country === "Kazakhstan")
        const initialCountry = hasKazakhstan ? "Kazakhstan" : data[0]?.country || ""
        setCountry(initialCountry)
      } catch (error) {
        toast.error("Could not load country and city list.")
      }
    })
  }, [])

  const cityOptions = useMemo(() => {
    const selectedCountry = locations.find((entry) => entry.country === country)
    return selectedCountry?.cities || []
  }, [country, locations])

  useEffect(() => {
    if (workMode === "REMOTE") {
      setCity("")
      return
    }

    if (!cityOptions.includes(city)) {
      setCity(cityOptions[0] || "")
    }
  }, [city, cityOptions, workMode])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Post New Vacancy</h1>

      <Card>
        <CardHeader>
          <CardTitle>Vacancy Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createVacancyAction} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Job Title</label>
              <Input id="title" name="title" placeholder="e.g. Senior Frontend Developer" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Job Description</label>
              <Textarea
                id="description"
                name="description"
                rows={8}
                placeholder={"You can write with paragraphs, bullet points and numbering.\n\nExample:\n1. Build new features\n2. Review PRs\n- React\n- TypeScript"}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="skillsRequired" className="text-sm font-medium">Required Skills</label>
              <Input id="skillsRequired" name="skillsRequired" placeholder="e.g. React, TypeScript, Next.js" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="employmentType" className="text-sm font-medium">Employment Type</label>
                <select
                  id="employmentType"
                  name="employmentType"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  defaultValue="Full-time"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="workMode" className="text-sm font-medium">Work Format</label>
                <select
                  id="workMode"
                  name="workMode"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                >
                  <option value="REMOTE">Remote</option>
                  <option value="ONSITE">In selected city</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium">Country</label>
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
                <label htmlFor="city" className="text-sm font-medium">City</label>
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
                    <option value="">Remote vacancy</option>
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
                <label htmlFor="salaryMin" className="text-sm font-medium">Minimum Salary (KZT, optional)</label>
                <Input id="salaryMin" name="salaryMin" type="number" placeholder="50000" />
              </div>
              <div className="space-y-2">
                <label htmlFor="salaryMax" className="text-sm font-medium">Maximum Salary (KZT, optional)</label>
                <Input id="salaryMax" name="salaryMax" type="number" placeholder="100000" />
              </div>
            </div>

            <Button type="submit" className="w-full">Publish Vacancy</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
