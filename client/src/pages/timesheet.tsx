import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import NavBar from "@/components/nav-bar";
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

const statusIcons = {
  pending: <Clock className="h-5 w-5 text-yellow-500" />,
  approved: <CheckCircle className="h-5 w-5 text-green-500" />,
  rejected: <XCircle className="h-5 w-5 text-red-500" />,
};

export default function TimesheetPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: timesheets, isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const submitTimesheet = useMutation({
    mutationFn: async (data: { weekStarting: Date; hours: number }) => {
      const res = await apiRequest("POST", "/api/timesheets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet submitted successfully",
      });
    },
  });

  const updateTimesheet = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "approved" | "rejected";
    }) => {
      const res = await apiRequest("PATCH", `/api/timesheets/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet status updated",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Timesheets</h1>
            <p className="text-muted-foreground mt-2">
              {user?.role === "admin"
                ? "Review and approve submitted timesheets"
                : "Submit and track your work hours"}
            </p>
          </div>

          {user?.role === "candidate" && (
            <Button
              onClick={() =>
                submitTimesheet.mutate({
                  weekStarting: new Date(),
                  hours: 40,
                })
              }
              disabled={submitTimesheet.isPending}
            >
              {submitTimesheet.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Hours
            </Button>
          )}
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week Starting</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                {user?.role === "admin" && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheets?.map((timesheet) => (
                <TableRow key={timesheet.id}>
                  <TableCell>
                    {format(new Date(timesheet.weekStarting), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{timesheet.hours}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {statusIcons[timesheet.status]}
                    <span className="capitalize">{timesheet.status}</span>
                  </TableCell>
                  {user?.role === "admin" && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateTimesheet.mutate({
                              id: timesheet.id,
                              status: "approved",
                            })
                          }
                          disabled={
                            timesheet.status !== "pending" ||
                            updateTimesheet.isPending
                          }
                        >
                          Approve
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
                          disabled={
                            timesheet.status !== "pending" ||
                            updateTimesheet.isPending
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
