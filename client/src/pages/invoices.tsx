import { useState } from "react";
import { jsPDF } from "jspdf";
import { autoTable, applyPlugin } from 'jspdf-autotable'
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Invoice, Timesheet } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { endOfWeek, endOfMonth } from 'date-fns';
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
import { styleText } from "util";
import { SourceTextModule } from "vm";

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
async function generateInvoicePDF(invoice: any, userData: any) {

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Styles ---
  const primaryColor = '#2d3436';
  const secondaryColor = '#636e72';
  const accentColor = '#f8f4f4';
  
  // --- Header Section ---
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');

  // --- Company Details (Top Right) ---
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text("Techtanium Ltd", pageWidth - 14, 10, { align: "right" });
  doc.text("123 Innovation Street", pageWidth - 14, 15, { align: "right" });
  doc.text("London, UK", pageWidth - 14, 20, { align: "right" });
  
  // --- Logo (Top Left) ---
  const imageData = "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i0biupXmnvtTTshpbaMSWHJaM39PszdKf1CwqW+9ENlSFKbeMe+mQefm058qZdkQncRgBkpDTVtxy/Ei45c+VFcnDJE+MYyER221i7K9c197Q+LvdlNPocLspnDUNLBVuPq3syfTzBph+NmDrOFttFlR3XVa5kHt7awxb0NTzbcBltV2NrZYJuPGFj21Icl4e/MWp5Ko0lChlbRYacd2xv6anyhEQhJQ3snLedv57ft/JLOTMZRyX6udRMQeDiV4Nm3UcHLC9TEKa/uCivTzSMx9v0fYSmg83xsa8HjMpaZ+qKW/FipadVxUPfT7dP/EACcQAQABAwMCBgMBAAAAAAAAAAERACExQVFhcYEgQJGhwfAwcPGx/9oACAEBAAE/If3HnW4WlXYKILFrpDyNfzdfy9fwtJgBdUVlFqSg4nPk80b4lcNJxIwgY0vT9M/2kmEvpvX3j5qY/BkJ1ahVSI/JEvalkS97hiIpetIMX4RAE8UHKjrIjwJMAOgUVFC8kXEMbi8W7qDEkW3MiIe5moXr/wDUlExKnotMiR1Nz2FuqphLFrbrYWZNiaPbojVU0Gr1oACLaEhPSl8RVIInog9KcVkhaj8GoU2N28kuQs9DRRUE2SMEkU7z4Y1tm5wti8TWZ7YOHcWKCiN2QmKNSkQWLQ1kShQQaFcqtFmWPoUAD5ZCRbOWYxQCnvDYWRMdaldSxgJbq5FOtFiPECIFo7DReUukaagXc3xbmmPWsg6e9A6o9Z3AUKyYwFTalR5imwG4xR00TBO4dvnmlbhjq1vAjCnO7ZhWHtMVq/ewwLrbaMxm9SUWRSUjH3aNUdamDsQaAak9YBGDEyevjk+3xUdiUQXby/fQ4Uey8SfdYpGxHfsBU/0/lBGr6LRzTHBgGMBLwnD502NBllzZJgGw4mnVSJCtSEs5XlvkIVccp0vNzGi04GOJ2naGybjZaiTQT1grFGqrfxpjHI2DbZa4pg7YHK5yZl+GP+hIlz7UQSwEIAOnBULxkXtXpC9vLv11yyHcS5QQhnWmczOe9BD2ELBsS+z96f/aAAwDAQACAAMAAAAQ888888888888888888888888888888888888888888888888888886y+1888888888+DBvMIokEsU8889W88w4w408888Df88888888888888888888888888888888888888888888888888888888888888888888888888//EACIRAQACAQMDBQAAAAAAAAAAAAERIQAwMVFBYZFQYIGx8P/aAAgBAwEBPxD1VGcVmJJjmM7LOy85ByORk0npSw2Q8kNqmcDIE1SSljljWQgehuN7xOUZab+f3GmcjwYAQO/26kgNZKj2X//EACQRAAIBAwIGAwAAAAAAAAAAAAERIQAxYTBBUFFxgZGxYKHw/9oACAECAQE/EOKg6S2NQ+tYqx05YuRC0kAhzc30JylRkYSckMiCzlQ6QDc4YYYrt0kJHqPPfT/LlV/pqAdMvPBCPkRbNPeBATiPSHb4X//EACcQAQEAAgICAAYBBQAAAAAAAAERACExQVFhIEBwocHwEDBxkbHh/9oACAEBAAE/EPrGsNJsJcA2unGNAoinJAmfv35z9m/OfoX5w/GoCAcvOCeKiOOVgg+TcftPoIgb35OJgdLIBoOTbvzfRr+EK+N4cziIZ79AAAF0d6wigDTbKqyJ0XbzrLy+kz8inV+7K13OaJ26MBdmluAMyC4oRIlC4N3KnTDDIByp2bBABHyv3UW1svt1t/8AR/lvK2v+zijkDsEsdrs15VkkcDLymhgDK0MGOlFa1qIVWh384XohzrCNmHE4MGNL4lZNoAbqMUgeyKEaIE3pwT28nrdEKK+Dozdo4lRY0Gg37X4TwmpFS4bByD10OE42RR5AZXAz0TDcfEQhQIsp3jJ6sio48VWdXB5eRjAVQRn+3WjH8fAImdkg+Lg4EqQWvHbWtXrF8IzXgiNtpjbijsRKMH1QEWA5PE2jgxNkFDvTHTEZT6ALvVRSIYxltAOAFaabNnk8408UI3BaAaBdoY7JjLQWIshAFYl4qRGgFUjpiIdLBAcm04hPYgAOxwiPWGx1N0pOnEXLZYkuVKSEIOENIoMFhiDJ0xyYEN6EJuPBF6PDKkkbrdCIoXlfb4/TK4rLIsl1fl37F8foOb1Y4J7P+MyHt/xRD/IuVzclr0RFxQhu5d8ik3O7CLucjXmcVoiQOhwCCN6zAU6VjSY6IghrAW/HeyBWR68hXAy+cD+LligddaxSUeBzbuEzT54PRh9IJNgX6tOf6Jo822TleVgD2vUWBn+IQ2h0QeR6SCWsJQw8NoN8nl8uYvoRD4QE2lE0p3lRsEEPkaVvCpxgGmGjUUA+AH10/9k=";
  // Add the logo image at the desired position (x: 14, y: 10, width: 20, height: 20)
  doc.addImage(imageData, "PNG", 14, 5, 50, 50);
  
  const tableWidth = 50; // Total table width: first column 50 + second column 100 (adjust as needed)
  const rightMargin = 14;
  const startX = pageWidth - rightMargin - tableWidth;
  
  // --- Client Details ---
  const clientY = 50;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(primaryColor);
  doc.text("INVOICE TO:", rightMargin, clientY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(secondaryColor);
  doc.text(userData?.username || `User #${invoice.userId}`, rightMargin, clientY + 12);
  doc.text(userData?.address || "Address not available", rightMargin, clientY + 17);
  doc.text(userData?.email || "Email not available", rightMargin, clientY + 22);
  doc.text(userData?.phoneNumber || "Phone not available", rightMargin, clientY + 27);

  // --- Invoice Metadata ---
  const metaY = clientY;
  let dateIssued: Date;
  if (userData.billingFrequency === 'Weekly') {
    dateIssued = endOfWeek(new Date(), { weekStartsOn: 1 });
  } else if (userData.billingFrequency === 'Monthly') {
    dateIssued = endOfMonth(new Date());
  } else {
    dateIssued = new Date();
  }
  // TODO: Change
  const dueDate = dateIssued;
  
  const invoiceMeta = [
    ["Invoice", invoice.referenceNumber],
    ["Date Issued", dateIssued.toLocaleDateString()],
    ["Due Date", dueDate.toLocaleDateString()], // Define dueDateString as needed (e.g., end of week/month)
    ["UTR", userData.utr],
    ["VAT Number", "GB123456789"],
  ];
  
  const labelColWidth = 25; // mm
  const valueColWidth = 35; // mm

  autoTable(doc, {
    startY: metaY,
    margin: { left: startX - 10, right: rightMargin },
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: {
        cellWidth: labelColWidth,
        halign: "right",
        fillColor: accentColor,
        fontStyle: "bold",
      },
      1: {
        cellWidth: valueColWidth,
        halign: "left",
      },
    },
    body: invoiceMeta,
  });

  // --- Main Items Table ---
  const tableColumns = [
    { header: "Description", dataKey: "description" },
    { header: "Normal HRS", dataKey: "normalHours" },
    { header: "Overtime HRS", dataKey: "overtimeHours" },
    { header: "Subtotal", dataKey: "subtotal" }
  ];

  // Build one row per timesheet
  const tableBody = (invoice.timesheets || []).map(ts => {

    const nh = toNumber(ts.normalHours);
    const nr = toNumber(ts.normalRate);

    const oh = toNumber(ts.overtimeHours);
    const or = toNumber(ts.overtimeRate);

    const sub = nh*nr + oh*or;

    // e.g. “TS-000001 (Week of Jun 1, 2025)”
    const desc = `${ts.referenceNumber} (Week of ${format(new Date(ts.weekStarting), "MMM d, yyyy")})`;
    
    return {
      description: desc + " \nLocation: " + (ts.projectName),
      normalHours: nh.toFixed(2) + " HRS \n£" + nr.toFixed(2) + "/HR",
      overtimeHours: oh.toFixed(2) + " HRS \n£" + or.toFixed(2) + "/HR",
      subtotal: `£ ${sub.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`

    };
  });

  autoTable(doc, {
    startY: 100,
    head: [tableColumns.map(c => c.header)],
    body: tableBody.map((item: { [key: string]: any }) => tableColumns.map(c => item[c.dataKey])),
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor,
      textColor: 255,
      fontSize: 10
    },
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 }
  });

  // --- Dynamic Totals Table ---
  const subtotal = Number(invoice.subtotal);
  const taxRate = Number(invoice.vatRate) || 0; // Defaults to 0 if not provided
  const cisRate = Number(invoice.cisRate) || 0;   // Defaults to 0 if not provided

  const taxAmount = subtotal * (taxRate / 100);
  const cisDeduction = cisRate > 0 ? subtotal * (cisRate / 100) : 0;
  const totalDue = subtotal + taxAmount - cisDeduction;

  interface TotalRow {
    label: string;
    value: number;
  }

  // Determine label for CIS row based on the cisRate value
  const cisLabel = cisRate === 20 ? "Default" : cisRate === 30 ? "Higher" : `${cisRate}%`;

  // Build totals rows array. The CIS row is only added if cisRate > 0.
  const totals: (TotalRow | null)[] = [
    { label: "Subtotal excluding tax:", value: subtotal },
    { label: `${taxRate}% (VAT on income):`, value: taxAmount },
    cisRate > 0
      ? {
          label: `CIS Deduction ${cisLabel} (${cisRate}%):`,
          value: -cisDeduction,
        }
      : null,
    { label: "Total Due:", value: totalDue },
  ];
  
  
  // Filter out null values with type safety
  const filteredTotals = totals.filter((t): t is TotalRow => t !== null);

  doc.setFont("times", "bold");

  // Calculate position
  const totalsTableWidth = 90; // Total width of labels + values columns
  const startXTotals = pageWidth - totalsTableWidth - rightMargin;

  
  let currentY = (doc as any).lastAutoTable!.finalY + 4;  // a little gap below the items table
  const rowHeight = 11;  // adjust if you change fontSize or cellPadding

  // Draw lines
  filteredTotals.forEach((t, i) => {
    // draw a subtle grey line spanning the full width of the totals table
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(
      startXTotals, 
      currentY + rowHeight - 2,        // 2px above the bottom of this row
      pageWidth - rightMargin, 
      currentY + rowHeight - 2
    );
    currentY += rowHeight;
  });

  // 4. Now render the autoTable for totals, overriding its margin to our startXTotals
  autoTable(doc, {
    startY: (doc as any).lastAutoTable!.finalY + 4,
    margin: { left: startXTotals, right: rightMargin },
    theme: "plain",
    styles: {
      font: "times",         // match our banking font
      fontStyle: "bold",
      fontSize: 12,
      cellPadding: 3,
      textColor: primaryColor,
      valign: "middle"
    },
    columnStyles: {
      0: { halign: "right", cellWidth: 70 },
      1: { halign: "left",  cellWidth: 40 }
    },
    body: filteredTotals.map(t => [
      t.label,
      `£ ${t.value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
    ])
  });

  // --- Bank Details Table ---
  const bankDetails = [
    ["Bank Details", ""],
    ["Account Name:", "Tectanium Ltd"],
    ["Account Number:", "12345678"],
    ["Sort Code:", "12-34-56"],
    ["Reference:", invoice.referenceNumber]
  ];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 50 : 20,
    margin: { left: 14, right: 14 },
    body: bankDetails,
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: 2,
      textColor: secondaryColor,
    },
    columnStyles: {
      0: {
        cellWidth: 50,
        halign: "right",
        fillColor: accentColor,
        fontStyle: "bold",
      },
      1: {
        cellWidth: 80,
        halign: "left",
      },
    },
  });

  // --- Footer Section ---
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(10);
  doc.setFont("times", "normal");
  doc.setTextColor(secondaryColor);
  doc.text("Payment Terms: 30 days", 14, footerY);
  doc.text("Please pay using the bank details provided. Please provide the correct Reference.", 14, footerY + 5);
  doc.text("Thank you for your business!", pageWidth - 14, footerY, { align: "right" });

  return doc.output("bloburl");
}

const handleViewInvoicePDF = async (invoice: any) => {

  // Fetch user data
  let userData = null;
  try {
    const response = await fetch(`/api/users/${invoice.userId}`);
    userData = await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
  // --- fetch & attach timesheets ---
  const timesheetRes = await fetch(`/api/invoices/${invoice.id}/timesheets`);
  const timesheets: Timesheet[] = await timesheetRes.json();

  // spread in your fetched timesheets
  const enrichedInvoice = {
    ...invoice,
    timesheets,
  };

  // Generate the PDF blob URL:
  const pdfUrl = await generateInvoicePDF(enrichedInvoice, userData);
  
  // Open the PDF in a new tab
  window.open(pdfUrl, "_blank");
};

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
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // Call the PDF generation helper function passing the current invoice data
                                handleViewInvoicePDF(invoice);
                              }}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Create PDF
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
