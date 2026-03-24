import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createResumeAction } from "@/app/actions/employee";

export default function NewResumePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Add New Resume</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Resume Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createResumeAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Job Title</label>
              <Input id="title" name="title" placeholder="e.g. Senior Frontend Developer" required />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="skills" className="text-sm font-medium">Skills (comma separated)</label>
              <Input id="skills" name="skills" placeholder="e.g. React, TypeScript, Next.js" required />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="experience" className="text-sm font-medium">Experience</label>
              <Input id="experience" name="experience" placeholder="e.g. 5 years at Tech Corp" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="education" className="text-sm font-medium">Education</label>
              <Input id="education" name="education" placeholder="e.g. BSc Computer Science" />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvLink" className="text-sm font-medium">CV Link (e.g. Google Drive)</label>
              <Input id="cvLink" name="cvLink" placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <label htmlFor="cvFile" className="text-sm font-medium">Upload CV (PDF)</label>
              <Input id="cvFile" name="cvFile" type="file" accept=".pdf" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                <Input id="phone" name="phone" placeholder="+1234567890" />
              </div>
              <div className="space-y-2">
                <label htmlFor="telegram" className="text-sm font-medium">Telegram</label>
                <Input id="telegram" name="telegram" placeholder="@username" />
              </div>
              <div className="space-y-2">
                <label htmlFor="linkedin" className="text-sm font-medium">LinkedIn</label>
                <Input id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/username" />
              </div>
              <div className="space-y-2">
                <label htmlFor="github" className="text-sm font-medium">GitHub</label>
                <Input id="github" name="github" placeholder="https://github.com/username" />
              </div>
            </div>

            <Button type="submit" className="w-full">Create Resume</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
