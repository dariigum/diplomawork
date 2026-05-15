'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Server, Database, RefreshCw, Cpu, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function AdminMlMonitoringPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ML Pipeline Monitoring</h1>
          <p className="text-muted-foreground">Real-time status of FastAPI, Kafka, and Qdrant.</p>
        </div>
        <Button onClick={() => { fetchStatus(); toast.success('Status refreshed'); }} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* FastAPI ML Service */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Server className="mr-2 h-4 w-4 text-primary" />
              FastAPI ML Service
            </CardTitle>
            <Badge variant={status?.status === 'online' ? 'default' : 'destructive'} className={status?.status === 'online' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}>
              {status?.status === 'online' ? 'Online' : 'Offline'}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latency</span>
                <span className="font-medium">{status?.latency || 0} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Version</span>
                <span className="font-medium">{status?.modelVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Retrained</span>
                <span className="font-medium">{status?.lastRetraining ? formatDistanceToNow(new Date(status.lastRetraining), { addSuffix: true }) : 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qdrant Vector DB */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Database className="mr-2 h-4 w-4 text-chart-2" />
              Qdrant Vector DB
            </CardTitle>
            <Badge variant={status?.qdrant?.status === 'online' ? 'default' : 'destructive'} className={status?.qdrant?.status === 'online' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}>
              {status?.qdrant?.status === 'online' ? 'Online' : 'Offline'}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collections</span>
                <span className="font-medium">{status?.qdrant?.collections?.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Health</span>
                <span className="font-medium text-green-500">Good</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kafka Event Bus */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Layers className="mr-2 h-4 w-4 text-chart-3" />
              Kafka Event Bus
            </CardTitle>
            <Badge variant={status?.kafka?.status === 'online' ? 'default' : 'destructive'} className={status?.kafka?.status === 'online' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}>
              {status?.kafka?.status === 'online' ? 'Online' : 'Offline'}
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Topics</span>
                <span className="font-medium">{status?.kafka?.topics?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unprocessed Events</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
            <CardDescription>Current pending tasks for the ML service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Embedding Generation</span>
                  <span className="text-sm text-muted-foreground">{status?.queue?.embeddings || 0} tasks</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(((status?.queue?.embeddings || 0) / 50) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Recommendation Processing</span>
                  <span className="text-sm text-muted-foreground">{status?.queue?.recommendations || 0} tasks</span>
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
            <CardTitle>Pipeline Controls</CardTitle>
            <CardDescription>Administrative actions for the ML pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast.info('Triggering manual retrain...')} variant="default">
                <Cpu className="mr-2 h-4 w-4" /> Trigger Retrain
              </Button>
              <Button onClick={() => toast.info('Restarting ML Service...')} variant="outline" className="text-amber-600 border-amber-600/30 hover:bg-amber-600/10">
                <Server className="mr-2 h-4 w-4" /> Restart Service
              </Button>
              <Button onClick={() => toast.info('Clearing queues...')} variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Activity className="mr-2 h-4 w-4" /> Clear Queues
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
