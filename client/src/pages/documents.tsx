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
import { Loader2, Trash2 } from "lucide-react";
import type { Document } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
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

  const deleteDocument = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
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

  // Filter documents based on user role
  const filteredDocuments = user?.role === "admin" 
    ? documents 
    : documents?.filter(d => d.userId === user?.id);

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
            {filteredDocuments?.map((doc) => (
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
                      {(doc as any).username}
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

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this document? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDocument.mutate(doc.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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