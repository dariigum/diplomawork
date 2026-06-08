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
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/provider';
import { ImportEmployersButton } from '@/components/admin/import-employers-button';

export default function AdminEmployersPage() {
  const { t, locale } = useI18n();
  const [employers, setEmployers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const limit = 50;

  useEffect(() => {
    async function fetchEmployers() {
      setIsLoading(true);
      try {
        const url = new URL('/api/admin/users', window.location.origin);
        url.searchParams.set('role', 'EMPLOYER');
        if (search) url.searchParams.set('search', search);
        url.searchParams.set('page', page.toString());
        url.searchParams.set('limit', limit.toString());
        
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setEmployers(data.users || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch employers', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    const timeout = setTimeout(fetchEmployers, 300);
    return () => clearTimeout(timeout);
  }, [search, page, refreshKey]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.admin.employers.title}</h1>
          <p className="text-muted-foreground">{t.admin.employers.subtitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.admin.employers.importEmployersHint}</p>
        </div>
        <ImportEmployersButton onImported={() => setRefreshKey((value) => value + 1)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.admin.employers.listTitle}</CardTitle>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input 
                placeholder={t.admin.employers.searchPlaceholder} 
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
                  <TableHead>{t.admin.employers.colCompanyName}</TableHead>
                  <TableHead>{t.admin.employers.colEmail}</TableHead>
                  <TableHead>{t.admin.employers.colVacancies}</TableHead>
                  <TableHead>{t.admin.employers.colJoined}</TableHead>
                  <TableHead className="text-right">{t.admin.employers.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : employers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {t.admin.employers.noEmployers}
                    </TableCell>
                  </TableRow>
                ) : (
                  employers.map((employer) => (
                    <TableRow key={employer._id}>
                      <TableCell className="font-medium">{employer.name}</TableCell>
                      <TableCell>{employer.email}</TableCell>
                      <TableCell>
                        <span className="font-medium">{employer.vacanciesCount}</span> {t.admin.employers.posted}
                      </TableCell>
                      <TableCell>
                        {format(new Date(employer.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => toast.error(t.admin.employers.actionDisabled)}>
                          <XCircle className="h-4 w-4" />
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
            {locale === 'ru' 
              ? `Страница ${page} из ${totalPages === 0 ? 1 : totalPages}` 
              : locale === 'kk' 
              ? `Парақ ${page} / ${totalPages === 0 ? 1 : totalPages}` 
              : `Page ${page} of ${totalPages === 0 ? 1 : totalPages}`}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t.admin.users.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {t.admin.users.next}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
