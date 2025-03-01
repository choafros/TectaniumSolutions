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
import DashboardLayout from "@/components/dashboard-layout";
import { Calendar, FileText, Building2, Users, Bell } from "lucide-react";
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
    return <DashboardLayout>Loading...</DashboardLayout>;
  }

  // Filter data based on user role
  const userDocuments = user?.role === "admin" 
    ? documents 
    : documents?.filter(d => d.userId === user?.id);

  const userTimesheets = user?.role === "admin"
    ? timesheets
    : timesheets?.filter(t => t.userId === user?.id);

  const pendingTimesheets = timesheets?.filter(t => t.status === "pending") || [];
  const pendingDocuments = documents?.filter(d => !d.approved) || [];

  return (
    <DashboardLayout>
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
                  <p className="text-2xl font-bold">{userTimesheets?.length || 0}</p>
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
                  <p className="text-2xl font-bold">{userDocuments?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Files uploaded</p>
                  <Link href="/documents">
                    <Button className="w-full mt-4">Upload Document</Button>
                  </Link>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users
                </CardTitle>
                <CardDescription>Manage system users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/users">
                    <Button className="w-full">Manage Users</Button>
                  </Link>
                </div>
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
    </DashboardLayout>
  );
}