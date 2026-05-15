"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { completeGoogleSignupAction, getGoogleSignupPendingAction } from "@/app/actions/auth";
import { toast } from "sonner";

export default function CompleteGoogleSignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string>("");
  const [role, setRole] = useState<"EMPLOYEE" | "EMPLOYER">("EMPLOYEE");
  const [companyName, setCompanyName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getGoogleSignupPendingAction();
      if (cancelled) return;
      if ("error" in res) {
        router.replace("/login?error=google_signup_expired");
        return;
      }
      setPendingEmail(res.email);
      setPendingName(res.name);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      toast.error("Примите Terms of Service и Privacy Policy.");
      return;
    }
    if (role === "EMPLOYER" && !companyName.trim()) {
      toast.error("Укажите название компании.");
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append("role", role);
      data.append("termsAccepted", "true");
      if (role === "EMPLOYER") {
        data.append("companyName", companyName.trim());
      }

      const result = await completeGoogleSignupAction(data);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      if (result && "redirectTo" in result && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="relative z-0 flex min-h-screen items-center justify-center bg-background p-4">
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">JobFlow</span>
        </Link>

        <Card className="relative z-10 shadow-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Завершите регистрацию</CardTitle>
            <CardDescription>
              Вы вошли через Google как <span className="font-medium text-foreground">{pendingEmail}</span>.
              Выберите тип аккаунта и примите условия.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base">Тип аккаунта</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as "EMPLOYEE" | "EMPLOYER")}
                  className="grid gap-3"
                >
                  <label
                    htmlFor="role-employee"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50"
                  >
                    <RadioGroupItem value="EMPLOYEE" id="role-employee" className="cursor-pointer" />
                    <div>
                      <p className="font-medium">Job Seeker</p>
                      <p className="text-xs text-muted-foreground">Ищу работу, откликаюсь на вакансии</p>
                    </div>
                  </label>
                  <label
                    htmlFor="role-employer"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50"
                  >
                    <RadioGroupItem value="EMPLOYER" id="role-employer" className="cursor-pointer" />
                    <div>
                      <p className="font-medium">Employer</p>
                      <p className="text-xs text-muted-foreground">Публикую вакансии и общаюсь с кандидатами</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {role === "EMPLOYER" ? (
                <div className="space-y-2">
                  <Label htmlFor="google-company">Название компании</Label>
                  <Input
                    id="google-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ООО «Компания»"
                    autoComplete="organization"
                    required
                  />
                </div>
              ) : (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Имя в профиле: <span className="font-medium text-foreground">{pendingName || pendingEmail}</span> (можно
                  изменить позже в настройках, когда появятся).
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-1 hover:bg-muted/40">
                <Checkbox
                  id="google-terms"
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(v === true)}
                  className="mt-0.5 cursor-pointer"
                />
                <span className="text-sm leading-snug text-muted-foreground">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <Button type="submit" className="h-11 w-full" disabled={isPending}>
                {isPending ? "Создание аккаунта…" : "Создать аккаунт"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
