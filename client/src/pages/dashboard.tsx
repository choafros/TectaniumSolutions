import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import NavBar from "@/components/nav-bar";
import { Loader2, Calendar, FileText, Building2, Users, Bell } from "lucide-react";
import type { Company, Document, Timesheet } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: timesheets, isLoading: loadingTimesheets } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: user?.role === "admin",
  });

  if (loadingDocs || loadingTimesheets || loadingCompanies) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const pendingTimesheets = timesheets?.filter(t => t.status === "pending") || [];
  const pendingDocuments = documents?.filter(d => !d.approved) || [];

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground mt-2">
            {user?.role === "admin" 
              ? "Manage your organization's resources and approvals"
              : user?.role === "client"
              ? "Access your company's services and resources"
              : "Track your work and manage your documents"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user?.role === "candidate" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timesheets
                  </CardTitle>
                  <CardDescription>Manage your work hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{timesheets?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Total submissions</p>
                    <Link href="/timesheet">
                      <Button className="w-full mt-4">Submit Hours</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </CardTitle>
                  <CardDescription>Your uploaded documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{documents?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Files uploaded</p>
                    <Button className="w-full mt-4">Upload Document</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {user?.role === "admin" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Companies
                  </CardTitle>
                  <CardDescription>Registered organizations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">{companies?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Total companies</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Pending Approvals
                  </CardTitle>
                  <CardDescription>Items needing your attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p>Timesheets</p>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                        {pendingTimesheets.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p>Documents</p>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                        {pendingDocuments.length}
                      </span>
                    </div>
                    <Link href="/timesheet">
                      <Button variant="outline" className="w-full mt-4">View All</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Recent Timesheet Submissions</CardTitle>
                  <CardDescription>Latest timesheet entries from all users</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTimesheets.slice(0, 5).map((timesheet) => (
                        <TableRow key={timesheet.id}>
                          <TableCell>
                            {format(new Date(timesheet.weekStarting), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>Employee #{timesheet.userId}</TableCell>
                          <TableCell>{timesheet.hours}</TableCell>
                          <TableCell>
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                              Pending
                            </span>
                          </TableCell>
                          <TableCell>
                            <Link href="/timesheet">
                              <Button variant="outline" size="sm">Review</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Recent Document Uploads</CardTitle>
                  <CardDescription>Latest document submissions from candidates</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents?.slice(0, 5).map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.name}</TableCell>
                          <TableCell>Employee #{doc.userId}</TableCell>
                          <TableCell>
                            {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">View</Button>
                              <Button variant="outline" size="sm">Approve</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {user?.role === "client" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Projects
                </CardTitle>
                <CardDescription>Current engagements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Ongoing projects</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}