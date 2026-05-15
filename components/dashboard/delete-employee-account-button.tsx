'use client';

import { useState, useTransition } from 'react';
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
import { deleteEmployeeAccountAction } from '@/app/actions/employee';
import { useI18n } from '@/lib/i18n/provider';

export function DeleteEmployeeAccountButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    startTransition(async () => {
      await deleteEmployeeAccountAction();
    });
  };

  return (
    <>
      <Button variant="destructive" type="button" onClick={() => setOpen(true)}>
        {t.dashboard.deleteAccount}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteAccountTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.dashboard.deleteAccountDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                confirmDelete();
              }}
            >
              {isPending ? t.dashboard.deleting : t.dashboard.yesDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
