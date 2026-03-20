import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createVacancyAction } from "@/app/actions/employer";

export default function NewVacancyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Post New Vacancy</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Vacancy Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createVacancyAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Job Title</label>
              <Input id="title" name="title" placeholder="e.g. Senior Frontend Developer" required />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Input id="description" name="description" placeholder="Brief job description" />
            </div>

            <div className="space-y-2">
              <label htmlFor="skillsRequired" className="text-sm font-medium">Required Skills (comma separated)</label>
              <Input id="skillsRequired" name="skillsRequired" placeholder="e.g. React, TypeScript, Next.js" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="salaryMin" className="text-sm font-medium">Minimum Salary ($)</label>
                <Input id="salaryMin" name="salaryMin" type="number" placeholder="50000" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="salaryMax" className="text-sm font-medium">Maximum Salary ($)</label>
                <Input id="salaryMax" name="salaryMax" type="number" placeholder="100000" required />
              </div>
            </div>

            <Button type="submit" className="w-full">Publish Vacancy</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
