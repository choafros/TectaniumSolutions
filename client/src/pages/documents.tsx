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
import { Loader2, Upload } from "lucide-react";
import type { Document } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiRequest("POST", "/api/documents", {
        name: file.name,
        path: `/uploads/${file.name}`, 
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

  const approveDocument = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/documents/${id}`, {
        approved: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document approved successfully",
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

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground mt-2">
          {user?.role === "admin"
            ? "Review and approve submitted documents"
            : "Upload and manage your documents"}
        </p>
      </div>

      {user?.role === "candidate" && (
        <div className="mb-8 bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
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
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead className="whitespace-nowrap">Upload Date</TableHead>
              <TableHead>Status</TableHead>
              {user?.role === "admin" && (
                <>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead className="whitespace-nowrap">Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents?.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.approved
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {doc.approved ? "Approved" : "Pending"}
                  </span>
                </TableCell>
                {user?.role === "admin" && (
                  <>
                    <TableCell>
                      {(doc as any).username || `Employee #${doc.userId}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveDocument.mutate(doc.id)}
                          disabled={doc.approved}
                        >
                          {doc.approved ? "Approved" : "Approve"}
                        </Button>
                        <Button size="sm" variant="outline">
                          Download
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