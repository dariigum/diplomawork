'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Server, Database, RefreshCw, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS, kk } from 'date-fns/locale';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/provider';

export default function AdminMlMonitoringPage() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/ml-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch ML status', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !status) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const dateLocale = locale === 'ru' ? ru : locale === 'kk' ? kk : enUS;
  const storage = status?.embeddingsStorage;
  const hasEmbeddings = (storage?.totalEmbeddings ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.admin.mlMonitoring.title}</h1>
          <p className="text-muted-foreground">{t.admin.mlMonitoring.subtitle}</p>
        </div>
        <Button onClick={() => { fetchStatus(); toast.success(t.admin.mlMonitoring.statusRefreshed); }} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t.admin.mlMonitoring.refresh}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* FastAPI ML Service */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Server className="mr-2 h-4 w-4 text-primary" />
              {t.admin.mlMonitoring.fastApi}
            </CardTitle>
            <Badge variant={status?.status === 'online' ? 'default' : 'destructive'} className={status?.status === 'online' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}>
              {status?.status === 'online' ? t.admin.mlMonitoring.online : t.admin.mlMonitoring.offline}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.latency}</span>
                <span className="font-medium">{status?.latency || 0} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.modelVersion}</span>
                <span className="font-medium">{status?.modelVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.lastRetrained}</span>
                <span className="font-medium">{status?.lastRetraining ? formatDistanceToNow(new Date(status.lastRetraining), { addSuffix: true, locale: dateLocale }) : 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MongoDB embeddings storage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Database className="mr-2 h-4 w-4 text-chart-2" />
              {t.admin.mlMonitoring.mongoEmbeddings}
            </CardTitle>
            <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
              {t.admin.mlMonitoring.active}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.storageBackend}</span>
                <span className="font-medium">{t.admin.mlMonitoring.storageBackendValue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.resumeEmbeddings}</span>
                <span className="font-medium">{storage?.resumeEmbeddings ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.vacancyEmbeddings}</span>
                <span className="font-medium">{storage?.vacancyEmbeddings ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.embeddedRecords}</span>
                <span className="font-medium">{storage?.totalEmbeddings ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.admin.mlMonitoring.searchMethod}</span>
                <span className="font-medium text-right max-w-[55%]">{t.admin.mlMonitoring.searchMethodValue}</span>
              </div>
              {!hasEmbeddings && (
                <p className="text-xs text-muted-foreground pt-1">{t.admin.mlMonitoring.noEmbeddingsYet}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.mlMonitoring.queueStatus}</CardTitle>
            <CardDescription>{t.admin.mlMonitoring.pendingMlTasks}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{t.admin.mlMonitoring.embeddingGeneration}</span>
                  <span className="text-sm text-muted-foreground">{status?.queue?.embeddings || 0} {t.admin.mlMonitoring.tasks}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(((status?.queue?.embeddings || 0) / 50) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{t.admin.mlMonitoring.recProcessing}</span>
                  <span className="text-sm text-muted-foreground">{status?.queue?.recommendations || 0} {t.admin.mlMonitoring.tasks}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-chart-2" style={{ width: `${Math.min(((status?.queue?.recommendations || 0) / 20) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.mlMonitoring.pipelineControls}</CardTitle>
            <CardDescription>{t.admin.mlMonitoring.mlActions}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast.info(t.admin.mlMonitoring.triggerRetrainInfo)} variant="default">
                <Cpu className="mr-2 h-4 w-4" /> {t.admin.mlMonitoring.triggerRetrain}
              </Button>
              <Button onClick={() => toast.info(t.admin.mlMonitoring.restartServiceInfo)} variant="outline" className="text-amber-600 border-amber-600/30 hover:bg-amber-600/10">
                <Server className="mr-2 h-4 w-4" /> {t.admin.mlMonitoring.restartService}
              </Button>
              <Button onClick={() => toast.info(t.admin.mlMonitoring.clearQueuesInfo)} variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Activity className="mr-2 h-4 w-4" /> {t.admin.mlMonitoring.clearQueues}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
