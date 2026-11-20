"use client"

import * as React from "react"
import axiosInstance from "@/lib/axios-config"
import { useUser } from "@/context/UserContext"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarIcon, Clock, Plus, Check, X, ChevronLeft, ChevronRight,
  AlertCircle, Coffee, Users, Zap, MoreHorizontal, Trash2, ClipboardCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TimeOffSkeleton } from "./time-off-skeleton"
import { format, getYear, getMonth, newDate as newJalaliDate, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, JALALI_MONTHS } from "@/lib/date"

interface TimeOffRequest {
  id: number; userId?: number; userFirstName?: string; userLastName?: string
  date?: string; startTime?: string; endTime?: string; hours?: number; minutes?: number
  type?: string; reason?: string; status?: string; reviewNote?: string
  reviewedBy?: number; reviewerFirstName?: string; reviewerLastName?: string
  reviewedAt?: string; createdAt?: string
}

interface Balance {
  userId: number; firstName?: string; lastName?: string; year: number
  monthlyAllowanceHours: number; annualAllowanceDays: number
  totalAnnualHours: number; usedHours: number; pendingHours: number
  remainingHours: number; usedThisMonthHours: number; remainingThisMonthHours: number
  monthlyAllowanceMinutes?: number; totalAnnualMinutes?: number; usedMinutes?: number; pendingMinutes?: number
  remainingMinutes?: number; usedThisMonthMinutes?: number; remainingThisMonthMinutes?: number
  emergencyUsedThisMonth: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}

const TYPE_COLORS: Record<string, string> = {
  emergency: "bg-red-100 text-red-700 border border-red-200",
  hourly: "bg-blue-50 text-blue-700",
  normal: "bg-blue-50 text-blue-700",
}

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 7).toString().padStart(2, "0"))
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]
const PER_PAGE = 10
const FULL_DAY_MINUTES = 7 * 60 + 20
const MONTHLY_ALLOWANCE_MINUTES = 17 * 60
const ANNUAL_ALLOWANCE_MINUTES = 28 * FULL_DAY_MINUTES

function balanceMinutes(minutes: number | undefined, hours: number): number {
  return minutes ?? hours * 60
}

function allowance(b: Balance) {
  const usedMonth = balanceMinutes(b.usedThisMonthMinutes, b.usedThisMonthHours)
  const used = balanceMinutes(b.usedMinutes, b.usedHours)
  const pending = balanceMinutes(b.pendingMinutes, b.pendingHours)
  return {
    usedMonth,
    used,
    pending,
    leftMonth: Math.max(0, MONTHLY_ALLOWANCE_MINUTES - usedMonth),
    leftYear: Math.max(0, ANNUAL_ALLOWANCE_MINUTES - used - pending),
  }
}

