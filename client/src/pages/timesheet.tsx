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
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Timesheet } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
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

const statusIcons = {
  pending: <Clock className="h-5 w-5 text-yellow-500" />,
  approved: <CheckCircle className="h-5 w-5 text-green-500" />,
  rejected: <XCircle className="h-5 w-5 text-red-500" />,
} as const;

type TimesheetFormData = {
  weekStarting: string;
  hours: number;
};

export default function TimesheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TimesheetFormData>({
    defaultValues: {
      weekStarting: format(new Date(), 'yyyy-MM-dd'),
      hours: 40,
    },
  });

  const { data: timesheets, isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const submitTimesheet = useMutation({
    mutationFn: async (data: TimesheetFormData) => {
      try {
        const res = await apiRequest("POST", "/api/timesheets", {
          weekStarting: new Date(data.weekStarting).toISOString(),
          hours: Number(data.hours),
        });
        return res.json();
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to submit timesheet");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet submitted successfully",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTimesheet = useMutation({
    mutationFn: async ({
      id,
      status,
      hours,
    }: {
      id: number;
      status?: "approved" | "rejected";
      hours?: number;
    }) => {
      const res = await apiRequest("PATCH", `/api/timesheets/${id}`, { status, hours });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet updated successfully",
      });
    },
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

  // Filter timesheets based on user role
  const filteredTimesheets = user?.role === "admin" 
    ? timesheets 
    : timesheets?.filter(t => t.userId === user?.id);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Timesheets</h1>
        <p className="text-muted-foreground mt-2">
          {user?.role === "admin"
            ? "Review and manage submitted timesheets"
            : "Submit and track your work hours"}
        </p>
      </div>

      {user?.role === "candidate" && (
        <div className="mb-8 bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Submit New Timesheet</h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => submitTimesheet.mutate(data))}
              className="space-y-4"
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
                      Select the Monday of the week you're submitting hours for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Hours</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="168" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter your total hours for the week
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={submitTimesheet.isPending}
                className="w-full md:w-auto"
              >
                {submitTimesheet.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Timesheet
              </Button>
            </form>
          </Form>
        </div>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Week Starting</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              {user?.role === "admin" && (
                <>
                  <TableHead>Employee</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTimesheets?.map((timesheet) => (
              <TableRow key={timesheet.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(timesheet.weekStarting), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {user?.role === "admin" ? (
                    <Input
                      type="number"
                      defaultValue={timesheet.hours}
                      className="w-20"
                      onBlur={(e) => {
                        const newHours = parseInt(e.target.value);
                        if (newHours !== timesheet.hours) {
                          updateTimesheet.mutate({
                            id: timesheet.id,
                            hours: newHours,
                          });
                        }
                      }}
                    />
                  ) : (
                    timesheet.hours
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {statusIcons[timesheet.status as keyof typeof statusIcons]}
                    <span className="capitalize">{timesheet.status}</span>
                  </div>
                </TableCell>
                {user?.role === "admin" && (
                  <>
                    <TableCell>
                      {(timesheet as any).username || `User ${timesheet.userId}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTimesheet.mutate({
                              id: timesheet.id,
                              status: "approved",
                            })
                          }
                          disabled={timesheet.status === "approved"}
                        >
                          {timesheet.status === "approved" ? "Approved" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTimesheet.mutate({
                              id: timesheet.id,
                              status: "rejected",
                            })
                          }
                          disabled={timesheet.status === "rejected"}
                        >
                          {timesheet.status === "rejected" ? "Rejected" : "Reject"}
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}