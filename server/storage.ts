import {
  User,
  Company,
  Document,
  Timesheet,
  Project,
  Invoice,
  InsertUser,
  InsertCompany,
  InsertDocument,
  InsertTimesheet,
  InsertInvoice,
  InsertProject,
} from "@shared/schema";
import {
  db,
  users,
  companies,
  documents,
  timesheets,
  projects,
  invoices,
  invoiceTimesheets,
} from "./db";
import { eq, inArray, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { generateReferenceNumber } from "@shared/utils";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  updateUserRates(id: number, normalRate: number, overtimeRate: number): Promise<User>;
  deleteUser(id: number): Promise<void>;

  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company>;
  listCompanies(): Promise<Company[]>;

  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(userId: number): Promise<Document[]>;
  updateDocument(id: number, doc: Partial<Document>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  listAllDocuments(): Promise<(Document & { username: string })[]>;

  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getUserTimesheets(userId: number): Promise<Timesheet[]>;
  updateTimesheet(id: number, timesheet: Partial<Timesheet>,): Promise<Timesheet>;
  deleteTimesheet(id: number): Promise<void>;
  listAllTimesheets(): Promise<(Timesheet & { username: string })[]>;

  // Updated invoice methods
  createInvoice(
    invoice: InsertInvoice,
    timesheetIds: number[],
  ): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice>;
  listAllInvoices(): Promise<(Invoice & { username: string })[]>;
  getInvoiceTimesheets(
    invoiceId: number,
  ): Promise<(Timesheet & { username: string })[]>;
  deleteInvoice(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  async updateUserRates(id: number, normalRate: number, overtimeRate: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ normalRate, overtimeRate })
      .where(eq(users.id, id))
      .returning();
  
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // Cascading delete will handle related records
    await db.delete(users).where(eq(users.id, id));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set(company)
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  async listCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async getDocuments(userId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));
  }

  async updateDocument(id: number, doc: Partial<Document>): Promise<Document> {
    const [updatedDoc] = await db
      .update(documents)
      .set(doc)
      .where(eq(documents.id, id))
      .returning();
    return updatedDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async listAllDocuments(): Promise<(Document & { username: string })[]> {
    const docs = await db
      .select({
        id: documents.id,
        userId: documents.userId,
        name: documents.name,
        path: documents.path,
        uploadedAt: documents.uploadedAt,
        approved: documents.approved,
        username: users.username,
      })
      .from(documents)
      .leftJoin(users, eq(documents.userId, users.id));

    return docs.map((doc) => ({
      ...doc,
      username: doc.username || "Unknown User",
    }));
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {

    // Function to generate reference number
    const generateReference = async (attempt = 0): Promise<string> => {
      // Get the last timesheet to determine next ID
      const [lastTimesheet] = await db
        .select()
        .from(timesheets)
        .orderBy(timesheets.id, 'desc')
        .limit(1);
      
      console.log('lastTimesheet: ', lastTimesheet);

      const baseId = (lastTimesheet?.id || 0) + 1;
      const attemptId = baseId + attempt;
      const referenceNumber = `TS-${attemptId.toString().padStart(6, '0')}`;
      console.log('referenceNumber: ', referenceNumber);

      // Check if this reference number already exists
      const [existing] = await db
        .select()
        .from(timesheets)
        .where(eq(timesheets.referenceNumber, referenceNumber));

      if (existing) {
        // If exists, try next number
        return generateReference(attempt + 1);
      }

      return referenceNumber;
    };

    try {
      const referenceNumber = await generateReference();
      console.log('Creating timesheet with reference:', referenceNumber);

      const [newTimesheet] = await db
        .insert(timesheets)
        .values({
          ...timesheet,
          referenceNumber,
        })
        .returning();

      return newTimesheet;
    } catch (error) {
      console.error('Error creating timesheet:', error);
      throw new Error('Failed to create timesheet with unique reference number');
    }
  }

  async updateTimesheet(
    id: number,
    timesheet: Partial<Timesheet>,
  ): Promise<Timesheet> {
    console.log("Updating timesheet:", id, timesheet);
    const [updatedTimesheet] = await db
      .update(timesheets)
      .set(timesheet)
      .where(eq(timesheets.id, id))
      .returning();
    return updatedTimesheet;
  }

  // Project functions
  async createProject(project: InsertProject): Promise<Project> {
    console.log("Creating project:", project);
    const [newProject] = await db
      .insert(projects)
      .values({...project})
      .returning();
    return newProject;
  }
  async listAllProjects(): Promise<(Project)[]> {
    const result = await db.select().from(projects);

  // Convert decimal fields to numbers
    return result.map(project => ({
      ...project,
      hourlyRate: parseFloat(project.hourlyRate), // Convert to number
      totalHours: parseFloat(project.totalHours), // Convert to number
    }));
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    console.log("Updating project:", id, project);
    const [updatedProject] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    console.log("Deleting project:", id);
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Update Project Hours (based on timesheets)
  async updateProjectHours(projectId: number): Promise<void> {
    console.log("Updating project hours for projectId:", projectId);
    try {
      const result = await db
          .select({ total: sql<number>`sum(${timesheets.totalHours})` })
          .from(timesheets)
          .where(eq(timesheets.projectId, projectId));

      let totalHours = result[0]?.total ?? 0;
      console.log('Project total hours:', totalHours);

      const updated = await db
          .update(projects)
          .set({ totalHours })
          .where(eq(projects.id, projectId));

      if (updated.count === 0) {
          console.warn(`Project with ID ${projectId} not found for update.`);
      } else {
          console.log(`Successfully updated project hours for projectId: ${projectId}`);
      }

  } catch (error) {
      console.error(`Error updating project hours for projectId ${projectId}:`, error.message);
      throw new Error(`Failed to update project hours: ${error.message}`);
  }
  }

  async getProject(id: number): Promise<Project | undefined> {
    console.log('Getting project: ' , id)
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)
    return project;
  }

  async createInvoice(invoice: InsertInvoice, timesheetIds: number[]): Promise<Invoice> {
    // Validate timesheetIds input
    if (!timesheetIds || !Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      console.log('Invalid timesheetIds:', timesheetIds);
      throw new Error("No timesheets selected for invoice generation");
    }

    console.log('Creating invoice with timesheetIds:', timesheetIds);

    // Batch fetch timesheets for efficiency
    const fetchedTimesheets = await db
        .select()
        .from(timesheets)
        .where(inArray(timesheets.id, timesheetIds));
    
    // Identify issues in fetched timesheets
    const missingTimesheets = timesheetIds.filter(id =>
      !fetchedTimesheets.some(t => t.id === id)
    );

    const unapprovedTimesheets = fetchedTimesheets.filter(t => t.status !== "approved");
    const alreadyInvoicedTimesheets = fetchedTimesheets.filter(t => t.status === "invoiced");
    
    // Handle errors efficiently
    if (missingTimesheets.length > 0) {
      throw new Error(`Missing timesheets: ${missingTimesheets.join(', ')}`);
    }
    if (unapprovedTimesheets.length > 0) {
      const references = unapprovedTimesheets.map(t => t.referenceNumber).join(', ');
      throw new Error(`Unapproved timesheets: ${references}`);
    }
    if (alreadyInvoicedTimesheets.length > 0) {
      const references = alreadyInvoicedTimesheets.map(t => t.referenceNumber).join(', ');
      throw new Error(`Already invoiced timesheets: ${references}`);
    }

    // Function to generate sequential reference number
    const generateReference = async (attempt = 0): Promise<string> => {
      const [lastInvoice] = await db
          .select()
          .from(invoices)
          .orderBy(invoices.id, 'desc')
          .limit(1);

      const baseId = (lastInvoice?.id || 0) + 1;
      const attemptId = baseId + attempt;
      const referenceNumber = `INV-${attemptId.toString().padStart(6, '0')}`;

      // Check if this reference number already exists
      const [existing] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.referenceNumber, referenceNumber));

      if (existing) {
          // If exists, try next number
          return generateReference(attempt + 1);
      }

      return referenceNumber;
    };

    try {

      const referenceNumber = await generateReference();
      console.log('Creating invoice with reference number:', referenceNumber);

      const [newInvoice] = await db
        .insert(invoices)
        .values({ ...invoice, referenceNumber })
        .returning();

      const entries = timesheetIds.map((timesheetId) => ({ invoiceId: newInvoice.id, timesheetId }));
      await db
        .insert(invoiceTimesheets).values(entries);

      await db
        .update(timesheets)
        .set({ status: "invoiced", invoiceId: newInvoice.id })
        .where(inArray(timesheets.id, timesheetIds));

      return newInvoice;

    } catch (error) {
      console.error("Invoice creation error:", error.message);
      throw new Error(error.message);
    }
    
  }
 

  async getInvoiceTimesheets(
    invoiceId: number,
  ): Promise<(Timesheet & { username: string })[]> {
    const result = await db
      .select({
        id: timesheets.id,
        userId: timesheets.userId,
        referenceNumber: timesheets.referenceNumber,
        weekStarting: timesheets.weekStarting,
        dailyHours: timesheets.dailyHours,
        totalHours: timesheets.totalHours,
        status: timesheets.status,
        notes: timesheets.notes,
        normalHours: timesheets.normalHours,
        normalRate: timesheets.normalRate,
        overtimeHours: timesheets.overtimeHours,
        overtimeRate: timesheets.overtimeRate,
        username: users.username,
      })
      .from(invoiceTimesheets)
      .leftJoin(timesheets, eq(invoiceTimesheets.timesheetId, timesheets.id))
      .leftJoin(users, eq(timesheets.userId, users.id))
      .where(eq(invoiceTimesheets.invoiceId, invoiceId));

    return result.map((timesheet) => ({
      ...timesheet,
      username: timesheet.username || "Unknown User",
    }));
  }

  async updateInvoice(id: number, update: Partial<Invoice>): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set(update)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async listAllInvoices(): Promise<(Invoice & { username: string })[]> {
    const result = await db
      .select({
        id: invoices.id,
        referenceNumber: invoices.referenceNumber,
        userId: invoices.userId,
        subtotal: invoices.subtotal,
        vatRate: invoices.vatRate,
        cisRate: invoices.cisRate,
        totalAmount: invoices.totalAmount,
        normalHours: invoices.normalHours,
        overtimeHours: invoices.overtimeHours,
        normalRate: invoices.normalRate,
        overtimeRate: invoices.overtimeRate,
        status: invoices.status,
        createdAt: invoices.createdAt,
        notes: invoices.notes,
        username: users.username,
      })
      .from(invoices)
      .leftJoin(users, eq(invoices.userId, users.id));

    return result.map((invoice) => ({
      ...invoice,
      username: invoice.username || "Unknown User",
    }));
  }
  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, id));
    return timesheet;
  }

  async getUserTimesheets(userId: number): Promise<Timesheet[]> {
    return await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.userId, userId));
  }

  async deleteTimesheet(id: number): Promise<void> {
    await db.delete(timesheets).where(eq(timesheets.id, id));
  }

  async listAllTimesheets(): Promise<(Timesheet & { username: string; normalRate: string; overtimeRate: string })[]> {
    const sheets = await db
      .select({
        id: timesheets.id,
        referenceNumber: timesheets.referenceNumber,
        userId: timesheets.userId,
        weekStarting: timesheets.weekStarting,
        dailyHours: timesheets.dailyHours,
        totalHours: timesheets.totalHours,
        status: timesheets.status,
        notes: timesheets.notes,
        normalHours: timesheets.normalHours,
        overtimeHours: timesheets.overtimeHours,
        username: users.username,
        normalRate: timesheets.normalRate,
        overtimeRate: timesheets.overtimeRate,
        projectId: timesheets.projectId,
      })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.userId, users.id));
  
    return sheets.map((sheet) => ({
      ...sheet,
      username: sheet.username || "Unknown User",
      projectId: sheet.projectId,
    }));
  }
  


  async deleteInvoice(id: number): Promise<void> {
    // Find timesheets linked to this invoice before deleting
    const relatedTimesheets = await db
      .select()
      .from(invoiceTimesheets)
      .where(eq(invoiceTimesheets.invoiceId, id));

    // Update timesheet status back to approved
    for (const relation of relatedTimesheets) {
      await db
        .update(timesheets)
        .set({ status: "approved" })
        .where(eq(timesheets.id, relation.timesheetId));
    }

    // Delete invoice and related records (cascade will handle invoice_timesheets)
    await db.delete(invoices).where(eq(invoices.id, id));
  }

}

export const storage = new DatabaseStorage();