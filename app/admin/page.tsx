'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, Briefcase, BrainCircuit, Activity, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useI18n } from '@/lib/i18n/provider';

export default function AdminDashboard() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!stats) return <div>{t.admin.overview.failedToLoad}</div>;

  const performanceRows = [
    {
      label: t.admin.overview.googlePingLatency,
      value:
        typeof stats.performance?.googleLatencyMs === 'number'
          ? `${stats.performance.googleLatencyMs} ms`
          : null,
    },
    {
      label: t.admin.overview.recommendationProbeTime,
      value:
        typeof stats.performance?.recommendationResponseTimeMs === 'number'
          ? `${stats.performance.recommendationResponseTimeMs} ms`
          : null,
    },
  ].filter((row) => row.value !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.admin.overview.title}</h1>
        <p className="text-muted-foreground">{t.admin.overview.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin.overview.totalUsers}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {locale === 'ru'
                ? `${stats.system?.totalEmployees || 0} соискателей, ${stats.system?.totalEmployers || 0} работодателей`
                : locale === 'kk'
                ? `${stats.system?.totalEmployees || 0} жұмыс іздеуші, ${stats.system?.totalEmployers || 0} жұмыс беруші`
                : `${stats.system?.totalEmployees || 0} employees, ${stats.system?.totalEmployers || 0} employers`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin.overview.totalVacancies}</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system?.totalVacancies || 0}</div>
            <p className="text-xs text-muted-foreground">{t.admin.overview.acrossPlatform}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin.overview.totalApplications}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system?.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground">{t.admin.overview.applicationsSubmitted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin.overview.aiEmbeddings}</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ai?.totalEmbeddingsGenerated || 0}</div>
            <p className="text-xs text-muted-foreground">{t.admin.overview.generatedForResumesVacancies}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t.admin.overview.activityOverview}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      borderColor: 'var(--border)',
                      borderRadius: 'var(--radius)',
                    }}
                    labelStyle={{ color: 'var(--muted-foreground)' }}
                    itemStyle={{ color: 'var(--popover-foreground)' }}
                  />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="applications" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t.admin.overview.systemPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceRows.length > 0 ? (
                performanceRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{row.label}</span>
                    <span className="text-sm text-muted-foreground">{row.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.admin.overview.noMeasuredPerformanceMetrics}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
