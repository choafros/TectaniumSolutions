import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw, Trash2, PencilLine, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import type { Timesheet, DailyHours } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, endOfWeek, isMonday, addDays, getWeek } from "date-fns";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { SearchInput } from "@/components/ui/search";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { calculateNormalAndOvertimeHours } from "@/lib/timesheet-utils";

// Add the getWeekRange function back near the top of the file
// Add utility function for date range display
function getWeekRange(date: Date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return {
    start: format(weekStart, "MMM d, yyyy"),
    end: format(weekEnd, "MMM d, yyyy"),
    weekNumber: getWeek(date, { weekStartsOn: 1 }),
  };
}

type User = {
  id?: number;
  role?: "admin" | "candidate";
};

type TimesheetWithUser = Timesheet & { username: string };

const statusIcons = {
  draft: <Clock className="h-5 w-5 text-blue-500" />,
  pending: <Clock className="h-5 w-5 text-yellow-500" />,
  approved: <CheckCircle className="h-5 w-5 text-green-500" />,
  rejected: <XCircle className="h-5 w-5 text-red-500" />,
} as const;

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "17:00";

const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const TimesheetFormSchema = z.object({
  weekStarting: z.string().refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });

    return !isNaN(selectedDate.getTime()) &&
           isMonday(selectedDate) &&
           selectedDate <= today;
  }, "Please select a Monday from current or past weeks"),
  dailyHours: z.record(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']), timeSlotSchema),
});

type TimesheetFormData = z.infer<typeof TimesheetFormSchema>;

function TimesheetHeader() {
  return (
    <Card className="mb-8 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-none">
      <CardHeader>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
          Timesheets
        </h1>
        <p className="text-muted-foreground">
          Track and manage work hours with ease
        </p>
      </CardHeader>
    </Card>
  );
}


