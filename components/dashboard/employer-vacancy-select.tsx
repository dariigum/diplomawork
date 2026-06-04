'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';

type EmployerVacancySelectProps = {
  vacancies: { id: string; title: string }[];
  value: string;
  onValueChange: (vacancyId: string) => void;
  unreadByVacancy: Record<string, number>;
  id?: string;
  className?: string;
};

export function EmployerVacancySelect({
  vacancies,
  value,
  onValueChange,
  unreadByVacancy,
  id = 'candidates-vacancy-select',
  className,
}: EmployerVacancySelectProps) {
  const { t } = useI18n();
  const selectedUnread = value ? (unreadByVacancy[value] ?? 0) : 0;

  return (
    <div className={cn('flex min-w-0 flex-1 max-w-sm flex-col gap-2', className)}>
      <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="—" />
          {selectedUnread > 0 ? (
            <Badge
              variant="destructive"
              className="ml-auto shrink-0 text-[10px] tabular-nums"
              aria-label={`${selectedUnread} ${t.header.notifications}`}
            >
              {selectedUnread}
            </Badge>
          ) : null}
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {vacancies.map((v) => {
            const unread = unreadByVacancy[v.id] ?? 0;
            return (
              <SelectItem key={v.id} value={v.id}>
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="truncate">{v.title}</span>
                  {unread > 0 ? (
                    <Badge
                      variant="destructive"
                      className="shrink-0 text-[10px] tabular-nums"
                      aria-label={`${unread} ${t.header.notifications}`}
                    >
                      {unread}
                    </Badge>
                  ) : null}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
