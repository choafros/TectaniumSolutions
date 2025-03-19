import React, { useState, useEffect } from "react";
import {
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogTrigger, 
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Trash2, Check, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginatedUserListProps {
  users: any[];
  currentUser: any;
  updateUser: any;
  updateRates: any;
  deleteUser: any;
  pageSize?: number;
}

export function PaginatedUserList({ 
  users, 
  currentUser, 
  updateUser,
  updateRates,
  deleteUser, 
  pageSize = 10
}: PaginatedUserListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<{ id: number; normalRate: string; overtimeRate: string } | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle input change in editable cells
  const handleInputChange = (
    userId: number, 
    field: "normalRate" | "overtimeRate", 
    value: string, 
    currentUserRates?: { normalRate: string; overtimeRate: string } // Make optional
  ) => {
    setEditingUser((prev) => ({
      id: userId,
      normalRate: field === "normalRate" 
        ? value 
        : prev?.normalRate ?? currentUserRates?.normalRate ?? "0", // Ensure fallback
      overtimeRate: field === "overtimeRate" 
        ? value 
        : prev?.overtimeRate ?? currentUserRates?.overtimeRate ?? "0", // Ensure fallback
    }));
    setUnsavedChanges(true);
  };
  
  
  

  // Save updated rates
  const handleSave = () => {
    if (editingUser) {
      updateRates.mutate({
        id: editingUser.id,
        normalRate: parseFloat(editingUser.normalRate),
        overtimeRate: parseFloat(editingUser.overtimeRate),
      });
      setEditingUser(null);
      setUnsavedChanges(false);
    }
  };

  // Warn before leaving if there are unsaved changes
  useEffect(() => {
    const warnUser = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", warnUser);
    return () => window.removeEventListener("beforeunload", warnUser);
  }, [unsavedChanges]);

  return (
    <>
      <TableBody>
        {users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((listUser) => (
          <TableRow key={listUser.id}>
            <TableCell>{listUser.username}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {listUser.role}
              </Badge>
            </TableCell>
            <TableCell>
              {listUser.companyId ? `Organization #${listUser.companyId}` : "-"}
            </TableCell>

            {/* Editable Normal Rate */}
            <TableCell>
            <input
              type="number"
              className="border rounded px-2 py-1 w-20"
              value={editingUser?.id === listUser.id ? editingUser.normalRate : listUser.normalRate}
              onChange={(e) => handleInputChange(listUser.id, "normalRate", e.target.value, listUser)}
            />
            </TableCell>

            {/* Editable Overtime Rate */}
            <TableCell>
            <input
              type="number"
              className="border rounded px-2 py-1 w-20"
              value={editingUser?.id === listUser.id ? editingUser.overtimeRate : listUser.overtimeRate}
              onChange={(e) => handleInputChange(listUser.id, "overtimeRate", e.target.value, listUser)}
            />
            </TableCell>

            {/* Save Button (Appears when rates change) */}
            <TableCell>
            <Button
              variant="outline"
              size="sm"
              className={`transition-opacity ${
                editingUser?.id === listUser.id
                  ? "bg-green-500 text-white hover:bg-green-400 opacity-100"
                  : "bg-gray-300 text-gray-500 opacity-50 pointer-events-none"
              }`}
              onClick={() => {
                if (!editingUser) return; // Prevents potential null reference errors

                updateRates.mutate({
                  id: editingUser.id,
                  normalRate: parseFloat(editingUser.normalRate),
                  overtimeRate: parseFloat(editingUser.overtimeRate),
                });

                // Reset button after updating
                setTimeout(() => {
                  setEditingUser(null);
                }, 500);
              }}
              disabled={!editingUser || updateRates.isPending} // Disables if no changes
            >
              <Check className="h-4 w-4" />
            </Button>

            </TableCell>

            {/* Status Badge */}
            <TableCell>
              <Badge variant={listUser.active ? "default" : "destructive"}>
                {listUser.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>

            {/* Three Dots Menu */}
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => updateUser.mutate({ id: listUser.id, active: !listUser.active })}
                    disabled={updateUser.isPending}
                  >
                    {listUser.active ? "Deactivate User" : "Activate User"}
                  </DropdownMenuItem>

                  {listUser.id !== currentUser.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-red-600">
                          Delete User
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteUser.mutate(listUser.id)}
                            disabled={deleteUser.isPending}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      
      {/* Pagination */}
      {Math.ceil(users.length / pageSize) > 1 && (
        <tfoot>
          <tr>
            <td colSpan={7}>
              <Pagination className="my-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    />
                  </PaginationItem>
                  {[...Array(Math.ceil(users.length / pageSize))].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => handlePageChange(i + 1)}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(Math.ceil(users.length / pageSize), currentPage + 1))}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </td>
          </tr>
        </tfoot>
      )}
    </>
  );
}
