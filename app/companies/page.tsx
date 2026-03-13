"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, MapPin, Users, Briefcase, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/jobs/header"

const companies = [
  {
    id: "techflow",
    name: "TechFlow Inc.",
    logo: "TF",
    industry: "Technology",
    location: "San Francisco, CA",
    employees: "201-500",
    openJobs: 12,
    rating: 4.5,
    description: "Building next-generation web applications and cloud solutions."
  },
  {
    id: "datastream",
    name: "DataStream",
    logo: "DS",
    industry: "Data Analytics",
    location: "New York, NY",
    employees: "51-200",
    openJobs: 8,
    rating: 4.2,
    description: "Transforming raw data into actionable business insights."
  },
  {
    id: "designlab",
    name: "DesignLab",
    logo: "DL",
    industry: "Design",
    location: "Austin, TX",
    employees: "11-50",
    openJobs: 5,
    rating: 4.8,
    description: "Creating beautiful and intuitive user experiences."
  },
  {
    id: "cloudnine",
    name: "CloudNine",
    logo: "C9",
    industry: "Cloud Computing",
    location: "Seattle, WA",
    employees: "501-1000",
    openJobs: 24,
    rating: 4.3,
    description: "Enterprise cloud infrastructure and DevOps solutions."
  },
  {
    id: "innovatetech",
    name: "InnovateTech",
    logo: "IT",
    industry: "SaaS",
    location: "Boston, MA",
    employees: "201-500",
    openJobs: 15,
    rating: 4.1,
    description: "B2B SaaS platform revolutionizing business operations."
  },
  {
    id: "appworks",
    name: "AppWorks",
    logo: "AW",
    industry: "Mobile Development",
    location: "Los Angeles, CA",
    employees: "51-200",
    openJobs: 9,
    rating: 4.6,
    description: "Cross-platform mobile applications for millions of users."
  }
]

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Explore Companies</h1>
          <p className="text-muted-foreground mt-2">
            Discover great places to work and find your dream employer
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search companies by name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Companies Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="h-full hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground flex-shrink-0">
                      {company.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-foreground truncate">{company.name}</h3>
                      <Badge variant="secondary" className="mt-1">{company.industry}</Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                    {company.description}
                  </p>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{company.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{company.employees}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium text-foreground">{company.rating}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary">
                      <Briefcase className="h-4 w-4" />
                      <span className="font-medium">{company.openJobs} open jobs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No companies found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  )
}
