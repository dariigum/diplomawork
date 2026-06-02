'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/provider';

type EmployerAlertsProps = {
  resumeAccess?: string;
};

/**
 * Renders nothing visually — shows toasts based on URL query params
 * and cleans them up so the message doesn't repeat on refresh.
 */
export function EmployerAlerts({ resumeAccess }: EmployerAlertsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (resumeAccess === 'denied') {
      shownRef.current = true;
      toast.error(t.dashboard.resumeAccessDenied, { duration: 5000 });

      // Remove the param from URL so a refresh doesn't repeat the toast
      const url = new URL(window.location.href);
      url.searchParams.delete('resumeAccess');
      const clean = url.pathname + (url.search ? url.search : '');
      router.replace(clean, { scroll: false });
    }
  }, [resumeAccess, router, t.dashboard.resumeAccessDenied]);

  return null;
}
