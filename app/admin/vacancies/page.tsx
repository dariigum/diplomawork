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
import { Search, Loader2, Link as LinkIcon, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/provider';
import { ImportVacanciesButton } from '@/components/admin/import-vacancies-button';

export default function AdminVacanciesPage() {
  const { t, locale } = useI18n();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCleaning, setIsCleaning] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
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
  }, [search, page, refreshKey]);

  const handleCleanup = async () => {
    if (!window.confirm(t.admin.vacancies.confirmCleanup)) {
      return;
    }

    setIsCleaning(true);
    setProgress(0);

    // Smoothly simulate progress up to 90%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev === null) return null;
        if (prev >= 90) return 90;
        return prev + 10;
      });
    }, 100);

    try {
      const res = await fetch('/api/admin/vacancies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cleanup' }),
      });

      clearInterval(interval);
      setProgress(100);

      const data = await res.json();
      
      // Wait for progress animation to hit 100% smoothly
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (res.ok) {
        const successMsg = locale === 'ru' 
          ? `Успешно удалено рекламных объявлений: ${data.deletedCount}.` 
          : locale === 'kk' 
          ? `Жарнамалық хабарландырулар сәтті жойылды: ${data.deletedCount}.` 
          : `Successfully deleted ${data.deletedCount} ads.`;
        
        // Show pop up alert
        window.alert(data.message || successMsg);
        
        setPage(1);
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(data.error || t.admin.vacancies.cleanupFailed);
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Cleanup error:', error);
      toast.error(t.admin.vacancies.unexpectedError);
    } finally {
      setIsCleaning(false);
      setProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmMsg = locale === 'ru' 
      ? 'Вы уверены, что хотите навсегда удалить эту вакансию? Это действие удалит все отклики и избранные записи кандидатов и не может быть отменено.' 
      : locale === 'kk' 
      ? 'Бұл вакансияны біржолата жойғыңыз келе ме? Бұл әрекет барлық жауаптарды және кандидаттардың таңдалған жазбаларын жояды және оны қайтару мүмкін емес.' 
      : 'Are you sure you want to permanently delete this vacancy? This will remove all applications and saved records, and cannot be undone.';

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/vacancies?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Vacancy deleted successfully.');
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(data.error || 'Failed to delete vacancy');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t.admin.vacancies.unexpectedError);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.admin.vacancies.title}</h1>
          <p className="text-muted-foreground">{t.admin.vacancies.subtitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.admin.vacancies.importVacanciesHint}</p>
        </div>
        <ImportVacanciesButton onImported={() => setRefreshKey((value) => value + 1)} />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          {progress !== null && (
            <div className="w-full bg-secondary/50 h-3 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-destructive transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }} 
              />
              <span className="absolute right-3 top-0 text-[10px] font-bold leading-none py-0.5 text-foreground">
                {progress}%
              </span>
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>{t.admin.vacancies.listTitle}</CardTitle>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="destructive"
                disabled={isCleaning}
                onClick={handleCleanup}
              >
                {isCleaning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="mr-2 h-4 w-4" />
                )}
                {t.admin.vacancies.jobFilterButton}
              </Button>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input 
                  placeholder={t.admin.vacancies.searchPlaceholder} 
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
                <Button type="button" size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.vacancies.colTitle}</TableHead>
                  <TableHead>{t.admin.vacancies.colEmployer}</TableHead>
                  <TableHead>{t.admin.vacancies.colPostedDate}</TableHead>
                  <TableHead>{t.admin.vacancies.colApplications}</TableHead>
                  <TableHead className="text-right">{t.admin.vacancies.colActions}</TableHead>
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
                      {t.admin.vacancies.noVacancies}
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
                        <span className="font-medium">{vacancy.applicationsCount}</span> {t.admin.vacancies.totalApplications}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/jobs/${vacancy._id}`} target="_blank">
                            <LinkIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(vacancy._id)}>
                          <Trash2 className="h-4 w-4" />
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
