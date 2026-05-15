"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signupAction } from "@/app/actions/auth";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider"

export default function SignupPage() {
  const { t } = useI18n()
  const router = useRouter();
  const [roleTab, setRoleTab] = useState<"jobseeker" | "employer">("jobseeker");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [termsJobSeeker, setTermsJobSeeker] = useState(false);
  const [termsEmployer, setTermsEmployer] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [employerForm, setEmployerForm] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleSubmit = (role: "EMPLOYEE" | "EMPLOYER") => (e: React.FormEvent) => {
    e.preventDefault();

    const termsOk = role === "EMPLOYEE" ? termsJobSeeker : termsEmployer;
    if (!termsOk) {
      toast.error("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append("role", role);
      data.append("termsAccepted", "true");

      if (role === "EMPLOYER") {
        data.append("companyName", employerForm.companyName);
        data.append("firstName", employerForm.firstName);
        data.append("lastName", employerForm.lastName);
        data.append("email", employerForm.email);
        data.append("password", employerForm.password);
      } else {
        data.append("firstName", employeeForm.firstName);
        data.append("lastName", employeeForm.lastName);
        data.append("email", employeeForm.email);
        data.append("password", employeeForm.password);
      }

      const res = await signupAction(data);
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      if (res?.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    });
  };

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
            <CardTitle className="text-2xl">{t.auth.createAccount}</CardTitle>
            <CardDescription>{t.auth.enterDetails}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={roleTab} onValueChange={(v) => setRoleTab(v as "jobseeker" | "employer")} className="w-full">
              <TabsList className="relative z-20 mb-6 grid h-auto min-h-11 w-full grid-cols-2 gap-1 p-1">
                <TabsTrigger value="jobseeker" type="button" className="cursor-pointer">
                  {t.auth.jobSeeker}
                </TabsTrigger>
                <TabsTrigger value="employer" type="button" className="cursor-pointer">
                  {t.common.employer}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="jobseeker" className="mt-0">
                <form onSubmit={handleSubmit("EMPLOYEE")} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="js-firstName" className="text-sm font-medium text-foreground">
                        {t.auth.firstName}
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="js-firstName"
                          name="jsFirstName"
                          value={employeeForm.firstName}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                          className="pl-10"
                          autoComplete="given-name"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="js-lastName" className="text-sm font-medium text-foreground">
                        {t.auth.lastName}
                      </label>
                      <Input
                        id="js-lastName"
                        name="jsLastName"
                        value={employeeForm.lastName}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="js-email" className="text-sm font-medium text-foreground">
                      {t.auth.email}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="js-email"
                        name="jsEmail"
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                        className="pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="js-password" className="text-sm font-medium text-foreground">
                      {t.auth.password}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="js-password"
                        name="jsPassword"
                        type={showPassword ? "text" : "password"}
                        value={employeeForm.password}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                        className="pl-10 pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-1 hover:bg-muted/40">
                    <Checkbox
                      id="js-terms"
                      checked={termsJobSeeker}
                      onCheckedChange={(v) => setTermsJobSeeker(v === true)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <span className="text-sm leading-snug text-muted-foreground">
                      {t.auth.termsAccept1}{" "}
                      <Link href="/terms" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {t.auth.termsOfService}
                      </Link>{" "}
                      {t.auth.and}{" "}
                      <Link href="/privacy" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {t.auth.privacyPolicy}
                      </Link>
                    </span>
                  </label>

                  <Button type="submit" className="h-11 w-full" disabled={isPending}>
                    {isPending ? t.common.loading : t.auth.createAccount}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="employer" className="mt-0">
                <form onSubmit={handleSubmit("EMPLOYER")} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="emp-companyName" className="text-sm font-medium text-foreground">
                      {t.auth.companyName}
                    </label>
                    <Input
                      id="emp-companyName"
                      name="empCompanyName"
                      value={employerForm.companyName}
                      onChange={(e) => setEmployerForm({ ...employerForm, companyName: e.target.value })}
                      autoComplete="organization"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="emp-firstName" className="text-sm font-medium text-foreground">
                        {t.auth.firstName}
                      </label>
                      <Input
                        id="emp-firstName"
                        name="empFirstName"
                        value={employerForm.firstName}
                        onChange={(e) => setEmployerForm({ ...employerForm, firstName: e.target.value })}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="emp-lastName" className="text-sm font-medium text-foreground">
                        {t.auth.lastName}
                      </label>
                      <Input
                        id="emp-lastName"
                        name="empLastName"
                        value={employerForm.lastName}
                        onChange={(e) => setEmployerForm({ ...employerForm, lastName: e.target.value })}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="emp-email" className="text-sm font-medium text-foreground">
                      {t.auth.email}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="emp-email"
                        name="empEmail"
                        type="email"
                        value={employerForm.email}
                        onChange={(e) => setEmployerForm({ ...employerForm, email: e.target.value })}
                        className="pl-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="emp-password" className="text-sm font-medium text-foreground">
                      {t.auth.password}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="emp-password"
                        name="empPassword"
                        type={showPassword ? "text" : "password"}
                        value={employerForm.password}
                        onChange={(e) => setEmployerForm({ ...employerForm, password: e.target.value })}
                        className="pl-10 pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-1 hover:bg-muted/40">
                    <Checkbox
                      id="emp-terms"
                      checked={termsEmployer}
                      onCheckedChange={(v) => setTermsEmployer(v === true)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <span className="text-sm leading-snug text-muted-foreground">
                      {t.auth.termsAccept1}{" "}
                      <Link href="/terms" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {t.auth.termsOfService}
                      </Link>{" "}
                      {t.auth.and}{" "}
                      <Link href="/privacy" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {t.auth.privacyPolicy}
                      </Link>
                    </span>
                  </label>

                  <Button type="submit" className="h-11 w-full" disabled={isPending}>
                    {isPending ? t.common.loading : t.auth.createAccount}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t.auth.alreadyHaveAccount}{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t.auth.signIn}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
