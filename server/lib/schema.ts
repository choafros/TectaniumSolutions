import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
// import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

/** ─── Tables ───────────────────────────────────────────────────────────────── */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "client", "candidate"] }).notNull(),
  companyId: integer("company_id").references(() => companies.id),
  active: boolean("active").default(true),
  normalRate: decimal("normal_rate", { precision: 10, scale: 2 }),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  nino: text("nino").unique(),
  utr: text("utr").unique(),
  userType: text("user_type", { enum: ["sole_trader", "business"] }),
  phoneNumber: text("phone_number"),
  email: text("email"),
  address: text("address"),
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
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  approved: boolean("approved").default(false),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStarting: timestamp("week_starting").notNull(),
  dailyHours: jsonb("daily_hours").notNull(),
  totalHours: decimal("total_hours").notNull(),
  status: text("status", { enum: ["draft", "pending", "approved", "rejected", "invoiced"] }).default("draft").notNull(),
  notes: text("notes"),
  normalHours: decimal("normal_hours", { precision: 10, scale: 2 }).notNull(),
  normalRate: decimal("normal_rate", { precision: 10, scale: 2 }).notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 10, scale: 2 }).notNull(),
  overtimeRate: decimal("orvertime_rate", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2}).notNull(),
  projectId: integer("project_id").notNull().references(() => projects.id),

});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull(),
  cisRate: decimal("cis_rate", { precision: 5, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  normalHours: decimal("normal_hours", { precision: 10, scale: 2 }).notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 10, scale: 2 }).notNull(),
  normalRate: decimal("normal_rate", { precision: 10, scale: 2 }),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }),
  status: text("status", { enum: ["pending", "paid", "overdue"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  totalHours: decimal("total_hours", { precision: 10, scale: 2 }).default("0"),
  location: text("location").notNull(),
});

export const invoiceTimesheets = pgTable("invoice_timesheets", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  timesheetId: integer("timesheet_id").notNull().references(() => timesheets.id, { onDelete: "cascade" }),
});

/** ─── Relations ─────────────────────────────────────────────────────────────── */

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

  project: one(projects, {
    fields: [timesheets.projectId],
    references: [projects.id],
  }),

}));

export const invoiceRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  invoiceTimesheets: many(invoiceTimesheets),
}));

export const projectRelations = relations(projects, ({ many }) => ({
  timesheets: many(timesheets),
}));

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
// Type for daily hours structure
export type DailyHours = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
    start: string;
    end: string;
  };
};


// // Create insert schemas
// export const insertUserSchema = createInsertSchema(users);
// export const insertCompanySchema = createInsertSchema(companies);
// export const insertDocumentSchema = createInsertSchema(documents);
// export const insertTimesheetSchema = createInsertSchema(timesheets);
// export const insertInvoiceSchema = createInsertSchema(invoices);
// export const insertInvoiceTimesheetSchema = createInsertSchema(invoiceTimesheets);
// export const insertProjectSchema = createInsertSchema(projects);




// /**
//  * type exports
//  */
// export type User = typeof users.$inferSelect;
// export type Company = typeof companies.$inferSelect;
// export type Document = typeof documents.$inferSelect;
// export type Timesheet = typeof timesheets.$inferSelect;
// export type Project = typeof projects.$inferSelect;
// export type Invoice = typeof invoices.$inferSelect;
// export type InvoiceTimesheet = typeof invoiceTimesheets.$inferSelect;