function TimesheetList({
  timesheets,
  heading,
  user,
  onSubmit,
  onUpdate,
  onDelete,
  onEdit,
  onResubmit,
  setSelectedTimesheet,
  setEditModalOpen,
  settings,
}: {
  timesheets: TimesheetWithUser[];
  heading?: string;
  user: User;
  onSubmit: (id: number) => void;
  onUpdate: (data: { id: number; status?: "approved" | "rejected" | "pending"; dailyHours?: DailyHours }) => void;
  onDelete: (id: number) => void;
  onEdit: (timesheet: TimesheetWithUser) => void;
  onResubmit: (timesheet: Timesheet) => void;
  setSelectedTimesheet: (timesheet: TimesheetWithUser | null) => void;
  setEditModalOpen: (open: boolean) => void;
  settings: {
    normalStartTime: string;
    normalEndTime: string;
    overtimeStartTime: string;
    overtimeEndTime: string;
    normalRate: string;
    overtimeRate: string;
  } | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTimesheets = timesheets
    .filter(timesheet => {
      if (!searchQuery.trim()) return true;
      return timesheet.username.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Sort by weekStarting in descending order (newest first)
      return new Date(b.weekStarting).getTime() - new Date(a.weekStarting).getTime();
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredTimesheets.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTimesheets = filteredTimesheets.slice(startIndex, startIndex + pageSize);

  // Update heading to include week number for current week
  let displayHeading = heading;
  if (heading === "Current Week" && paginatedTimesheets.length > 0) {
    const weekInfo = getWeekRange(new Date(paginatedTimesheets[0].weekStarting));
    displayHeading = `Current Week (${weekInfo.weekNumber})`;
  }

  // Reset to first page when changing page size
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  return (
    <div className="space-y-4">
      {displayHeading && <h3 className="text-lg font-semibold">{displayHeading}</h3>}
      <div className="flex justify-between items-center">
        {user?.role === "admin" && (
          <div className="max-w-sm">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search employee..."
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Week Range</TableHead>
              <TableHead>Total Hours</TableHead>
              {user?.role === "admin" && (
                <>
                  <TableHead>Normal Hours</TableHead>
                  <TableHead>Overtime Hours</TableHead>
                  <TableHead>Total Cost (£)</TableHead>
                </>
              )}
              <TableHead>Status</TableHead>
              {user?.role === "admin" && (
                <>
                  <TableHead className="min-w-[150px]">Employee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </>
              )}
              {user?.role === "candidate" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTimesheets.map((timesheet) => {
              // Calculate week range
              const weekRange = getWeekRange(new Date(timesheet.weekStarting));

              // Calculate normal and overtime hours for admin view
              let totalNormalHours = 0;
              let totalOvertimeHours = 0;
              let totalCost = 0;

              if (user?.role === "admin" && settings) {
                Object.values(timesheet.dailyHours).forEach(dayHours => {
                  const { normalHours, overtimeHours } = calculateNormalAndOvertimeHours(dayHours, settings);
                  totalNormalHours += normalHours;
                  totalOvertimeHours += overtimeHours;
                });

                totalCost = (totalNormalHours * parseFloat(settings.normalRate)) +
                           (totalOvertimeHours * parseFloat(settings.overtimeRate));
              }

              return (
                <TableRow
                  key={timesheet.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    // Only show edit modal if clicking the row directly
                    if (e.target === e.currentTarget || e.target instanceof HTMLTableCellElement) {
                      setSelectedTimesheet(timesheet);
                      setEditModalOpen(true);
                    }
                  }}
                >
                  <TableCell>
                    <div>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">
                          {weekRange.start}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          to {weekRange.end}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{timesheet.totalHours}</TableCell>
                  {user?.role === "admin" && (
                    <>
                      <TableCell>{totalNormalHours.toFixed(2)}</TableCell>
                      <TableCell>{totalOvertimeHours.toFixed(2)}</TableCell>
                      <TableCell>£{totalCost.toFixed(2)}</TableCell>
                    </>
                  )}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {statusIcons[timesheet.status as keyof typeof statusIcons]}
                      <span className="capitalize">{timesheet.status}</span>
                    </div>
                  </TableCell>
                  {user?.role === "admin" && (
                    <>
                      <TableCell>
                        <span className="truncate block max-w-[150px]" title={timesheet.username}>
                          {timesheet.username}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(timesheet);
                            }}
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onUpdate({
                                  id: timesheet.id,
                                  status: "approved",
                                })}
                                disabled={timesheet.status === "approved" || timesheet.status === "draft"}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onUpdate({
                                  id: timesheet.id,
                                  status: "rejected",
                                })}
                                disabled={timesheet.status === "rejected" || timesheet.status === "draft"}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(timesheet.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </>
                  )}
                  {user?.role !== "admin" && (
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        {(timesheet.status === "draft" || timesheet.status === "rejected") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(timesheet);
                              }}
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdate({
                                  id: timesheet.id,
                                  status: "pending",
                                });
                              }}
                            >
                              Submit
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Enhanced Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredTimesheets.length)} of {filteredTimesheets.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimesheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const defaultDailyHours = DAYS_OF_WEEK.reduce((acc, day) => ({
    ...acc,
    [day]: { start: DEFAULT_START_TIME, end: DEFAULT_END_TIME }
  }), {} as DailyHours);

  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(TimesheetFormSchema),
    defaultValues: {
      weekStarting: format(monday, "yyyy-MM-dd"),
      dailyHours: defaultDailyHours,
    },
  });

  const { data: timesheets = [], isLoading, refetch } = useQuery<TimesheetWithUser[]>({
    queryKey: ["/api/timesheets"],
    staleTime: 0,
    gcTime: 0,
  });

  const populateForm = (timesheet: Timesheet) => {
    form.reset({
      weekStarting: format(new Date(timesheet.weekStarting), "yyyy-MM-dd"),
      dailyHours: timesheet.dailyHours as DailyHours,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setDefaultHours = (day: keyof DailyHours) => {
    const currentValues = form.getValues("dailyHours");
    form.setValue("dailyHours", {
      ...currentValues,
      [day]: { start: DEFAULT_START_TIME, end: DEFAULT_END_TIME }
    });
  };

  const clearHours = (day: keyof DailyHours) => {
    const currentValues = form.getValues("dailyHours");
    form.setValue("dailyHours", {
      ...currentValues,
      [day]: { start: "", end: "" }
    });
  };

  const saveTimesheet = useMutation({
    mutationFn: async (data: TimesheetFormData) => {
      const totalHours = calculateTotalHours(data.dailyHours);
      const res = await apiRequest("POST", "/api/timesheets", {
        weekStarting: new Date(data.weekStarting).toISOString(),
        dailyHours: data.dailyHours,
        totalHours,
        status: "draft",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet saved as draft",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitTimesheet = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/timesheets/${id}`, {
        status: "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet submitted for approval",
      });
      form.reset({
        weekStarting: format(monday, "yyyy-MM-dd"),
        dailyHours: defaultDailyHours,
      });
      refetch();
    },
  });

  const updateTimesheet = useMutation({
    mutationFn: async ({
      id,
      status,
      dailyHours,
    }: {
      id: number;
      status?: "approved" | "rejected" | "pending";
      dailyHours?: DailyHours;
    }) => {
      const payload: any = {};
      if (status) payload.status = status;
      if (dailyHours) {
        payload.dailyHours = dailyHours;
        payload.totalHours = calculateTotalHours(dailyHours);
      }

      const res = await apiRequest("PATCH", `/api/timesheets/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet updated successfully",
      });
      setSelectedTimesheet(null);
      setEditModalOpen(false);
      refetch();
    },
  });

  const deleteTimesheet = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timesheets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet deleted successfully",
      });
      refetch();
    },
  });

  const { data: settingsData } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/settings");
        return res.json();
      } catch (error) {
        return {
          normalStartTime: "09:00",
          normalEndTime: "17:00",
          overtimeStartTime: "17:00",
          overtimeEndTime: "22:00",
          normalRate: "20.00",
          overtimeRate: "35.00",
        };
      }
    },
    enabled: user?.role === "admin",
  });


  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </DashboardLayout>
    );
  }

  const filteredTimesheets = user?.role === "admin"
    ? timesheets
    : timesheets.filter((t) => t.userId === user?.id);

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { current: currentWeekTimesheets, past: pastWeekTimesheets } = filteredTimesheets.reduce(
    (acc: { current: TimesheetWithUser[]; past: TimesheetWithUser[] }, timesheet) => {
      const weekStart = new Date(timesheet.weekStarting);
      if (weekStart.getTime() === currentWeekStart.getTime()) {
        acc.current.push(timesheet);
      } else {
        acc.past.push(timesheet);
      }
      return acc;
    },
    { current: [], past: [] }
  );

  return (
    <DashboardLayout>
      <TimesheetHeader />
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            {user?.role === "admin"
              ? "Review and manage submitted timesheets"
              : "Submit and track your work hours"}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-10 w-10"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {user?.role === "candidate" && (
        <div className="mb-8 bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Submit New Timesheet</h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => saveTimesheet.mutate(data))}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="weekStarting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week Starting</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Select a Monday as the start of your work week
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-6">
                <h3 className="font-medium">Daily Hours</h3>
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`dailyHours.${day}.start`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="capitalize">{day} Start</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`dailyHours.${day}.end`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="capitalize">{day} End</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex gap-2 text-sm">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setDefaultHours(day)}
                      >
                        Set working hours (9-5)
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => clearHours(day)}
                      >
                        Not working
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {user?.role !== "admin" && (
                  <Button
                    type="submit"
                    disabled={saveTimesheet.isPending}
                    className="w-full md:w-auto"
                  >
                    {saveTimesheet.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save as Draft
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      )}

      {user?.role === "admin" ? (
        <>
          {currentWeekTimesheets.length > 0 && (
            <div className="mb-8">
              <TimesheetList
                heading="Current Week"
                timesheets={currentWeekTimesheets}
                user={user}
                onSubmit={submitTimesheet.mutate}
                onUpdate={updateTimesheet.mutate}
                onDelete={deleteTimesheet.mutate}
                onEdit={(timesheet) => {
                  setSelectedTimesheet(timesheet);
                  setEditModalOpen(true);
                }}
                onResubmit={populateForm}
                setSelectedTimesheet={setSelectedTimesheet}
                setEditModalOpen={setEditModalOpen}
                settings={settingsData}
              />
            </div>
          )}

          {pastWeekTimesheets.length > 0 && (
            <div>
              <TimesheetList
                heading="Past Weeks"
                timesheets={pastWeekTimesheets}
                user={user}
                onSubmit={submitTimesheet.mutate}
                onUpdate={updateTimesheet.mutate}
                onDelete={deleteTimesheet.mutate}
                onEdit={(timesheet) => {
                  setSelectedTimesheet(timesheet);
                  setEditModalOpen(true);
                }}
                onResubmit={populateForm}
                setSelectedTimesheet={setSelectedTimesheet}
                setEditModalOpen={setEditModalOpen}
                settings={settingsData}
              />
            </div>
          )}
        </>
      ) : (
        <TimesheetList
          timesheets={filteredTimesheets}
          user={user}
          onSubmit={submitTimesheet.mutate}
          onUpdate={updateTimesheet.mutate}
          onDelete={deleteTimesheet.mutate}
          onEdit={(timesheet) => {
            setSelectedTimesheet(timesheet);
            setEditModalOpen(true);
          }}
          onResubmit={populateForm}
          setSelectedTimesheet={setSelectedTimesheet}
          setEditModalOpen={setEditModalOpen}
          settings={settingsData}
        />
      )}

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Timesheet</DialogTitle>
            <DialogDescription>
              Edit timesheet for week starting {selectedTimesheet && format(new Date(selectedTimesheet.weekStarting), "MMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          {selectedTimesheet && (
            <div className="space-y-4 py-4">
              {DAYS_OF_WEEK.map((day) => {
                const hours = selectedTimesheet.dailyHours[day] || { start: "", end: "" };
                return (
                  <div key={day} className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium capitalize">{day} Start</label>
                        <Input
                          type="time"
                          value={hours.start}
                          onChange={(e) => {
                            const updatedTimesheet = {
                              ...selectedTimesheet,
                              dailyHours: {
                                ...selectedTimesheet.dailyHours,
                                [day]: {
                                  ...hours,
                                  start: e.target.value,
                                },
                              },
                            };
                            setSelectedTimesheet(updatedTimesheet);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium capitalize">{day} End</label>
                        <Input
                          type="time"
                          value={hours.end}
                          onChange={(e) => {
                            const updatedTimesheet = {
                              ...selectedTimesheet,
                              dailyHours: {
                                ...selectedTimesheet.dailyHours,
                                [day]: {
                                  ...hours,
                                  end: e.target.value,
                                },
                              },
                            };
                            setSelectedTimesheet(updatedTimesheet);
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => {
                          const updatedTimesheet = {
                            ...selectedTimesheet,
                            dailyHours: {
                              ...selectedTimesheet.dailyHours,
                              [day]: { start: DEFAULT_START_TIME, end: DEFAULT_END_TIME },
                            },
                          };
                          setSelectedTimesheet(updatedTimesheet);
                        }}
                      >
                        Set working hours (9-5)
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => {
                          const updatedTimesheet = {
                            ...selectedTimesheet,
                            dailyHours: {
                              ...selectedTimesheet.dailyHours,
                              [day]: { start: "", end: "" },
                            },
                          };
                          setSelectedTimesheet(updatedTimesheet);
                        }}
                      >
                        Not working
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 mt-4 sticky bottom-0 bg-background py-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateTimesheet.mutate({
                      id: selectedTimesheet.id,
                      dailyHours: selectedTimesheet.dailyHours,
                    });
                  }}
                  disabled={updateTimesheet.isPending}
                >
                  {updateTimesheet.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function calculateTotalHours(dailyHours: DailyHours) {
  return Object.values(dailyHours).reduce((total, { start, end }) => {
    if (!start || !end) return total;
    const startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    return total + (hours > 0 ? hours : 0);
  }, 0);
}

export default TimesheetPage;