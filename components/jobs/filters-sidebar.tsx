"use client"

import { useState } from "react"
import { Search, MapPin, Briefcase, DollarSign, Clock, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface FiltersSidebarProps {
  onFiltersChange: (filters: FilterState) => void
  filters: FilterState
  locationOptions?: string[]
  employmentTypeOptions?: string[]
  experienceLevelOptions?: string[]
}

export interface FilterState {
  search: string
  locations: string[]
  employmentTypes: string[]
  experienceLevels: string[]
  salaryRange: [number, number]
  remoteOnly: boolean
}

export function FiltersSidebar({ onFiltersChange, filters, locationOptions = [], employmentTypeOptions = [], experienceLevelOptions = [] }: FiltersSidebarProps) {
  const activeFiltersCount = 
    filters.locations.length + 
    filters.employmentTypes.length + 
    filters.experienceLevels.length + 
    (filters.remoteOnly ? 1 : 0) +
    (filters.salaryRange[0] > 0 || filters.salaryRange[1] < 200 ? 1 : 0)

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      locations: [],
      employmentTypes: [],
      experienceLevels: [],
      salaryRange: [0, 200],
      remoteOnly: false
    })
  }

  const toggleArrayFilter = (
    key: "locations" | "employmentTypes" | "experienceLevels",
    value: string
  ) => {
    const currentArray = filters[key]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value]
    onFiltersChange({ ...filters, [key]: newArray })
  }

  return (
    <aside className="w-full lg:w-80 bg-card rounded-xl border border-border p-5 h-fit sticky top-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-lg text-foreground">Catalog filters</h2>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-5 pb-5 border-b border-border">
          {filters.locations.map((loc) => (
            <Badge
              key={loc}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => toggleArrayFilter("locations", loc)}
            >
              {loc}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {filters.employmentTypes.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => toggleArrayFilter("employmentTypes", type)}
            >
              {type}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          {filters.remoteOnly && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => onFiltersChange({ ...filters, remoteOnly: false })}
            >
              Remote
              <X className="h-3 w-3 ml-1" />
            </Badge>
          )}
        </div>
      )}

      <Accordion type="multiple" defaultValue={["location", "employment", "salary"]} className="space-y-2">
        {/* Location Filter */}
        <AccordionItem value="location" className="border-b border-border">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">Location</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="space-y-3">
              {locationOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No locations available.</p>
              ) : locationOptions.map((location) => (
                <div key={location} className="flex items-center gap-3">
                  <Checkbox
                    id={`location-${location}`}
                    checked={filters.locations.includes(location)}
                    onCheckedChange={() => toggleArrayFilter("locations", location)}
                  />
                  <Label
                    htmlFor={`location-${location}`}
                    className="text-sm text-foreground/80 cursor-pointer flex-1"
                  >
                    {location}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Employment Type Filter */}
        <AccordionItem value="employment" className="border-b border-border">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-medium">Employment Type</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="space-y-3">
              {employmentTypeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No types available.</p>
              ) : employmentTypeOptions.map((type) => (
                <div key={type} className="flex items-center gap-3">
                  <Checkbox
                    id={`employment-${type}`}
                    checked={filters.employmentTypes.includes(type)}
                    onCheckedChange={() => toggleArrayFilter("employmentTypes", type)}
                  />
                  <Label
                    htmlFor={`employment-${type}`}
                    className="text-sm text-foreground/80 cursor-pointer flex-1"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Experience Level Filter */}
        <AccordionItem value="experience" className="border-b border-border">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Experience</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="space-y-3">
              {experienceLevelOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No levels available.</p>
              ) : experienceLevelOptions.map((level) => (
                <div key={level} className="flex items-center gap-3">
                  <Checkbox
                    id={`experience-${level}`}
                    checked={filters.experienceLevels.includes(level)}
                    onCheckedChange={() => toggleArrayFilter("experienceLevels", level)}
                  />
                  <Label
                    htmlFor={`experience-${level}`}
                    className="text-sm text-foreground/80 cursor-pointer flex-1"
                  >
                    {level}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Salary Range Filter */}
        <AccordionItem value="salary" className="border-none">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-medium">Salary Range</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="space-y-4">
              <Slider
                value={filters.salaryRange}
                onValueChange={(value) =>
                  onFiltersChange({ ...filters, salaryRange: value as [number, number] })
                }
                max={200}
                min={0}
                step={10}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>${filters.salaryRange[0]}k</span>
                <span>${filters.salaryRange[1]}k+</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Remote Only Toggle */}
      <div className="mt-5 pt-5 border-t border-border">
        <div className="flex items-center gap-3">
          <Checkbox
            id="remote-only"
            checked={filters.remoteOnly}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, remoteOnly: checked as boolean })
            }
          />
          <Label htmlFor="remote-only" className="cursor-pointer font-medium">
            Remote jobs only
          </Label>
        </div>
      </div>
    </aside>
  )
}
