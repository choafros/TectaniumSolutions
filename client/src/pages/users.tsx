import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Table, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { PaginatedUserList } from "@/components/PaginatedUserList";
import DashboardLayout from "@/components/dashboard-layout";
import type { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users using the requested useQuery structure
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
    staleTime: 0, // Ensure data is always considered stale
    cacheTime: 0, // Invalidate cache immediately after fetch
  });

  // Update user active status
  const updateUser = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { active });

      if (res.ok) {
        return { success: true };
      }

      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
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
  // update user rates
  const updateRates = useMutation({
    mutationFn: async ({ id, normalRate, overtimeRate }: { id: number; normalRate: number; overtimeRate: number }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/rates`, { normalRate, overtimeRate });
  
      if (res.ok) {
        return { success: true };
      }
  
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update user rates");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User rates updated successfully",
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
  

  // Delete user
  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
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
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Overtime Rate</TableHead>
              <TableHead>Save Changes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <PaginatedUserList 
            users={users || []} 
            currentUser={user} 
            updateUser={updateUser}
            updateRates={updateRates}
            deleteUser={deleteUser}
            pageSize={5}
          />
        </Table>
      </div>
    </DashboardLayout>
  );
}
