'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Terminal, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

const mockLogs = [
  { id: 1, type: 'ERROR', message: 'Failed to connect to ML Service at 192.168.1.15', source: 'API Gateway', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: 2, type: 'WARN', message: 'High memory usage detected on Next.js container (85%)', source: 'System Monitor', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
  { id: 3, type: 'INFO', message: 'Admin user logged in', source: 'Auth Service', timestamp: new Date(Date.now() - 1000 * 60 * 45) },
  { id: 4, type: 'SUCCESS', message: 'Database backup completed successfully', source: 'Backup Job', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: 5, type: 'INFO', message: 'Kafka topic "user-events" retention policy updated', source: 'Kafka Manager', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { id: 6, type: 'ERROR', message: 'Invalid JWT signature detected from IP 45.12.34.56', source: 'Auth Middleware', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12) },
];

export default function AdminLogsPage() {
  const { t } = useI18n();

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'ERROR': return 'destructive';
      case 'WARN': return 'outline';
      case 'SUCCESS': return 'default';
      default: return 'secondary';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ERROR': return <ShieldAlert className="h-4 w-4 text-destructive mr-2" />;
      case 'WARN': return <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />;
      case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />;
      default: return <Info className="h-4 w-4 text-blue-500 mr-2" />;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.admin.logs.title}</h1>
        <p className="text-muted-foreground">{t.admin.logs.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Terminal className="mr-2 h-5 w-5" />
                {t.admin.logs.recentEvents}
              </CardTitle>
              <CardDescription>{t.admin.logs.logsDesc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border font-mono text-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">{t.admin.logs.colTimestamp}</TableHead>
                  <TableHead className="w-[100px]">{t.admin.logs.colLevel}</TableHead>
                  <TableHead className="w-[150px]">{t.admin.logs.colSource}</TableHead>
                  <TableHead>{t.admin.logs.colMessage}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {log.timestamp.toLocaleTimeString()} {log.timestamp.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(log.type) as any} className={log.type === 'WARN' ? 'border-amber-500/50 text-amber-600' : log.type === 'SUCCESS' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20' : ''}>
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.source}</TableCell>
                    <TableCell className="flex items-center">
                      {getIcon(log.type)}
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
