'use server'

import dbConnect from '@/lib/db/mongoose';
import { Vacancy } from '@/lib/db/schema';
import { isValidSalaryAmount } from '@/lib/format-vacancy-salary';

export async function getAvgSalaryForSkills(skills: string[]) {
  if (skills.length === 0) return null;
  
  await dbConnect();
  const allVacancies = await Vacancy.find({});
  
  const matched = allVacancies.filter(v => {
    const vSkills = v.skillsRequired.toLowerCase();
    return skills.some(s => vSkills.includes(s.toLowerCase()));
  });
  
  if (matched.length === 0) return null;

  const withSalary = matched.filter(
    (v) => isValidSalaryAmount(v.salaryMin) || isValidSalaryAmount(v.salaryMax),
  );
  if (withSalary.length === 0) return null;

  const mins = withSalary.map((v) => v.salaryMin).filter(isValidSalaryAmount);
  const maxs = withSalary.map((v) => v.salaryMax).filter(isValidSalaryAmount);

  const avgMin = mins.length > 0 ? mins.reduce((acc, n) => acc + n, 0) / mins.length : 0;
  const avgMax = maxs.length > 0 ? maxs.reduce((acc, n) => acc + n, 0) / maxs.length : 0;
  const totalAvg =
    mins.length > 0 && maxs.length > 0
      ? (avgMin + avgMax) / 2
      : mins.length > 0
        ? avgMin
        : avgMax;
  
  return {
    minSalary: Math.round(avgMin),
    maxSalary: Math.round(avgMax),
    avgSalary: Math.round(totalAvg),
    jobs: matched.length
  };
}
