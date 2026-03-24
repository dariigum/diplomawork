"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Briefcase, Eye, EyeOff, Mail, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signupAction } from "@/app/actions/auth"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [employeeForm, setEmployeeForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })
  const [employerForm, setEmployerForm] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })

  const handleSubmit = (role: "EMPLOYEE" | "EMPLOYER") => (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      const data = new FormData()
      data.append("role", role)

      if (role === "EMPLOYER") {
        data.append("companyName", employerForm.companyName)
        data.append("firstName", employerForm.firstName)
        data.append("lastName", employerForm.lastName)
        data.append("email", employerForm.email)
        data.append("password", employerForm.password)
      } else {
        data.append("firstName", employeeForm.firstName)
        data.append("lastName", employeeForm.lastName)
        data.append("email", employeeForm.email)
        data.append("password", employeeForm.password)
      }

      const res = await signupAction(data)
      if (res?.error) {
        toast.error(res.error)
        return
      }

      if (res?.redirectTo) {
        router.push(res.redirectTo)
        router.refresh()
      }
    })
  }

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
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>Start your job search journey today</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="jobseeker" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="jobseeker">Job Seeker</TabsTrigger>
                <TabsTrigger value="employer">Employer</TabsTrigger>
              </TabsList>

              <TabsContent value="jobseeker">
                <form onSubmit={handleSubmit("EMPLOYEE")} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium text-foreground">First Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          value={employeeForm.firstName}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium text-foreground">Last Name</label>
                      <Input
                        id="lastName"
                        value={employeeForm.lastName}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={employeeForm.password}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                        className="pl-10 pr-10"
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

                  <div className="flex items-start gap-2">
                    <Checkbox id="terms" className="mt-1" required />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </label>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isPending}>Create Account</Button>
                </form>
              </TabsContent>

              <TabsContent value="employer">
                <form onSubmit={handleSubmit("EMPLOYER")} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-sm font-medium text-foreground">Company Name</label>
                    <Input
                      id="companyName"
                      value={employerForm.companyName}
                      onChange={(e) => setEmployerForm({ ...employerForm, companyName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="empFirstName" className="text-sm font-medium text-foreground">First Name</label>
                      <Input
                        id="empFirstName"
                        value={employerForm.firstName}
                        onChange={(e) => setEmployerForm({ ...employerForm, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="empLastName" className="text-sm font-medium text-foreground">Last Name</label>
                      <Input
                        id="empLastName"
                        value={employerForm.lastName}
                        onChange={(e) => setEmployerForm({ ...employerForm, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="empEmail" className="text-sm font-medium text-foreground">Work Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="empEmail"
                        type="email"
                        value={employerForm.email}
                        onChange={(e) => setEmployerForm({ ...employerForm, email: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="empPassword" className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="empPassword"
                        type={showPassword ? "text" : "password"}
                        value={employerForm.password}
                        onChange={(e) => setEmployerForm({ ...employerForm, password: e.target.value })}
                        className="pl-10 pr-10"
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

                  <div className="flex items-start gap-2">
                    <Checkbox id="empTerms" className="mt-1" required />
                    <label htmlFor="empTerms" className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </label>
                  </div>

                  <Button type="submit" className="w-full h-11" disabled={isPending}>Create Employer Account</Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
