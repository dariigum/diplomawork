'use client';

import { X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type PendingFile = {
  id: string;
  file: File;
  progress: number;
  error?: string;
};

export function AttachmentPreview({
  pending,
  onRemove,
}: {
  pending: PendingFile[];
  onRemove: (id: string) => void;
}) {
  if (pending.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 border-t border-border/60 px-3 py-2">
      {pending.map((p) => (
        <div
          key={p.id}
          className="flex min-w-[140px] max-w-[220px] flex-col gap-1 rounded-lg border bg-muted/40 p-2 text-xs"
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex min-w-0 items-center gap-1">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{p.file.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={() => onRemove(p.id)}
              disabled={p.progress > 0 && p.progress < 100}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          {p.progress > 0 && p.progress < 100 ? (
            <Progress value={p.progress} className="h-1" />
          ) : null}
          {p.progress >= 100 ? (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Uploading…
            </span>
          ) : null}
          {p.error ? <p className={cn('text-[10px] text-destructive')}>{p.error}</p> : null}
        </div>
      ))}
    </div>
  );
}
