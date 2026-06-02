'use client';

import { FileText } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { normalizeEmployerCvHref } from '@/lib/employer-cv-url';

type EmployerViewResumeButtonProps = {
  cvFile?: string | null;
  cvUnavailable?: boolean;
  label: string;
  unavailableLabel: string;
  className?: string;
};

const controlClass = 'mt-2 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs';

/**
 * CV control safe inside clickable cards (no nested &lt;button&gt;).
 * Always renders: link when href is valid, otherwise disabled explanation.
 */
export function EmployerViewResumeButton({
  cvFile,
  cvUnavailable,
  label,
  unavailableLabel,
  className,
}: EmployerViewResumeButtonProps) {
  const href = normalizeEmployerCvHref(cvFile);
  const showUnavailable = cvUnavailable || !href;

  if (!showUnavailable && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          controlClass,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="size-3.5 shrink-0" aria-hidden />
        {label}
      </a>
    );
  }

  return (
    <span
      role="status"
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        controlClass,
        'cursor-not-allowed opacity-80',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      title={unavailableLabel}
    >
      <FileText className="size-3.5 shrink-0" aria-hidden />
      {unavailableLabel}
    </span>
  );
}
