'use client';

import Link from 'next/link';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/provider';

export default function ForgotPasswordPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">JobFlow</span>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.auth.forgotPasswordTitle}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t.auth.forgotPasswordDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-11" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.auth.backToLogin}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
