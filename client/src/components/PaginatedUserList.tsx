// src/components/PaginatedUserList.tsx
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
import { Trash2 } from "lucide-react";
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
  deleteUser: any;
  pageSize?: number;
}

export function PaginatedUserList({ 
  users, 
  currentUser, 
  updateUser, 
  deleteUser, 
  pageSize = 10
}: PaginatedUserListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate total pages
  const totalPages = Math.ceil(users.length / pageSize);
  
  // Get current page data
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = users.slice(startIndex, startIndex + pageSize);

  console.log("Rendering Pagination: Total Pages =", totalPages, "Current Page =", currentPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Ensure we're not on an empty page after deletion
  useEffect(() => {
    if (currentPage > 1 && paginatedUsers.length === 0 && users.length > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [users.length, currentPage, paginatedUsers.length]);
  console.log("Paginated Users:", paginatedUsers);
  console.log("Start Index:", startIndex);
  console.log("End Index:", startIndex + pageSize);
  
  return (
    <>
      <TableBody>
        {paginatedUsers.map((listUser) => (
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
            <TableCell>
              <Badge
                variant={listUser.active ? "default" : "destructive"}
              >
                {listUser.active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateUser.mutate({
                      id: listUser.id,
                      active: !listUser.active,
                    })
                  }
                  disabled={updateUser.isPending}
                >
                  {listUser.active ? "Deactivate" : "Activate"}
                </Button>

                {listUser.id !== currentUser.id && (
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
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      
      {totalPages > 1 && (
        <tfoot>
          <tr>
            <td colSpan={5}>
            <Pagination className="my-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => (
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
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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