function parseDateLocal(dateStr: string): Date {
  // Take only the date portion and parse as local midnight
  const datePart = dateStr.split("T")[0] // "YYYY-MM-DD"
  const [year, month, day] = datePart.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + (m || 0)
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0h"
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function requestTimeRange(r: TimeOffRequest, separator = "-"): string {
  return r.startTime && r.endTime ? `${r.startTime}${separator}${r.endTime}` : "Full day"
}

function requestDuration(r: TimeOffRequest): string {
  if (r.startTime && r.endTime) {
    const diff = timeToMinutes(r.endTime) - timeToMinutes(r.startTime)
    if (diff > 0) return formatDuration(diff)
  }
  if (r.minutes) return formatDuration(r.minutes)
  if (r.hours) return `${r.hours}h`
  return "-"
}

export function TimeOffView() {
  const { user } = useUser()
  const isAdmin = user?.role === "admin" || user?.role === "manager"

  const [requests, setRequests] = React.useState<TimeOffRequest[]>([])
  const [allRequests, setAllRequests] = React.useState<TimeOffRequest[]>([])
  const [balance, setBalance] = React.useState<Balance | null>(null)
  const [allBalances, setAllBalances] = React.useState<Balance[]>([])
  const [loading, setLoading] = React.useState(true)
  const [hasLoaded, setHasLoaded] = React.useState(false)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [newDate, setNewDate] = React.useState<Date | undefined>()
  const [sH, setSH] = React.useState("09"); const [sM, setSM] = React.useState("00")
  const [eH, setEH] = React.useState("10"); const [eM, setEM] = React.useState("00")
  const [newReason, setNewReason] = React.useState("")
  const [leaveType, setLeaveType] = React.useState<"normal" | "emergency">("normal")
  const [fullDay, setFullDay] = React.useState(false)
  const [datePickerOpen, setDatePickerOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [msgOpen, setMsgOpen] = React.useState(false)
  const [msgTitle, setMsgTitle] = React.useState("")
  const [msgText, setMsgText] = React.useState("")

  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [reviewTarget, setReviewTarget] = React.useState<TimeOffRequest | null>(null)
  const [reviewNote, setReviewNote] = React.useState("")
  const [isReviewing, setIsReviewing] = React.useState(false)

  const [selectedYear, setSelectedYear] = React.useState(() => getYear(new Date()))
  const [calendarMonth, setCalendarMonth] = React.useState(() => getMonth(new Date()))
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [userFilter, setUserFilter] = React.useState("all")
  const [listPage, setListPage] = React.useState(1)
  const [teamPage, setTeamPage] = React.useState(1)

  const startMin = parseInt(sH) * 60 + parseInt(sM)
  const endMin = parseInt(eH) * 60 + parseInt(eM)
  const diffMin = fullDay ? FULL_DAY_MINUTES : Math.max(0, endMin - startMin)

  const openCreate = () => {
    setLeaveType("normal")
    setNewDate(undefined)
    setFullDay(false)
    setSH("09"); setSM("00"); setEH("10"); setEM("00")
    setNewReason("")
    setCreateOpen(true)
  }

  React.useEffect(() => { fetchData() }, [selectedYear, isAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [myRes, balRes] = await Promise.all([
        axiosInstance.get("/time-off/my", { params: { year: selectedYear } }),
        axiosInstance.get("/time-off/balance", { params: { year: selectedYear } }),
      ])
      setRequests(myRes.data?.result ?? myRes.data ?? [])
      setBalance(balRes.data?.result ?? balRes.data)
      if (isAdmin) {
        try {
          const [allRes, allBalRes] = await Promise.all([
            axiosInstance.get("/time-off/all", { params: { year: selectedYear } }),
            axiosInstance.get("/time-off/balances", { params: { year: selectedYear } }),
          ])
          setAllRequests(allRes.data?.result ?? allRes.data ?? [])
          setAllBalances(allBalRes.data?.result ?? allBalRes.data ?? [])
        } catch {}
      }
    } catch {} finally {
      setLoading(false)
      setHasLoaded(true)
    }
  }

  const showMsg = (title: string, text: string) => { setMsgTitle(title); setMsgText(text); setMsgOpen(true) }

  const handleCreate = async () => {
    if (!newDate || diffMin <= 0) { showMsg("Invalid Input", "Please select a valid date and time range."); return }
    setIsSubmitting(true)
    try {
      const yyyy = newDate.getFullYear()
      const mm = String(newDate.getMonth() + 1).padStart(2, "0")
      const dd = String(newDate.getDate()).padStart(2, "0")
      const localDateStr = `${yyyy}-${mm}-${dd}T12:00:00.000Z`

      await axiosInstance.post("/time-off", {
        date: localDateStr,
        startTime: fullDay ? null : `${sH}:${sM}`,
        endTime: fullDay ? null : `${eH}:${eM}`,
        fullDay,
        hours: Math.ceil(diffMin / 60),
        minutes: diffMin,
        reason: newReason,
        type: leaveType,
      })
      setCreateOpen(false)
      showMsg("Success", leaveType === "emergency"
        ? "Emergency leave submitted. It is pending admin approval."
        : "Time off request submitted successfully.")
      fetchData()
    } catch (err: any) {
      const data = err.response?.data
      const msg =
        data?.message ||
        (Array.isArray(data?.errors) ? data.errors.join(", ") : null) ||
        (Array.isArray(data) ? data.join(", ") : null) ||
        JSON.stringify(data) ||
        "Failed to create request."
      showMsg("Error", msg)
    } finally { setIsSubmitting(false) }
  }

  const handleCancel = async (id: number) => {
    try { await axiosInstance.delete(`/time-off/${id}`); fetchData() } catch {}
  }

  const handleReview = async (status: string) => {
    if (!reviewTarget) return; setIsReviewing(true)
    try {
      await axiosInstance.put(`/time-off/${reviewTarget.id}/review`, { status, reviewNote })
      setReviewOpen(false); setReviewTarget(null); setReviewNote("")
      showMsg("Review Complete", `Request ${status} successfully.`); fetchData()
    } catch {} finally { setIsReviewing(false) }
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const d = new Date(date); d.setHours(0, 0, 0, 0)

    if (leaveType === "emergency") {
      return d.getTime() !== today.getTime()
    }

    return d.getTime() <= today.getTime()
  }

  const emergencyAvailable = balance ? !balance.emergencyUsedThisMonth : true

  const calendarDays = React.useMemo(() => {
    const first = newJalaliDate(selectedYear, calendarMonth, 1)
    const last = endOfMonth(first)
    const days: { date: Date; requests: TimeOffRequest[]; inMonth: boolean }[] = []
    for (const d of eachDayOfInterval({ start: startOfWeek(first), end: endOfWeek(last) })) {
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
      days.push({
        date: d,
        requests: (isAdmin ? allRequests : requests).filter(r => {
          if (!r.date) return false
          const reqDate = parseDateLocal(r.date)
          const reqStr = `${reqDate.getFullYear()}-${String(reqDate.getMonth()+1).padStart(2,"0")}-${String(reqDate.getDate()).padStart(2,"0")}`
          return reqStr === ds
        }),
        inMonth: getMonth(d) === calendarMonth,
      })
    }
    return days
  }, [selectedYear, calendarMonth, requests, allRequests, isAdmin])

  const filteredRequests = React.useMemo(() => {
    let list = isAdmin ? allRequests : requests
    if (statusFilter !== "all") list = list.filter(r => r.status === statusFilter)
    if (userFilter !== "all" && isAdmin) list = list.filter(r => r.userId?.toString() === userFilter)
    return list
  }, [requests, allRequests, isAdmin, statusFilter, userFilter])

  const uniqueUsers = React.useMemo(() => {
    const m = new Map<number, string>()
    allRequests.forEach(r => { if (r.userId) m.set(r.userId, `${r.userFirstName || ""} ${r.userLastName || ""}`.trim()) })
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }))
  }, [allRequests])

  const listPages = Math.ceil(filteredRequests.length / PER_PAGE)
  const pagedRequests = filteredRequests.slice((listPage - 1) * PER_PAGE, listPage * PER_PAGE)
  const teamPages = Math.ceil(allBalances.length / PER_PAGE)
  const pagedBalances = allBalances.slice((teamPage - 1) * PER_PAGE, teamPage * PER_PAGE)

  const summary = React.useMemo(() => {
    if (!isAdmin || !allBalances.length) return null
    return {
      count: allBalances.length,
      usedMonth: allBalances.reduce((a, b) => a + balanceMinutes(b.usedThisMonthMinutes, b.usedThisMonthHours), 0),
      remMonth: allBalances.reduce((a, b) => a + allowance(b).leftMonth, 0),
      usedYear: allBalances.reduce((a, b) => a + balanceMinutes(b.usedMinutes, b.usedHours), 0),
      remYear: allBalances.reduce((a, b) => a + allowance(b).leftYear, 0),
      pending: allBalances.reduce((a, b) => a + balanceMinutes(b.pendingMinutes, b.pendingHours), 0),
    }
  }, [isAdmin, allBalances])

  React.useEffect(() => { setListPage(1) }, [statusFilter, userFilter])

  if (loading && !hasLoaded) return <TimeOffSkeleton />

  return (
    <div className={cn("p-4 md:p-6 max-w-7xl mx-auto space-y-6 transition-opacity", loading && "opacity-60")} aria-busy={loading}>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Time Off</h2>
          <p className="text-sm text-muted-foreground">Manage leave requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[-2, -1, 0, 1].map(o => getYear(new Date()) + o).map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button className="gap-1 bg-cyan-500 hover:bg-cyan-600" onClick={openCreate}>
            <Plus className="w-4 h-4" />New Request
          </Button>
        </div>
      </div>

      {balance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BCard icon={<Coffee className="w-5 h-5 text-cyan-500" />} label="Used This Month" value={formatDuration(balanceMinutes(balance.usedThisMonthMinutes, balance.usedThisMonthHours))} sub={`of ${formatDuration(MONTHLY_ALLOWANCE_MINUTES)}`} />
          <BCard icon={<Clock className="w-5 h-5 text-green-500" />} label="Remaining Monthly" value={formatDuration(allowance(balance).leftMonth)} sub={`${formatDuration(MONTHLY_ALLOWANCE_MINUTES)} / month`} />
          <BCard icon={<CalendarIcon className="w-5 h-5 text-blue-500" />} label="Used This Year" value={formatDuration(balanceMinutes(balance.usedMinutes, balance.usedHours))} sub={`of ${formatDuration(ANNUAL_ALLOWANCE_MINUTES)}`} />
          <BCard icon={<AlertCircle className="w-5 h-5 text-amber-500" />} label="Remaining Annual" value={formatDuration(allowance(balance).leftYear)} sub={balanceMinutes(balance.pendingMinutes, balance.pendingHours) > 0 ? `${formatDuration(balanceMinutes(balance.pendingMinutes, balance.pendingHours))} pending` : ""} />
          <BCard
            icon={<Zap className={cn("w-5 h-5", balance.emergencyUsedThisMonth ? "text-gray-400" : "text-red-500")} />}
            label="Emergency Leave"
            value={balance.emergencyUsedThisMonth ? "Used" : "Available"}
            sub="once per month"
            highlight={!balance.emergencyUsedThisMonth}
          />
        </div>
      )}

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">Requests</TabsTrigger>
          {isAdmin && <TabsTrigger value="team">Team Balances</TabsTrigger>}
        </TabsList>

        <TabsContent value="calendar">
          <div className="bg-white border rounded-xl p-2 sm:p-4 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(p => p === 0 ? 11 : p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="font-medium">{JALALI_MONTHS[calendarMonth]} {selectedYear}</span>
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(p => p === 11 ? 0 : p + 1)}><ChevronRight className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-t-lg overflow-hidden">
                {["Sat","Sun","Mon","Tue","Wed","Thu","Fri"].map(d => (
                  <div key={d} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-b-lg overflow-hidden">
                {calendarDays.map((day, i) => {
                  const today = day.date.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} className={cn("bg-white p-1.5 min-h-[80px]", !day.inMonth && "bg-gray-50/50")}>
                      <span className={cn("text-xs", today && "bg-cyan-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center", !day.inMonth && "text-gray-300")}>
                        {format(day.date, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {day.requests.slice(0, 3).map(r => {
                          const statusKey = (r.status || "pending").toLowerCase()
                          const isEmergency = r.type === "emergency"
                          return (
                            <div key={r.id}
                              className={cn("text-[10px] px-1 py-0.5 rounded truncate leading-tight", STATUS_COLORS[statusKey])}
                              title={`${r.userFirstName || "You"} ${r.userLastName || ""}: ${requestTimeRange(r)} ${r.type === "emergency" ? "🚨 EMERGENCY" : ""} ${r.reason || ""}`}>
                              {isEmergency && <span className="mr-0.5">🚨</span>}
                              {isAdmin && <span className="font-medium">{r.userFirstName}: </span>}
                              {requestTimeRange(r)}
                            </div>
                          )
                        })}
                        {day.requests.length > 3 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-full text-[9px] text-gray-400 text-center rounded hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
                                +{day.requests.length - 3} more
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2" align="center">
                              <div className="text-xs font-medium text-gray-500 mb-2 px-1">
                                {format(day.date, "EEE, MMM d")} · {day.requests.length} requests
                              </div>
                              <div className="space-y-1 max-h-72 overflow-y-auto">
                                {day.requests.map(r => {
                                  const statusKey = (r.status || "pending").toLowerCase()
                                  const isEmergency = r.type === "emergency"
                                  return (
                                    <div key={r.id} className={cn("text-xs px-2 py-1 rounded leading-snug", STATUS_COLORS[statusKey])}>
                                      <div className="truncate">
                                        {isEmergency && <span className="mr-0.5">🚨</span>}
                                        <span className="font-medium">
                                          {isAdmin ? `${r.userFirstName || ""} ${r.userLastName || ""}`.trim() : "You"}:
                                        </span>{" "}
                                        {requestTimeRange(r)}
                                      </div>
                                      {r.reason && <div className="text-[11px] opacity-75 truncate">{r.reason}</div>}
                                    </div>
                                  )
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list">
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b bg-slate-50 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {isAdmin && (
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{filteredRequests.length} requests</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {isAdmin && <TableHead className="min-w-[120px]">Employee</TableHead>}
                    <TableHead className="min-w-[100px]">Date</TableHead>
                    <TableHead className="min-w-[110px]">Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="min-w-[150px]">Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">No requests found</TableCell></TableRow>
                  ) : pagedRequests.map(r => (
                    <TableRow key={r.id} className={r.type === "emergency" ? "bg-red-50/30" : ""}>
                      {isAdmin && <TableCell className="font-medium whitespace-nowrap">{r.userFirstName} {r.userLastName}</TableCell>}
                      <TableCell className="whitespace-nowrap">
                        {r.date ? format(parseDateLocal(r.date), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">{requestTimeRange(r, " - ")}</TableCell>
                      <TableCell className="font-mono whitespace-nowrap">{requestDuration(r)}</TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap inline-flex items-center gap-1",
                          r.type === "emergency" ? TYPE_COLORS.emergency : TYPE_COLORS.hourly)}>
                          {r.type === "emergency" && <Zap className="w-3 h-3" />}
                          {r.type === "emergency" ? "Emergency" : "Normal"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.reason || "-"}</TableCell>
                      <TableCell>
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", STATUS_COLORS[r.status || "pending"])}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          isAdmin ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  className="text-cyan-600 focus:text-cyan-700 focus:bg-cyan-50 cursor-pointer"
                                  onClick={() => { setReviewTarget(r); setReviewNote(""); setReviewOpen(true) }}
                                >
                                  <ClipboardCheck className="w-4 h-4 mr-2" />
                                  Review
                                </DropdownMenuItem>
                                {r.userId === user?.id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                      onClick={() => handleCancel(r.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => handleCancel(r.id)}>
                              Cancel
                            </Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {listPages > 1 && <Pager current={listPage} total={listPages} count={filteredRequests.length} perPage={PER_PAGE} onChange={setListPage} />}
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team">
            <div className="space-y-4">
              {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <BCard icon={<Coffee className="w-5 h-5 text-cyan-500" />} label="Used This Month" value={formatDuration(summary.usedMonth)} sub="all employees" />
                  <BCard icon={<Clock className="w-5 h-5 text-green-500" />} label="Remaining Monthly" value={formatDuration(summary.remMonth)} sub="all employees" />
                  <BCard icon={<CalendarIcon className="w-5 h-5 text-blue-500" />} label="Used This Year" value={formatDuration(summary.usedYear)} sub={summary.pending > 0 ? `${formatDuration(summary.pending)} pending` : "all employees"} />
                  <BCard icon={<Users className="w-5 h-5 text-gray-500" />} label="Total Employees" value={`${summary.count}`} sub="" />
                </div>
              )}
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="min-w-[150px]">Employee</TableHead>
                        <TableHead className="min-w-[100px]">Monthly Used</TableHead>
                        <TableHead className="min-w-[100px]">Monthly Left</TableHead>
                        <TableHead className="min-w-[100px]">Annual Used</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead className="min-w-[100px]">Annual Left</TableHead>
                        <TableHead className="min-w-[120px]">Emergency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedBalances.map(b => (
                        <TableRow key={b.userId}>
                          <TableCell className="font-medium whitespace-nowrap">{b.firstName} {b.lastName}</TableCell>
                          <TableCell>{formatDuration(allowance(b).usedMonth)} / {formatDuration(MONTHLY_ALLOWANCE_MINUTES)}</TableCell>
                          <TableCell className={allowance(b).leftMonth <= 0 ? "text-red-500" : "text-green-600"}>{formatDuration(allowance(b).leftMonth)}</TableCell>
                          <TableCell>{formatDuration(allowance(b).used)} / {formatDuration(ANNUAL_ALLOWANCE_MINUTES)}</TableCell>
                          <TableCell className={balanceMinutes(b.pendingMinutes, b.pendingHours) > 0 ? "text-amber-600" : ""}>{formatDuration(balanceMinutes(b.pendingMinutes, b.pendingHours))}</TableCell>
                          <TableCell className={allowance(b).leftYear <= 0 ? "text-red-500 font-medium" : "text-green-600 font-medium"}>{formatDuration(allowance(b).leftYear)}</TableCell>
                          <TableCell>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1",
                              b.emergencyUsedThisMonth ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-600")}>
                              <Zap className="w-3 h-3" />
                              {b.emergencyUsedThisMonth ? "Used" : "Available"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {teamPages > 1 && <Pager current={teamPage} total={teamPages} count={allBalances.length} perPage={PER_PAGE} onChange={setTeamPage} />}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={createOpen} onOpenChange={v => { if (!isSubmitting) setCreateOpen(v) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>Submit a new time off request</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">

            <div className="space-y-2">
              <label className="text-sm font-medium">Leave Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setLeaveType("normal"); setNewDate(undefined) }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                    leaveType === "normal"
                      ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  )}
                >
                  <Clock className="w-4 h-4" />
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!emergencyAvailable) {
                      showMsg("Emergency Leave Unavailable",
                        "You have already used your emergency leave for this month. You can only use it once per month.")
                      return
                    }
                    setLeaveType("emergency")
                    setNewDate(new Date())
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors",
                    leaveType === "emergency"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                    !emergencyAvailable && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Emergency
                  {!emergencyAvailable && <span className="text-[10px] ml-1">(used)</span>}
                </button>
              </div>

              {leaveType === "emergency" && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <Zap className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Emergency Leave</p>
                    <p className="text-xs mt-0.5 text-red-600">
                      Can be registered for today immediately — no advance booking required.
                      Limited to <strong>once per month</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              {leaveType === "emergency" ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg text-sm text-gray-700">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  {format(new Date(), "EEEE, MMMM d, yyyy")} <span className="text-xs text-gray-400">(today)</span>
                </div>
              ) : (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, "MMMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={(d: Date | undefined) => { setNewDate(d); setDatePickerOpen(false) }}
                      disabled={isDateDisabled}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                className="h-4 w-4 accent-cyan-500"
                checked={fullDay}
                onChange={e => setFullDay(e.target.checked)}
              />
              Full day
              <span className="text-xs font-normal text-muted-foreground">({formatDuration(FULL_DAY_MINUTES)})</span>
            </label>

            {!fullDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <div className="flex gap-1">
                  <Select value={sH} onValueChange={v => { setSH(v); if (parseInt(v) >= parseInt(eH)) setEH((parseInt(v)+1).toString().padStart(2,"0")) }}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="flex items-center text-muted-foreground">:</span>
                  <Select value={sM} onValueChange={setSM}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <div className="flex gap-1">
                  <Select value={eH} onValueChange={setEH}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.filter(h => parseInt(h) >= parseInt(sH)).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="flex items-center text-muted-foreground">:</span>
                  <Select value={eM} onValueChange={setEM}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{MINUTES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            )}

            <div className="flex items-center gap-2 p-2 bg-cyan-50 rounded-lg">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span className="text-sm font-medium text-cyan-700">
                {diffMin <= 0
                  ? <span className="text-red-500">(invalid time range)</span>
                  : <>{formatDuration(diffMin)}</>
                }
              </span>
              {balance && diffMin > 0 && (
                <span
                  className="text-xs text-cyan-600 ml-auto"
                  title="Remaining / total allowance"
                >
                  Month: {formatDuration(allowance(balance).leftMonth)} / {formatDuration(MONTHLY_ALLOWANCE_MINUTES)} · Year: {formatDuration(allowance(balance).leftYear)} / {formatDuration(ANNUAL_ALLOWANCE_MINUTES)}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason {leaveType === "emergency" && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                placeholder={leaveType === "emergency" ? "Please describe the emergency..." : "Why do you need time off?"}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newDate || diffMin <= 0 || isSubmitting || (leaveType === "emergency" && !newReason.trim())}
              className={leaveType === "emergency" ? "bg-red-500 hover:bg-red-600" : "bg-cyan-500 hover:bg-cyan-600"}
            >
              {isSubmitting ? "Submitting..." : leaveType === "emergency" ? "Submit Emergency" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={v => { if (!isReviewing) setReviewOpen(v) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
            <DialogDescription>Approve or reject this time off request</DialogDescription>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                {reviewTarget.type === "emergency" && (
                  <div className="flex items-center gap-1 text-red-600 font-medium mb-2">
                    <Zap className="w-4 h-4" /> Emergency Leave
                  </div>
                )}
                <p><span className="font-medium">{reviewTarget.userFirstName} {reviewTarget.userLastName}</span></p>
                <p>Date: {reviewTarget.date ? format(parseDateLocal(reviewTarget.date), "EEE, MMM d, yyyy") : "-"}</p>
                <p>Time: <span className="font-mono">{requestTimeRange(reviewTarget, " - ")}</span> ({requestDuration(reviewTarget)})</p>
                {reviewTarget.reason && <p>Reason: {reviewTarget.reason}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Note (optional)</label>
                <Textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={isReviewing}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleReview("rejected")} disabled={isReviewing}><X className="w-4 h-4 mr-1" />Reject</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleReview("approved")} disabled={isReviewing}><Check className="w-4 h-4 mr-1" />Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{msgTitle}</DialogTitle></DialogHeader>
          <p className="text-sm py-2">{msgText}</p>
          <DialogFooter><Button variant="outline" onClick={() => setMsgOpen(false)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BCard({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={cn("bg-white border rounded-xl p-4 flex items-start gap-3", highlight && "border-red-200 bg-red-50/30")}>
      <div className="p-2 bg-gray-50 rounded-lg shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  )
}

function Pager({ current, total, count, perPage, onChange }: { current: number; total: number; count: number; perPage: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <span className="text-sm text-muted-foreground">Showing {(current-1)*perPage+1} to {Math.min(current*perPage, count)} of {count}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(Math.max(1, current-1))} disabled={current===1}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => onChange(Math.min(total, current+1))} disabled={current===total}>Next</Button>
      </div>
    </div>
  )
}
