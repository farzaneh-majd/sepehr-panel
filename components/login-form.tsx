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
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import { useForm, Controller, SubmitHandler } from "react-hook-form"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { getCookie, setCookie } from "cookies-next"
import { jwtDecode } from "jwt-decode"
import axiosInstance from "@/lib/axios-config"
import { useUser } from "@/context/UserContext"

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
  const { refreshUser } = useUser()
  const { control, handleSubmit, setError, clearErrors } = useForm<LoginInputs>({
    defaultValues: {
      username: "",
      password: "",
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [backError, setBackError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [deactivated, setDeactivated] = useState(deactivatedNotice)

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

  const handleBackendError = () => {
    setBackError(true)
    setError("username", {
      type: "manual",
      message: "",
    })
    setError("password", {
      type: "manual",
      message: "",
    })
  }

  const sendLoginRequest = (data: LoginInputs) => {
    setIsLoading(true)
    axiosInstance
      .post("/login", data)
      .then(async (response) => {
        setIsLoading(false)

        const access = response.data.result.access
        const refresh = response.data.result.refresh

        const decodedAccess = jwtDecode<JwtPayload>(access)
        const expirationDate = new Date(decodedAccess.exp * 1000)
                
        setCookie("access", access, { 
          expires: expirationDate,          
          sameSite: "lax"
        })

        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${access}`

        const decodedRefresh = jwtDecode<JwtPayload>(refresh)
        const expirationRefreshDate = new Date(decodedRefresh.exp * 1000)
        setCookie("refresh", refresh, { 
          expires: expirationRefreshDate,          
          sameSite: "lax"
        })

        // Refresh user data in context before navigating
        await refreshUser()
        router.push("/dashboard")
      })
      .catch((error) => {
        setIsLoading(false)
        setBackError(true)
        setDeactivated(error?.response?.data?.message === "User is deactivated")
      })
  }

  const onSubmit: SubmitHandler<LoginInputs> = (data) => {
    clearErrors()
    setBackError(false)
    setDeactivated(false)
    sendLoginRequest(data)
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleSubmit(onSubmit)()
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
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
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
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
                  Invalid username or password
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
