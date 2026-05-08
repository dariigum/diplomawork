'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { DatabaseZap, RefreshCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { isDatabaseUnavailableError } from '@/lib/db/error-utils';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDatabaseError = isDatabaseUnavailableError(error);

  if (isDatabaseError) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DatabaseZap className="size-5" />
          </EmptyMedia>
          <EmptyTitle>MongoDB is unavailable</EmptyTitle>
          <EmptyDescription>
            The dashboard could not connect to the database. If you use MongoDB Atlas, add this
            machine&apos;s IP to Atlas Network Access. For local development, point
            `MONGODB_URI` to `mongodb://localhost:27017/diplomawork` and start MongoDB locally.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-xl">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button type="button" onClick={() => reset()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Go to home</Link>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlert className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Dashboard failed to load</EmptyTitle>
        <EmptyDescription>
          An unexpected server error occurred while loading this dashboard page.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" onClick={() => reset()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
