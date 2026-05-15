'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, Link as LinkIcon, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AdminVacanciesPage() {
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  useEffect(() => {
    async function fetchVacancies() {
      setIsLoading(true);
      try {
        const url = new URL('/api/admin/vacancies', window.location.origin);
        if (search) url.searchParams.set('search', search);
        url.searchParams.set('page', page.toString());
        url.searchParams.set('limit', limit.toString());
        
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setVacancies(data.vacancies || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch vacancies', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    const timeout = setTimeout(fetchVacancies, 300);
    return () => clearTimeout(timeout);
  }, [search, page]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vacancy Moderation</h1>
        <p className="text-muted-foreground">Monitor and manage all job postings.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vacancies List</CardTitle>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input 
                placeholder="Search by title or description..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <Button type="button" size="icon" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Posted Date</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : vacancies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No vacancies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  vacancies.map((vacancy) => (
                    <TableRow key={vacancy._id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {vacancy.title}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{vacancy.employerName}</span>
                          <span className="text-xs text-muted-foreground">{vacancy.employerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(vacancy.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{vacancy.applicationsCount}</span> total
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/jobs/${vacancy._id}`} target="_blank">
                            <LinkIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toast.info('Archive functionality coming soon')}>
                          <Archive className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages === 0 ? 1 : totalPages}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
