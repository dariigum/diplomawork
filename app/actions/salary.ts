'use server'

import dbConnect from '@/lib/db/mongoose';
import { Vacancy } from '@/lib/db/schema';

export async function getAvgSalaryForSkills(skills: string[]) {
  if (skills.length === 0) return null;
  
  await dbConnect();
  const allVacancies = await Vacancy.find({});
  
  const matched = allVacancies.filter(v => {
    const vSkills = v.skillsRequired.toLowerCase();
    const hasSalary = typeof v.salaryMin === 'number' || typeof v.salaryMax === 'number';
    return hasSalary && skills.some(s => vSkills.includes(s.toLowerCase()));
  });
  
  if (matched.length === 0) return null;
  
  const avgMin = matched.reduce((acc, v) => acc + (v.salaryMin || 0), 0) / matched.length;
  const avgMax = matched.reduce((acc, v) => acc + (v.salaryMax || 0), 0) / matched.length;
  const totalAvg = (avgMin + avgMax) / 2;
  
  return {
    minSalary: Math.round(avgMin),
    maxSalary: Math.round(avgMax),
    avgSalary: Math.round(totalAvg),
    jobs: matched.length
  };
}
