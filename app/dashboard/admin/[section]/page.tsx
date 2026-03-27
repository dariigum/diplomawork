import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { deleteAdminEntityAction } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Article, Response, Resume, SavedVacancy, User, Vacancy } from '@/lib/db/schema';

const sectionConfig = {
  employees: {
    title: 'Employees',
    description: 'Manage job seekers and remove accounts when needed.',
  },
  employers: {
    title: 'Employers',
    description: 'Review employer accounts and remove companies from the platform.',
  },
  resumes: {
    title: 'Resumes',
    description: 'Inspect uploaded resumes and remove outdated or invalid records.',
  },
  vacancies: {
    title: 'Vacancies',
    description: 'Review published vacancies and remove problematic postings.',
  },
  responses: {
    title: 'Responses',
    description: 'Inspect applications submitted for vacancies.',
  },
  'saved-vacancies': {
    title: 'Saved Vacancies',
    description: 'Review saved jobs across employee accounts.',
  },
  articles: {
    title: 'Articles',
    description: 'Inspect resource articles stored in the database.',
  },
} as const;

type AdminSection = keyof typeof sectionConfig;

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString();
}

function DeleteEntityForm({ id, type }: { id: string; type: string }) {
  return (
    <form action={deleteAdminEntityAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="type" value={type} />
      <Button variant="destructive" size="sm" type="submit">
        Delete
      </Button>
    </form>
  );
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const session = await getSession();
  if (!session || session.user.role !== 'ADMIN') return null;

  const { section } = await params;
  if (!(section in sectionConfig)) {
    notFound();
  }

  const currentSection = section as AdminSection;

  await dbConnect();

  if (currentSection === 'employees') {
    const employees = (await User.find({ role: 'EMPLOYEE' }).sort({ createdAt: -1 }).lean()) as any[];

    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/dashboard/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to admin panel
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{sectionConfig.employees.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sectionConfig.employees.description}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee._id.toString()}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.username || '—'}</TableCell>
                      <TableCell>{formatDate(employee.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteEntityForm id={employee._id.toString()} type="employee" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (currentSection === 'employers') {
    const employers = (await User.find({ role: 'EMPLOYER' }).sort({ createdAt: -1 }).lean()) as any[];

    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/dashboard/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to admin panel
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{sectionConfig.employers.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sectionConfig.employers.description}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employer Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {employers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employers found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employers.map((employer) => (
                    <TableRow key={employer._id.toString()}>
                      <TableCell className="font-medium">{employer.name}</TableCell>
                      <TableCell>{employer.email}</TableCell>
                      <TableCell>{employer.location || '—'}</TableCell>
                      <TableCell>
                        {employer.website ? (
                          <a
                            href={employer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            Open
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteEntityForm id={employer._id.toString()} type="employer" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (currentSection === 'resumes') {
    const resumes = (await Resume.find({})
      .populate('userId', 'name email username')
      .sort({ createdAt: -1 })
      .lean()) as any[];

    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/dashboard/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to admin panel
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{sectionConfig.resumes.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sectionConfig.resumes.description}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            {resumes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resumes found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumes.map((resume) => (
                    <TableRow key={resume._id.toString()}>
                      <TableCell className="font-medium">{resume.title}</TableCell>
                      <TableCell>
                        {resume.userId?.name || 'Unknown'}
                        <p className="text-xs text-muted-foreground">{resume.userId?.email || '—'}</p>
                      </TableCell>
                      <TableCell className="max-w-[22rem] whitespace-normal text-sm text-muted-foreground">
                        {resume.skills}
                      </TableCell>
                      <TableCell>{formatDate(resume.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteEntityForm id={resume._id.toString()} type="resume" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (currentSection === 'vacancies') {
    const vacancies = (await Vacancy.find({})
      .populate('employerId', 'name email')
      .sort({ createdAt: -1 })
      .lean()) as any[];

    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/dashboard/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to admin panel
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{sectionConfig.vacancies.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sectionConfig.vacancies.description}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Vacancies</CardTitle>
          </CardHeader>
          <CardContent>
            {vacancies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vacancies found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacancies.map((vacancy) => (
                    <TableRow key={vacancy._id.toString()}>
                      <TableCell className="max-w-[22rem] whitespace-normal font-medium">
                        {vacancy.title}
                      </TableCell>
                      <TableCell>
                        {vacancy.employerId?.name || 'Unknown'}
                        <p className="text-xs text-muted-foreground">
                          {vacancy.employerId?.email || '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        ${vacancy.salaryMin} - ${vacancy.salaryMax}
                      </TableCell>
                      <TableCell>{formatDate(vacancy.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/jobs/${vacancy._id.toString()}`}>Open</Link>
                          </Button>
                          <DeleteEntityForm id={vacancy._id.toString()} type="vacancy" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (currentSection === 'responses') {
    const responses = (await Response.find({})
      .populate('userId', 'name email')
      .populate('vacancyId', 'title')
      .populate('resumeId', 'title')
      .sort({ createdAt: -1 })
      .lean()) as any[];

    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/dashboard/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to admin panel
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{sectionConfig.responses.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sectionConfig.responses.description}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No responses found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Vacancy</TableHead>
                    <TableHead>Resume</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response._id.toString()}>
                      <TableCell>
                        {response.userId?.name || 'Unknown'}
                        <p className="text-xs text-muted-foreground">{response.userId?.email || '—'}</p>
                      </TableCell>
                      <TableCell className="max-w-[20rem] whitespace-normal">
                        {response.vacancyId?.title || 'Deleted vacancy'}
                      </TableCell>
                      <TableCell>{response.resumeId?.title || 'Deleted resume'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{response.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(response.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteEntityForm id={response._id.toString()} type="response" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (currentSection === 'saved-vacancies') {
    const savedVacancies = (await SavedVacancy.find({})
      .populate('userId', 'name email')
      .populate('vacancyId', 'title')
      .lean()) as any[];

    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="w-fit">
            <Link href="/dashboard/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to admin panel
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{sectionConfig['saved-vacancies'].title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sectionConfig['saved-vacancies'].description}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saved Vacancy Records</CardTitle>
          </CardHeader>
          <CardContent>
            {savedVacancies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved vacancies found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Vacancy</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedVacancies.map((savedVacancy) => (
                    <TableRow key={savedVacancy._id.toString()}>
                      <TableCell>
                        {savedVacancy.userId?.name || 'Unknown'}
                        <p className="text-xs text-muted-foreground">
                          {savedVacancy.userId?.email || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[22rem] whitespace-normal">
                        {savedVacancy.vacancyId?.title || 'Deleted vacancy'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteEntityForm
                            id={savedVacancy._id.toString()}
                            type="saved-vacancy"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    );
  }

  const articles = (await Article.find({}).sort({ createdAt: -1 }).lean()) as any[];

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to admin panel
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{sectionConfig.articles.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sectionConfig.articles.description}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Articles</CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article._id.toString()}>
                    <TableCell className="max-w-[24rem] whitespace-normal font-medium">
                      {article.title}
                    </TableCell>
                    <TableCell>{article.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.language}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(article.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DeleteEntityForm id={article._id.toString()} type="article" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
