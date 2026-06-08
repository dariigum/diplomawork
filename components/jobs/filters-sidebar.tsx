"use client"

import { Search, MapPin, Briefcase, DollarSign, Clock, X, ChevronDown } from "lucide-react"
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
import { useI18n } from "@/lib/i18n/provider"
import { useState } from "react"
import { cn } from "@/lib/utils"

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

const FILTER_OPTION_ROW_CLASS = "flex min-w-0 items-center gap-3"
const FILTER_LABEL_CLASS =
  "min-w-0 flex-1 truncate text-sm text-foreground/80 cursor-pointer"
const ACTIVE_FILTER_BADGE_CLASS =
  "max-w-full min-w-0 shrink overflow-hidden cursor-pointer transition-colors hover:bg-destructive hover:text-destructive-foreground"

function ActiveFilterBadge({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <Badge
      variant="secondary"
      className={ACTIVE_FILTER_BADGE_CLASS}
      title={label}
      onClick={onRemove}
    >
      <span className="min-w-0 truncate">{label}</span>
      <X className="ml-1 h-3 w-3 shrink-0" aria-hidden />
    </Badge>
  )
}

function FilterOptionRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: () => void
}) {
  return (
    <div className={FILTER_OPTION_ROW_CLASS}>
      <Checkbox
        id={id}
        className="shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label htmlFor={id} className={FILTER_LABEL_CLASS} title={label}>
        {label}
      </Label>
    </div>
  )
}

export function FiltersSidebar({
  onFiltersChange,
  filters,
  locationOptions = [],
  employmentTypeOptions = [],
  experienceLevelOptions = [],
}: FiltersSidebarProps) {
  const { t } = useI18n()
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)

  const toggleFiltersCollapsed = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return
    setFiltersCollapsed((prev) => !prev)
  }

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
      remoteOnly: false,
    })
  }

  const toggleArrayFilter = (
    key: "locations" | "employmentTypes" | "experienceLevels",
    value: string,
  ) => {
    const currentArray = filters[key]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value]
    onFiltersChange({ ...filters, [key]: newArray })
  }

  return (
    <aside className="sticky top-6 h-fit w-full min-w-0 max-w-full rounded-xl border border-border bg-card p-5 lg:w-80">
      <div className="mb-5 flex min-w-0 items-center justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left lg:cursor-default"
          onClick={toggleFiltersCollapsed}
          aria-expanded={!filtersCollapsed}
          aria-controls="filters-panel-content"
        >
          <h2 className="min-w-0 truncate font-semibold text-lg text-foreground">{t.filters.filters}</h2>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform lg:hidden",
              filtersCollapsed && "-rotate-90",
            )}
            aria-hidden
          />
        </button>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 shrink-0 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-4 w-4" aria-hidden />
            {t.filters.clearAll}
          </Button>
        )}
      </div>

      <div
        id="filters-panel-content"
        className={cn(filtersCollapsed ? "hidden lg:block" : "block")}
      >
      {/* Search */}
      <div className="relative mb-5 min-w-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.filters.searchJobs}
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="border-0 bg-muted/50 pl-9 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="mb-5 flex min-w-0 flex-wrap gap-2 border-b border-border pb-5">
          {filters.locations.map((loc) => (
            <ActiveFilterBadge
              key={loc}
              label={loc}
              onRemove={() => toggleArrayFilter("locations", loc)}
            />
          ))}
          {filters.employmentTypes.map((type) => (
            <ActiveFilterBadge
              key={type}
              label={type}
              onRemove={() => toggleArrayFilter("employmentTypes", type)}
            />
          ))}
          {filters.remoteOnly && (
            <ActiveFilterBadge
              label={t.filters.remote}
              onRemove={() => onFiltersChange({ ...filters, remoteOnly: false })}
            />
          )}
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={["location", "employment", "salary"]}
        className="min-w-0 space-y-2"
      >
        {/* Location Filter */}
        <AccordionItem value="location" className="border-b border-border">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="font-medium">{t.filters.location}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="min-w-0 space-y-3">
              {locationOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.filters.noLocations}</p>
              ) : (
                locationOptions.map((location) => (
                  <FilterOptionRow
                    key={location}
                    id={`location-${location}`}
                    label={location}
                    checked={filters.locations.includes(location)}
                    onCheckedChange={() => toggleArrayFilter("locations", location)}
                  />
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Employment Type Filter */}
        <AccordionItem value="employment" className="border-b border-border">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex min-w-0 items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="font-medium">{t.filters.employmentType}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="min-w-0 space-y-3">
              {employmentTypeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.filters.noTypes}</p>
              ) : (
                employmentTypeOptions.map((type) => (
                  <FilterOptionRow
                    key={type}
                    id={`employment-${type}`}
                    label={type}
                    checked={filters.employmentTypes.includes(type)}
                    onCheckedChange={() => toggleArrayFilter("employmentTypes", type)}
                  />
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Experience Level Filter */}
        <AccordionItem value="experience" className="border-b border-border">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex min-w-0 items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="font-medium">{t.filters.experience}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="min-w-0 space-y-3">
              {experienceLevelOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.filters.noLevels}</p>
              ) : (
                experienceLevelOptions.map((level) => (
                  <FilterOptionRow
                    key={level}
                    id={`experience-${level}`}
                    label={level}
                    checked={filters.experienceLevels.includes(level)}
                    onCheckedChange={() => toggleArrayFilter("experienceLevels", level)}
                  />
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Salary Range Filter */}
        <AccordionItem value="salary" className="border-none">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex min-w-0 items-center gap-2">
              <DollarSign className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="font-medium">{t.filters.salaryRange}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="min-w-0 space-y-4">
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
      <div className="mt-5 border-t border-border pt-5">
        <div className={FILTER_OPTION_ROW_CLASS}>
          <Checkbox
            id="remote-only"
            className="shrink-0"
            checked={filters.remoteOnly}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, remoteOnly: checked as boolean })
            }
          />
          <Label htmlFor="remote-only" className="min-w-0 flex-1 cursor-pointer font-medium">
            {t.filters.remoteJobsOnly}
          </Label>
        </div>
      </div>
      </div>
    </aside>
  )
}
