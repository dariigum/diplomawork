"use client"

import { useState, useEffect } from "react"
import { Search, TrendingUp, DollarSign, MapPin, Briefcase } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Header } from "@/components/jobs/header"
import { getAvgSalaryForSkills } from "@/app/actions/salary"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/provider"

const salaryData = [
  { title: "Senior Frontend Developer", avgSalary: 145000, minSalary: 120000, maxSalary: 180000, jobs: 1234, trend: "+8%" },
  { title: "Backend Engineer", avgSalary: 150000, minSalary: 130000, maxSalary: 170000, jobs: 987, trend: "+12%" },
]

export default function SalaryClient({ userSkills, isAuthenticated }: { userSkills: string[], isAuthenticated: boolean }) {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customStats, setCustomStats] = useState<{ minSalary: number, maxSalary: number, avgSalary: number, jobs: number } | null>(null)

  useEffect(() => {
    async function fetchStats() {
      if (selectedSkills.length > 0) {
        const stats = await getAvgSalaryForSkills(selectedSkills)
        setCustomStats(stats)
      } else {
        setCustomStats(null)
      }
    }
    fetchStats()
  }, [selectedSkills])

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  const filteredSalaries = salaryData.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t.salary.salaryExplorer}</h1>
          <p className="text-muted-foreground mt-2">
            {t.salary.researchSalaries}
          </p>
        </div>

        {userSkills.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t.salary.yourSkillsAnalysis}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">{t.salary.selectSkills}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {userSkills.map(skill => (
                  <Button 
                    key={skill} 
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    onClick={() => toggleSkill(skill)}
                    size="sm"
                  >
                    {skill}
                  </Button>
                ))}
              </div>

              {selectedSkills.length > 0 && customStats && (
                <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                  <h3 className="text-xl font-bold mb-2">{t.salary.estimatedSalary}</h3>
                  <div className="flex items-center gap-4 text-lg">
                    <span className="text-muted-foreground">${customStats.minSalary}</span>
                    <span className="font-bold text-primary text-2xl">${customStats.avgSalary}</span>
                    <span className="text-muted-foreground">${customStats.maxSalary}</span>
                  </div>
                  <p className="text-sm mt-2 text-muted-foreground">{t.salary.basedOnVacancies.replace('.', ` ${customStats.jobs} matching vacancies.`)}</p>
                </div>
              )}
              {selectedSkills.length > 0 && !customStats && (
                <p className="text-sm text-muted-foreground italic">{t.salary.noMatchingVacancies}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Regular Static view below */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t.salary.searchJobTitles}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            <div className="space-y-4">
              {filteredSalaries.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.jobs} {t.salary.openPositions}</p>
                      </div>
                      <Badge variant="secondary" className="text-accent bg-accent/10">
                        {item.trend}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                       <span className="text-muted-foreground">${item.minSalary}</span>
                       <span className="font-semibold text-primary">${item.avgSalary}</span>
                       <span className="text-muted-foreground">${item.maxSalary}</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
