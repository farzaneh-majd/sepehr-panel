"use client";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { useForm, Controller, SubmitHandler } from "react-hook-form"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { getCookie, setCookie } from "cookies-next"
import { jwtDecode } from "jwt-decode"
import axiosInstance from "@/lib/axios-config"

interface LoginInputs {
  username: string
  password: string
}

interface JwtPayload {
  exp: number
  [key: string]: any
}

export function LoginForm({
  className,
  deactivatedNotice = false,
  ...props
}: React.ComponentProps<"div"> & { deactivatedNotice?: boolean }) {
  const router = useRouter()
  const { control, handleSubmit, clearErrors } = useForm<LoginInputs>({
    defaultValues: {
      username: "",
      password: "",
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [backError, setBackError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [deactivated, setDeactivated] = useState(deactivatedNotice)
  const [loginMessage, setLoginMessage] = useState("")

  useEffect(() => {
    const refresh = getCookie("refresh")
    if (typeof refresh !== "string" || !refresh) return
    try {
      const refreshExp = new Date(jwtDecode<JwtPayload>(refresh).exp * 1000)
      if (refreshExp <= new Date()) return
      setCookie("refresh", refresh, { expires: refreshExp, sameSite: "lax" })
      const access = getCookie("access")
      if (typeof access === "string" && access) {
        setCookie("access", access, { expires: new Date(jwtDecode<JwtPayload>(access).exp * 1000), sameSite: "lax" })
      }
      router.replace("/dashboard")
    } catch {
      return
    }
  }, [router])

  const sendLoginRequest = async (data: LoginInputs) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await response.json()
      if (!response.ok) {
        const error = new Error(payload?.message || "Login failed") as Error & { status?: number; backendMessage?: string }
        error.status = response.status
        error.backendMessage = payload?.message
        throw error
      }
      const access = payload.result.access
      const refresh = payload.result.refresh
      document.cookie = `access=${encodeURIComponent(access)}; Path=/; Max-Age=900; SameSite=Lax`
      document.cookie = `refresh=${encodeURIComponent(refresh)}; Path=/; Max-Age=604800; SameSite=Lax`
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${access}`
    } catch (error: unknown) {
      setIsLoading(false)
      setBackError(true)
      const loginError = error as { status?: number; backendMessage?: string }
      const isDeactivated = loginError.backendMessage === "User is deactivated"
      setDeactivated(isDeactivated)
      setLoginMessage(loginError.status === 401 ? "Invalid username or password" : "Unable to sign in right now. Please try again.")
      return
    }
    window.location.replace("/dashboard")
  }

  const onSubmit: SubmitHandler<LoginInputs> = (data) => {
    clearErrors()
    setBackError(false)
    setDeactivated(false)
    setLoginMessage("")
    sendLoginRequest(data)
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleSubmit(onSubmit)()
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-[#dfe1e6] shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-[#172b4d]">Sign in to Sepehr Panel</CardTitle>
          <CardDescription>
            Login with your username and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Controller
                  name="username"
                  control={control}
                  rules={{
                    validate: () => {
                      return backError ? "" : true
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      type="text"
                      required
                      disabled={isLoading}
                      {...field}
                      className={backError ? "border-destructive" : ""}
                    />
                  )}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Controller
                  name="password"
                  control={control}
                  rules={{
                    validate: () => {
                      return backError ? "" : true
                    },
                  }}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                      id="password"
                      placeholder="Enter your password"
                        type={showPassword ? "text" : "password"}
                        required
                        disabled={isLoading}
                        {...field}
                        className={backError ? "border-destructive pr-10" : "pr-10"}
                        onChange={(e) => {
                          setBackError(false)
                          field.onChange(e)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                        disabled={isLoading}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  )}
                />
              </Field>
              {deactivated ? (
                <FieldDescription className="text-destructive">
                  Your account has been deactivated. Please contact your administrator.
                </FieldDescription>
              ) : backError && (
                <FieldDescription className="text-destructive">
                  {loginMessage}
                </FieldDescription>
              )}
              <Field>
                <Button type="submit" disabled={isLoading} className="w-full cursor-pointer">
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>      
    </div>
  )
}
