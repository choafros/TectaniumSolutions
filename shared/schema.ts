import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Base tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "client", "candidate"] }).notNull(),
  companyId: integer("company_id").references(() => companies.id),
  active: boolean("active").default(true),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  industry: text("industry"),
  contactEmail: text("contact_email"),
  approved: boolean("approved").default(false),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  approved: boolean("approved").default(false),
});

// Updated timesheet schema with reference number
export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(), // Added reference number
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStarting: timestamp("week_starting").notNull(),
  dailyHours: jsonb("daily_hours").notNull(),
  totalHours: decimal("total_hours").notNull(),
  status: text("status", { enum: ["draft", "pending", "approved", "rejected", "invoiced"] }).default("draft"), // Added invoiced status
  notes: text("notes"),
});

// Updated invoice table with reference number
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(), // Added reference number
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull(),
  cisRate: decimal("cis_rate", { precision: 5, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  normalHours: decimal("normal_hours", { precision: 10, scale: 2 }).notNull(), // Added for breakdown
  overtimeHours: decimal("overtime_hours", { precision: 10, scale: 2 }).notNull(), // Added for breakdown
  normalRate: decimal("normal_rate", { precision: 10, scale: 2 }).notNull(), // Added for breakdown
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }).notNull(), // Added for breakdown
  status: text("status", { enum: ["pending", "paid", "overdue"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  timesheets: many(timesheets),
  invoices: many(invoices),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const timesheetRelations = relations(timesheets, ({ one, many }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
  invoiceTimesheets: many(invoiceTimesheets),
}));

// Add invoice relations
export const invoiceRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  invoiceTimesheets: many(invoiceTimesheets),
}));

// Add timesheet-invoice relation
export const invoiceTimesheets = pgTable("invoice_timesheets", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  timesheetId: integer("timesheet_id").notNull().references(() => timesheets.id, { onDelete: "cascade" }),
});

// Add invoice timesheet relations
export const invoiceTimesheetRelations = relations(invoiceTimesheets, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceTimesheets.invoiceId],
    references: [invoices.id],
  }),
  timesheet: one(timesheets, {
    fields: [invoiceTimesheets.timesheetId],
    references: [timesheets.id],
  }),
}));

// Create insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertCompanySchema = createInsertSchema(companies);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertTimesheetSchema = createInsertSchema(timesheets);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const insertInvoiceTimesheetSchema = createInsertSchema(invoiceTimesheets);

// Type for daily hours structure
export type DailyHours = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
    start: string;
    end: string;
  };
};

// Add invoice types
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceTimesheet = z.infer<typeof insertInvoiceTimesheetSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Timesheet = typeof timesheets.$inferSelect;

// Add invoice table types
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceTimesheet = typeof invoiceTimesheets.$inferSelect;