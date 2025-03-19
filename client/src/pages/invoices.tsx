import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Invoice, Timesheet } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Printer,
  RefreshCw,
  MoreVertical,
  Trash,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SearchInput } from "@/components/ui/search";
import { calculateNormalAndOvertimeHours } from "@/lib/timesheet-utils";

type InvoiceWithUser = Invoice & { username: string; timesheets?: Timesheet[] };

// Helper function to safely convert string/decimal to number
function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}

const VAT_RATES = [
  { label: "No VAT", value: "0" },
  { label: "5% VAT", value: "5" },
  { label: "20% VAT", value: "20" },
];

const CIS_RATES = [
  { label: "No CIS", value: "0" },
  { label: "Default (20%)", value: "20" },
  { label: "Higher (30%)", value: "30" },
];

function calculateInvoiceTotal(
  subtotal: number,
  vatRate: number,
  cisRate: number,
) {
  const vatAmount = subtotal * (vatRate / 100);
  const cisAmount = subtotal * (cisRate / 100);
  return subtotal + vatAmount - cisAmount;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [vatRate, setVatRate] = useState<string>("20");
  const [cisRate, setCisRate] = useState<string>("0");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceWithUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);
  const [selectedTimesheets, setSelectedTimesheets] = useState<Timesheet []>([]);
  const [userTotal, setUserTotal] = useState(0);


  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin",
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<
    InvoiceWithUser[]
  >({
    queryKey: ["/api/invoices"],
    enabled: user?.role === "admin",
  });

  const { data: timesheets = [] } = useQuery<Timesheet[]>({
    queryKey: ["/api/timesheets"],
    enabled: user?.role === "admin",
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating invoice with data:", data);
      if (
        !data.timesheetIds ||
        !Array.isArray(data.timesheetIds) ||
        data.timesheetIds.length === 0
      ) {
        throw new Error("Please select at least one timesheet");
      }

      try {
        const res = await apiRequest("POST", "/api/invoices", data);
        console.log("API Response:", res);

        if (!res.ok) {
          const error = await res.json();
          console.error("API Error:", error);
          throw new Error(error.message || "Failed to create invoice");
        }

        return res.json();
      } catch (error) {
        console.error("Request failed:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      setSelectedTimesheets([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete invoice");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: linkedTimesheets = [], isLoading: loadingTimesheets } = useQuery({
      queryKey: ["/api/invoices", selectedInvoice?.id, "timesheets"],
      queryFn: async () => {
        if (!selectedInvoice?.id) return [];
        const res = await apiRequest( "GET", `/api/invoices/${selectedInvoice.id}/timesheets`,);
        const data = await res.json();
        console.log("Fetched timesheets:", data); // Debug log
        return data;
      },
      enabled: !!selectedInvoice?.id,
    });

  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div>Coming soon...</div>
      </DashboardLayout>
    );
  }

  if (loadingUsers || loadingInvoices) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </DashboardLayout>
    );
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery.trim()) return true;
    return (
      (invoice.username?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (invoice.referenceNumber?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      )
    );
  });

  const getApprovedTimesheets = (userId: number) => {
    if (!Array.isArray(timesheets)) return [];
    return timesheets.filter((timesheet) => {
      return (
        timesheet.userId === userId &&
        timesheet.status === "approved" &&
        timesheet.status !== "invoiced"
      );
    });
  };

  // Calculate total based on timesheets data
  const calculateUserTotal = (selectedTimesheets: Timesheet[]) => {

    let totalNormalHours = 0;
    let totalOvertimeHours = 0;
    let subtotal = 0;

    selectedTimesheets.forEach((timesheet) => {
      // Use stored values from timesheet; these can be strings so we convert them
       let normalHours = toNumber(timesheet.normalHours);
       let overtimeHours = toNumber(timesheet.overtimeHours);
       let normalRate = toNumber(timesheet.normalRate);
       let overtimeRate = toNumber(timesheet.overtimeRate);

      normalRate = toNumber(timesheet.normalRate);
      overtimeRate = toNumber(timesheet.overtimeRate);

      totalNormalHours += normalHours;
      totalOvertimeHours += overtimeHours;

      subtotal += (normalHours * normalRate) + (overtimeHours * overtimeRate)
    });
  
    console.log('calculateUserTotal: ', subtotal, totalNormalHours, totalOvertimeHours);
    
    return {
      subtotal,
      normalHours: totalNormalHours,
      overtimeHours: totalOvertimeHours,
    };
  };

  const handleCreateInvoice = () => {

    console.log("Selected timesheets:", selectedTimesheets);

    if (!selectedUser || selectedTimesheets.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one timesheet",
        variant: "destructive",
      });
      return;
    }
    // Calculate totals from selected timesheets
    const { subtotal, normalHours, overtimeHours} = calculateUserTotal(selectedTimesheets);

    // Fetch user rate, either store them in timesheets or get users, what if users rate chage?
    // Just default ot 0.00 for now

    const invoiceData = {

      userId: parseInt(selectedUser),
      subtotal,
      vatRate: parseFloat(vatRate),
      cisRate: parseFloat(cisRate),
      totalAmount: calculateInvoiceTotal(
        subtotal,
        parseFloat(vatRate),
        parseFloat(cisRate),
      ),
      normalHours,
      overtimeHours,
      // normalRate,
      // overtimeRate,

      // Map the full Timesheet objects to extract only their IDs for submission
      timesheetIds: selectedTimesheets.map((ts) => ts.id),
    };

    console.log("Submitting invoice data:", invoiceData);
    createInvoiceMutation.mutate(invoiceData);
  };

  return (
    <DashboardLayout>
      <Card className="mb-8 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-none">
        <CardHeader>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Invoices
          </h1>
          <p className="text-muted-foreground">
            Generate and manage invoices for approved timesheets
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-8">
        {/* New Invoice Generation */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Generate New Invoice</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium">Select User</label>
                { /* User select as shown above */ }
                <Select
                  value={selectedUser}
                  onValueChange={(value) => {
                    setSelectedUser(value);
                    const userId = parseInt(value);
                    const approvedTimesheets = getApprovedTimesheets(userId);
                    setSelectedTimesheets(approvedTimesheets);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">VAT Rate</label>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select VAT rate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">CIS Rate</label>
                <Select value={cisRate} onValueChange={setCisRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CIS rate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CIS_RATES.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCreateInvoice}
                  disabled={
                    !selectedUser ||
                    selectedTimesheets.length === 0 ||
                    createInvoiceMutation.isPending
                  }
                >
                  {createInvoiceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Invoice
                </Button>
              </div>
            </div>

            {selectedUser && (
              <>
                {/* Timesheet Selection */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">
                    Select Timesheets to Include
                  </h3>
                  <div className="space-y-2">
                    {getApprovedTimesheets(parseInt(selectedUser)).map(
                      (timesheet) => (
                        <div 
                          key={timesheet.id}
                          className="flex items-center space-x-2">
                          <Checkbox
                            
                            // Check if this timesheet is already in the selectedTimesheets array
                            checked={selectedTimesheets.some((ts) => ts.id === timesheet.id)}

                            onCheckedChange={(checked) => {
                              setSelectedTimesheets((prev) =>
                                checked
                                  ? [...prev, timesheet]
                                  : prev.filter((ts) => ts.id !== timesheet.id),
                              );
                            }}
                          />
                          <label className="text-sm">
                            {timesheet.referenceNumber} - Week Starting{" "}
                            {format(
                              new Date(timesheet.weekStarting),
                              "MMM d, yyyy",
                            )}
                          </label>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Preview Calculation */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Preview Calculation</h3>
                  {(() => {
                    const {
                      subtotal,
                      normalHours,
                      overtimeHours,
                      normalRate,
                      overtimeRate,
                    } = calculateUserTotal(selectedTimesheets);

                    const vatAmount = subtotal * (parseFloat(vatRate) / 100);
                    const cisAmount = subtotal * (parseFloat(cisRate) / 100);

                    const total = calculateInvoiceTotal(
                      subtotal,
                      parseFloat(vatRate),
                      parseFloat(cisRate),
                    );

                    return (
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>Normal Hours</div>
                          <div className="text-right">
                            {normalHours.toFixed(2)} hrs @ £{normalRate}/hr = £
                            {(normalHours * normalRate).toFixed(2)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>Overtime Hours</div>
                          <div className="text-right">
                            {overtimeHours.toFixed(2)} hrs @ £{overtimeRate}/hr
                            = £{(overtimeHours * overtimeRate).toFixed(2)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>Subtotal</div>
                          <div className="text-right">
                            £{subtotal.toFixed(2)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>VAT ({vatRate}%)</div>
                          <div className="text-right">
                            £{vatAmount.toFixed(2)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>CIS Deduction ({cisRate}%)</div>
                          <div className="text-right">
                            -£{cisAmount.toFixed(2)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t font-medium">
                          <div>Total Amount</div>
                          <div className="text-right">£{total.toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="max-w-sm">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search invoices by reference or username..."
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })
              }
              className="h-10 w-10"
            >
              <RefreshCw
                className={`h-4 w-4 ${loadingInvoices ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Normal Hours</TableHead>
                  <TableHead>Overtime Hours</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>CIS</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setDialogOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">
                      {invoice.referenceNumber ?? "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{invoice.username ?? "Unknown"}</TableCell>
                    <TableCell>
                      {toNumber(invoice.normalHours).toFixed(2)} hrs
                    </TableCell>
                    <TableCell>
                      {toNumber(invoice.overtimeHours).toFixed(2)} hrs
                    </TableCell>
                    <TableCell>
                      £{toNumber(invoice.subtotal).toFixed(2)}
                    </TableCell>
                    <TableCell>{toNumber(invoice.vatRate)}%</TableCell>
                    <TableCell>{toNumber(invoice.cisRate)}%</TableCell>
                    <TableCell className="font-medium">
                      £{toNumber(invoice.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {invoice.status ?? "pending"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.status === "pending" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      "Are you sure you want to mark this invoice as paid?",
                                    )
                                  ) {
                                    updateInvoiceMutation.mutate({
                                      id: invoice.id,
                                      status: "paid",
                                    });
                                  }
                                }}
                              >
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceToDelete(invoice.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (invoiceToDelete) {
                  deleteInvoiceMutation.mutate(invoiceToDelete);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedInvoice.referenceNumber}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Generated on{" "}
                    {format(new Date(selectedInvoice.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{selectedInvoice.username}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    Status: {selectedInvoice.status}
                  </p>
                </div>
              </div>

              {/* Linked Timesheets */}
              <div>
                <h3 className="font-medium mb-2">Included Timesheets</h3>
                <div className="bg-muted p-3 rounded-md">
                  {loadingTimesheets ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading timesheets...
                    </div>
                  ) : linkedTimesheets.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {linkedTimesheets.map((timesheet: any) => (
                        <div
                          key={timesheet.id}
                          className="bg-background px-2 py-1 rounded text-sm"
                        >
                          {timesheet.referenceNumber}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No timesheets linked to this invoice
                    </p>
                  )}
                </div>
              </div>

              {/* Hours Breakdown */}
              <div>
                <h3 className="font-medium mb-2">Hours Breakdown</h3>
                <div className="space-y-2 bg-muted p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>Normal Hours</div>
                    <div className="text-right">
                      {toNumber(selectedInvoice.normalHours).toFixed(2)} hrs @ £
                      {toNumber(selectedInvoice.normalRate)}/hr = £
                      {(
                        toNumber(selectedInvoice.normalHours) *
                        toNumber(selectedInvoice.normalRate)
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>Overtime Hours</div>
                    <div className="text-right">
                      {toNumber(selectedInvoice.overtimeHours).toFixed(2)} hrs @
                      £{toNumber(selectedInvoice.overtimeRate)}/hr = £
                      {(
                        toNumber(selectedInvoice.overtimeHours) *
                        toNumber(selectedInvoice.overtimeRate)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div>
                <h3 className="font-medium mb-2">Financial Summary</h3>
                <div className="space-y-2 bg-muted p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>Subtotal</div>
                    <div className="text-right">
                      £{toNumber(selectedInvoice.subtotal).toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>VAT ({toNumber(selectedInvoice.vatRate)}%)</div>
                    <div className="text-right">
                      £
                      {(
                        toNumber(selectedInvoice.subtotal) *
                        (toNumber(selectedInvoice.vatRate) / 100)
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      CIS Deduction ({toNumber(selectedInvoice.cisRate)}%)
                    </div>
                    <div className="text-right">
                      -£
                      {(
                        toNumber(selectedInvoice.subtotal) *
                        (toNumber(selectedInvoice.cisRate) / 100)
                      ).toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t font-medium">
                    <div>Total Amount</div>
                    <div className="text-right">
                      £{toNumber(selectedInvoice.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
