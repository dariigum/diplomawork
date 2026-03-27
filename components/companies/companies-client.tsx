'use client'

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Filter, MapPin, Search, Star, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CompanyCard {
  id: string;
  name: string;
  logoUrl: string;
  industry: string;
  description: string;
  location: string;
  employees: string;
  openJobs: number;
}

interface CompaniesClientProps {
  companies: CompanyCard[];
}

export function CompaniesClient({ companies }: CompaniesClientProps) {
  const [search, setSearch] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const cityOptions = useMemo(() => {
    return [...new Set(companies.map((company) => company.location).filter(Boolean))].sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        company.name.toLowerCase().includes(normalizedSearch);
      const matchesCity =
        selectedCities.length === 0 || selectedCities.includes(company.location);

      return matchesSearch && matchesCity;
    });
  }, [companies, search, selectedCities]);

  const toggleCity = (city: string) => {
    setSelectedCities((current) =>
      current.includes(city)
        ? current.filter((item) => item !== city)
        : [...current, city]
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Explore Companies</h1>
        <p className="text-muted-foreground">
          Discover great places to work and find your dream employer.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies..."
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 md:min-w-40">
              <Filter className="h-4 w-4" />
              Filter by city
              {selectedCities.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedCities.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Cities</h3>
                <p className="text-sm text-muted-foreground">
                  Show companies from selected locations.
                </p>
              </div>
              {selectedCities.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCities([])}>
                  Clear
                </Button>
              )}
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {cityOptions.map((city) => (
                <label key={city} className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={selectedCities.includes(city)}
                    onCheckedChange={() => toggleCity(city)}
                  />
                  <span className="text-sm text-foreground">{city}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCities.map((city) => (
            <Badge
              key={city}
              variant="secondary"
              className="cursor-pointer gap-1 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => toggleCity(city)}
            >
              {city}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {filteredCompanies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-foreground">No companies found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another company name or clear the city filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-semibold text-muted-foreground">
                      {company.logoUrl}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-foreground">
                        {company.name}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        {company.industry}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                    {company.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{company.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{company.employees}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="font-medium text-foreground">4.8</span>
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
      )}
    </div>
  );
}
