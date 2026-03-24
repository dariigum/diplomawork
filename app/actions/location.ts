'use server'

interface CountryCityRecord {
  country: string;
  cities: string[];
}

export async function getCountryCityOptionsAction() {
  const response = await fetch('https://countriesnow.space/api/v0.1/countries', {
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error('Failed to load country and city list');
  }

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];

  return data
    .filter((entry: CountryCityRecord) => entry.country && Array.isArray(entry.cities))
    .map((entry: CountryCityRecord) => ({
      country: entry.country,
      cities: entry.cities.filter(Boolean).sort(),
    }))
    .sort((a: CountryCityRecord, b: CountryCityRecord) => a.country.localeCompare(b.country));
}
