'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteResumeAction } from '@/app/actions/employee';
import { useI18n } from '@/lib/i18n/provider';

interface DeleteResumeButtonProps {
  resumeId: string;
  resumeTitle: string;
  onDeleted?: (resumeId: string) => void;
}

export function DeleteResumeButton({ resumeId, resumeTitle, onDeleted }: DeleteResumeButtonProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    const formData = new FormData();
    formData.set('id', resumeId);

    startTransition(async () => {
      const result = await deleteResumeAction(formData);
      if (!result.success) {
        return;
      }

      setOpen(false);
      onDeleted?.(resumeId);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        type="button"
        className="h-8 whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        {t.common.delete}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteResumeTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.dashboard.deleteResumeDesc.replace('{title}', resumeTitle)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {isPending ? t.dashboard.deleting : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
