// shared/schema.ts
import { z } from "zod";

/** ─── Insert Schemas & Types ─────────────────────────────────────────────── */

// Users
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  role: z.enum(["admin", "client", "candidate"]),
  companyId: z.number().optional(),
  active: z.boolean().optional(),
  normalRate: z.string(),
  overtimeRate: z.string(),
  nino: z.string().optional(),
  utr: z.string().optional(),
  userType: z.enum(["sole_trader", "business"]).optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email(),
  address: z.string().optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

// Companies
export const insertCompanySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  contactEmail: z.string().email().optional(),
  approved: z.boolean().optional(),
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// Documents
export const insertDocumentSchema = z.object({
  userId: z.number(),
  name: z.string(),
  path: z.string(),
  approved: z.boolean().optional(),
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Timesheets
export const insertTimesheetSchema = z.object({
  referenceNumber: z.string(),
  userId: z.number(),
  weekStarting: z.string(), // or z.date().transform(d => d.toISOString())
  dailyHours: z.record(
    z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
    z.object({ start: z.string(), end: z.string() })
  ),
  totalHours: z.string(),
  status: z.enum([
    "draft",
    "pending",
    "approved",
    "rejected",
    "invoiced",
  ]),
  notes: z.string().optional(),
  normalHours: z.string(),
  normalRate: z.string(),
  overtimeHours: z.string(),
  overtimeRate: z.string(),
  totalCost: z.string(),
  projectId: z.number(),
});
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

// Invoices
export const insertInvoiceSchema = z.object({
  referenceNumber: z.string(),
  userId: z.number(),
  subtotal: z.string(),
  vatRate: z.string(),
  cisRate: z.string(),
  totalAmount: z.string(),
  normalHours: z.string(),
  overtimeHours: z.string(),
  status: z.enum(["pending", "paid", "overdue"]),
  notes: z.string().optional(),
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Projects
export const insertProjectSchema = z.object({
  name: z.string(),
  hourlyRate: z.string(),
  totalHours: z.string().optional(),
  location: z.string(),
});
export type InsertProject = z.infer<typeof insertProjectSchema>;

/** ─── Plain TS Interfaces for Selected Rows ─────────────────────────────── */

// Users
export interface User {
  id: number;
  username: string;
  role: "admin" | "client" | "candidate";
  companyId?: number;
  active: boolean;
  normalRate: string;
  overtimeRate: string;
  nino?: string;
  utr?: string;
  userType?: "sole_trader" | "business";
  phoneNumber?: string;
  email?: string;
  address?: string;
}

// Companies
export interface Company {
  id: number;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  contactEmail?: string;
  approved: boolean;
}

// Documents
export interface Document {
  id: number;
  userId: number;
  name: string;
  path: string;
  uploadedAt: string;
  approved: boolean;
}

// Timesheets
export interface Timesheet {
  id: number;
  referenceNumber: string;
  userId: number;
  weekStarting: string;
  dailyHours: Record<
    string,
    {
      start: string;
      end: string;
    }
  >;
  totalHours: string;
  status: "draft" | "pending" | "approved" | "rejected" | "invoiced";
  notes?: string;
  normalHours: string;
  normalRate: string;
  overtimeHours: string;
  overtimeRate: string;
  totalCost: string;
  projectId: number;
}

// Invoices
export interface Invoice {
  id: number;
  referenceNumber: string;
  userId: number;
  subtotal: string;
  vatRate: string;
  cisRate: string;
  totalAmount: string;
  normalHours: string;
  overtimeHours: string;
  status: "pending" | "paid" | "overdue";
  createdAt: string;
  notes?: string;
}

// Projects
export interface Project {
  id: number;
  name: string;
  hourlyRate: string;
  totalHours: string;
  location: string;
}

// Invoice–Timesheet join (if you need it)
export interface InvoiceTimesheet {
  id: number;
  invoiceId: number;
  timesheetId: number;
}
