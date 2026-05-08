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

const POPULAR_SKILLS = [
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "AWS",
  "Docker",
  "MongoDB",
  "TypeScript",
  "Next.js",
  "Git",
  "Kubernetes",
]

const salaryData = [
  { title: "Senior Frontend Developer", avgSalary: 145000, minSalary: 120000, maxSalary: 180000, jobs: 1234, trend: "+8%" },
  { title: "Backend Engineer", avgSalary: 150000, minSalary: 130000, maxSalary: 170000, jobs: 987, trend: "+12%" },
]

function normalizeSkill(skill: string) {
  return skill.toLowerCase().trim()
}

function isValidSkill(skill: string) {
  const normalized = skill.toLowerCase().trim()

  // allow real short skills
  const shortValidSkills = [
    "ui","ux","qa","hr","ai","ml","c","r","go",
    "aws","git","sql","css","html"
  ]

  if (shortValidSkills.includes(normalized)) return true

  // 1. basic length
  if (normalized.length < 2) return false

  // 2. allowed characters
  if (!/^[a-zA-Z0-9.+#\s-]+$/.test(normalized)) return false

  // 3. block aaa, lll
  if (/^(.)\1+$/.test(normalized)) return false

  // 4. block excessive repeating
  if (/([a-z])\1{3,}/.test(normalized)) return false

  const words = normalized.split(/\s+/)

  // min 2 chars per word
  if (words.some(w => w.length < 2)) return false

  // no-vowels check only for longer skills
  const noVowels = /^[^aeiou]+$/
  if (normalized.length > 4 && words.some(w => noVowels.test(w))) return false

  // uniqueness check only for longer words
  for (const w of words) {
    const uniqueChars = new Set(w)
    if (w.length > 4 && uniqueChars.size <= 2) return false
  }

  // banned
  const bannedWords = [
    "dog","cat","hello","test","qwerty","asdf","zzz"
  ]

  if (bannedWords.includes(normalized)) return false

  return true
}

function formatSkill(skill: string) {
  return skill.trim()
}

type Props = {
  userSkills: string[]
  isAuthenticated: boolean
}

export default function SalaryClient({ userSkills, isAuthenticated }: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState("")
  const [skillsError, setSkillsError] = useState<string | null>(null)
  const [isUsingProfile, setIsUsingProfile] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [customStats, setCustomStats] = useState<{
    minSalary: number
    maxSalary: number
    avgSalary: number
    jobs: number
    confidence: "Low" | "Medium" | "High"
    avgScore: number
    isWeakMatch: boolean
    usedSkills: string[]
  } | null>(null)
  const safeUserSkills = userSkills ?? []
  const allSkillOptions = Array.from(
    new Map([...POPULAR_SKILLS, ...safeUserSkills].map((s) => [normalizeSkill(s), formatSkill(s)]))
      .values()
  )

  const hasSkill = (arr: string[], skill: string) =>
    arr.some((s) => normalizeSkill(s) === normalizeSkill(skill))

  const removeSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.toLowerCase() !== skill.toLowerCase()))
  }

  const addSkill = (skill: string) => {
    const normalized = normalizeSkill(skill)
    if (!normalized) return
    if (!isValidSkill(skill)) {
      setSkillsError("Please enter a valid professional skill")
      return
    }
    if (selectedSkills.some((s) => normalizeSkill(s) === normalized)) {
      setSkillsError(null)
      return
    }
    if (selectedSkills.length >= 5) return
    setSelectedSkills((prev) => [...prev, formatSkill(skill)])
    setSkillsError(null)
  }

  useEffect(() => {
    async function fetchStats() {
      if (selectedSkills.length > 0) {
        setIsCalculating(true)
        const stats = await getAvgSalaryForSkills(selectedSkills)
        setCustomStats(stats)
        setIsCalculating(false)
      } else {
        setCustomStats(null)
        setIsCalculating(false)
      }
    }
    fetchStats()
  }, [selectedSkills])

  const toggleSkill = (skill: string) => {
    if (hasSkill(selectedSkills, skill)) {
      removeSkill(skill)
    } else {
      addSkill(skill)
    }
    setSkillsError(null)
    setIsUsingProfile(false)
  }

  const addCustomSkill = () => {
    addSkill(customSkill)
    setIsUsingProfile(false)
    setCustomSkill("")
  }

  const useMyProfile = () => {
    const unique = Array.from(
      new Map<string, string>(
        safeUserSkills
          .map((skill): [string, string] => [normalizeSkill(skill), formatSkill(skill)])
          .filter((entry): entry is [string, string] => Boolean(entry[0]))
      ).values()
    )
    if (unique.length === 0) {
      return
    }
    setSelectedSkills(unique.slice(0, 5))
    setSkillsError(null)
    setIsUsingProfile(true)
  }

  const resetSkills = () => {
    setSelectedSkills([])
    setCustomStats(null)
    setIsUsingProfile(false)
    setCustomSkill("")
    setSkillsError(null)
  }

  const filteredSalaries = salaryData.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Salary Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Research salaries and compensation trends for your career
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Skills Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">Select your skills to see average match salaries from real employer vacancies.</p>
            <div className="flex items-center gap-3 mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useMyProfile}
                disabled={!isAuthenticated || safeUserSkills.length === 0}
              >
                Use my profile
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetSkills}
              >
                Reset
              </Button>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  placeholder="Add a skill..."
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  className="h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomSkill}
                  disabled={selectedSkills.length >= 5}
                >
                  Add
                </Button>
              </div>
            </div>
            {isUsingProfile && (
              <p className="text-xs text-primary mb-2">Using your profile skills</p>
            )}
            {skillsError && (
              <p className="text-sm text-destructive mb-2">{skillsError}</p>
            )}
            <p className="text-xs text-muted-foreground mb-2">
              Select 1–5 skills. {selectedSkills.length}/5 selected.
            </p>
            {selectedSkills.length === 0 && (
              <p className="text-sm text-destructive mb-2">Select at least 1 skill</p>
            )}
            {selectedSkills.length >= 5 && (
              <p className="text-sm text-muted-foreground mb-2">Maximum 5 skills allowed for better accuracy</p>
            )}
            <div className="flex flex-wrap gap-2 mb-6">
              {allSkillOptions.map(skill => (
                <Button
                  key={skill}
                  variant="outline"
                  className={hasSkill(selectedSkills, skill) ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : ""}
                  onClick={() => toggleSkill(skill)}
                  size="sm"
                  disabled={!hasSkill(selectedSkills, skill) && selectedSkills.length >= 5}
                >
                  {skill}
                </Button>
              ))}
            </div>

            {isCalculating && (
              <p className="text-sm text-muted-foreground mb-3">Calculating AI-based salary...</p>
            )}
            {selectedSkills.length > 0 && customStats && (
              <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                {(() => {
                  const usedSkills = customStats.usedSkills || []
                  return (
                    <>
                <h3 className="text-xl font-bold mb-2">Estimated Salary for Selected Skills</h3>
                <p className="text-lg font-semibold">💰 Expected Salary: ${customStats.avgSalary}</p>
                <p className="text-sm mt-1 text-muted-foreground">📊 Range: ${customStats.minSalary} – ${customStats.maxSalary}</p>
                <p className="text-sm mt-1 text-muted-foreground">📌 Based on {customStats.jobs} most relevant job matches</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  🎯 Confidence:{" "}
                  <span
                    className={
                      customStats.confidence === "High"
                        ? "text-green-600"
                        : customStats.confidence === "Medium"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }
                  >
                    {customStats.confidence}
                  </span>
                </p>
                {customStats.isWeakMatch && (
                  <p className="text-red-500 mt-2">
                    ⚠️ No strong matches found. Results may be less accurate.
                  </p>
                )}
                <p className="text-sm mt-1 text-muted-foreground">🤖 AI-powered salary estimation based on semantic matching</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  🔍 Skills used:{" "}
                  {usedSkills.length > 0 && usedSkills.some(s => s.trim().length > 0)
                    ? usedSkills.join(", ")
                    : "—"}
                </p>
                {usedSkills.length < selectedSkills.length && usedSkills.length > 0 && (
                  <p className="text-yellow-600 text-sm mt-1">
                    ⚠️ Some inputs were ignored as non-professional skills
                  </p>
                )}
                {usedSkills.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">
                    ⚠️ No valid skills detected. Results may be inaccurate.
                  </p>
                )}
                    </>
                  )
                })()}
              </div>
            )}
            {selectedSkills.length > 0 && !isCalculating && !customStats && (
              <p className="text-sm text-muted-foreground italic">No matching vacancies found for these skills yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Regular Static view below */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search job titles..."
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
                        <p className="text-sm text-muted-foreground">{item.jobs} open positions</p>
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
