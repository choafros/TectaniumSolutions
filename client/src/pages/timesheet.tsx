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
import { Loader2, CheckCircle, XCircle, Clock, Upload } from "lucide-react";
import type { Timesheet, Document } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfWeek, addDays } from "date-fns";
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

  // Set default weekStarting to the current week's Monday
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });

  const form = useForm<TimesheetFormData>({
    defaultValues: {
      weekStarting: format(monday, 'yyyy-MM-dd'),
      hours: 40,
    },
  });

  const { data: timesheets, isLoading } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
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
        throw new Error("Failed to submit timesheet. Please try again.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Timesheet submitted successfully",
      });
      form.reset({
        weekStarting: format(monday, 'yyyy-MM-dd'),
        hours: 40,
      });
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

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest("POST", "/api/documents", {
        name: file.name,
        path: `/uploads/${file.name}`, // This is a placeholder path
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to upload document: " + error.message,
        variant: "destructive",
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
            <h1 className="text-3xl font-bold">Timesheets & Documents</h1>
            <p className="text-muted-foreground mt-2">
              {user?.role === "admin"
                ? "Review and approve submitted timesheets and documents"
                : "Submit and track your work hours and documents"}
            </p>
          </div>
        </div>

        {user?.role === "candidate" && (
          <>
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

            <div className="mb-8 bg-card p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
              <div className="space-y-4">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDocument.mutate(file);
                  }}
                />
                <div className="text-sm text-muted-foreground">
                  Upload your certifications, qualifications, or other relevant documents
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-8">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week Starting</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  {user?.role === "admin" && (
                    <>
                      <TableHead>Employee</TableHead>
                      <TableHead>Actions</TableHead>
                    </>
                  )}
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
                      {statusIcons[timesheet.status as keyof typeof statusIcons]}
                      <span className="capitalize">{timesheet.status}</span>
                    </TableCell>
                    {user?.role === "admin" && (
                      <>
                        <TableCell>Employee #{timesheet.userId}</TableCell>
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
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {documents && documents.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    {user?.role === "admin" && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>
                        {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Download
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}