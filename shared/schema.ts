import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "client", "candidate"] }).notNull(),
  companyId: integer("company_id").references(() => companies.id),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  approved: boolean("approved").default(false),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  weekStarting: timestamp("week_starting").notNull(),
  hours: integer("hours").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  notes: text("notes"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  companyId: true,
});

export const insertCompanySchema = createInsertSchema(companies);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertTimesheetSchema = createInsertSchema(timesheets);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Timesheet = typeof timesheets.$inferSelect;
