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
import { DailyHours } from "./lib/schema";

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
    return nullsToUndefined(user) as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return nullsToUndefined(user) as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return  nullsToUndefined(user) as User;
  }

  async listUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(nullsToUndefined) as User[];
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    return nullsToUndefined(user) as User;
  }
  async updateUserRates(id: number, normalRate: number, overtimeRate: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ normalRate: String(normalRate), 
            overtimeRate: String(overtimeRate) })
      .where(eq(users.id, id))
      .returning();
  
    return nullsToUndefined(user) as User;
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
    return nullsToUndefined(company) as Company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return nullsToUndefined(newCompany) as Company;
  }

  async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set(company)
      .where(eq(companies.id, id))
      .returning();
    return nullsToUndefined(updatedCompany) as Company;
  }

  async listCompanies(): Promise<Company[]> {
     const result = await db.select().from(companies);
    return result.map(nullsToUndefined) as Company[];
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    const formattedDoc = {
      ...newDoc,
      uploadedAt: newDoc.uploadedAt!.toISOString(),
    };

    return nullsToUndefined(formattedDoc) as Document;

  }

  async getDocuments(userId: number): Promise<Document[]> {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));
      
    return docs.map(doc => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
    })) as Document[];
  }

  async updateDocument(id: number, doc: Partial<Document>): Promise<Document> {
     // Convert uploadedAt to Date if it's a string
    const docForDb = {
      ...doc,
      uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : undefined,
    };
    const [updatedDocFromDb] = await db
      .update(documents)
      .set(docForDb)
      .where(eq(documents.id, id))
      .returning();
    
      // Transform the raw database object to match the Document interface
    const formattedDoc = {
      ...updatedDocFromDb,
      // Safely convert the Date to a string
      uploadedAt: updatedDocFromDb.uploadedAt!.toISOString(), 
    };

    return nullsToUndefined(formattedDoc) as Document;
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
      // Safely handle null for uploadedAt, providing a fallback date string
      uploadedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : new Date(0).toISOString(),
      // Safely handle null for approved, providing a fallback boolean
      approved: doc.approved || false,
      username: doc.username || "Unknown User",
    }));
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {

    // Function to generate reference number
    const generateReference = async (attempt = 0): Promise<string> => {
      // Get the last timesheet to determine next ID
      const [lastTimesheet] = await db.select().from(timesheets).orderBy(sql`${timesheets.id} DESC`).limit(1);

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
          weekStarting: new Date(timesheet.weekStarting), // Convert to Date
          referenceNumber,
        })
        .returning();
      
        // Format the returned data to match the Timesheet interface

      return {
        ...newTimesheet,
        // Ensure weekStarting is a string
        weekStarting: new Date(newTimesheet.weekStarting).toISOString(),
        dailyHours: newTimesheet.dailyHours as DailyHours,
        notes: newTimesheet.notes ?? undefined,
      };
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
    
    // Convert weekStarting to Date if it's a string
    const timesheetForDb = {
      ...timesheet,
      weekStarting: timesheet.weekStarting
        ? new Date(timesheet.weekStarting)
        : undefined,
    };

    const [updatedTimesheet] = await db
      .update(timesheets)
      .set(timesheetForDb)
      .where(eq(timesheets.id, id))
      .returning();

    // Format the returned data

    return {
      ...updatedTimesheet,
      weekStarting: new Date(updatedTimesheet.weekStarting).toISOString(), // Ensure weekStarting is a string
      dailyHours: updatedTimesheet.dailyHours as DailyHours,
      notes: updatedTimesheet.notes ?? undefined,

    };
  }

  // Project functions
  async createProject(project: InsertProject): Promise<Project> {
    console.log("Creating project:", project);
    const [newProject] = await db
      .insert(projects)
      .values({...project})
      .returning();

    return nullsToUndefined(newProject) as Project;
  }
  async listAllProjects(): Promise<(Project)[]> {
    const result = await db.select().from(projects);

    return result.map(project => ({
      ...project,
      // If project.hourlyRate exists, convert it to a string. Otherwise, use "0".
      hourlyRate: project.hourlyRate ? project.hourlyRate.toString() : "0",

      // If project.totalHours exists, convert it to a string. Otherwise, use "0".
      totalHours: project.totalHours ? project.totalHours.toString() : "0",
    }));
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    console.log("Updating project:", id, project);
    const [updatedProject] = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return nullsToUndefined(updatedProject) as Project;
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
        .set({ totalHours: totalHours.toString() })
        .where(eq(projects.id, projectId))
        .returning(); // Use .returning() to get the rowCount

      if (updated.length === 0) {
          console.warn(`Project with ID ${projectId} not found for update.`);
      } else {
          console.log(`Successfully updated project hours for projectId: ${projectId}`);
      }

    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error(`Error updating project hours for projectId ${projectId}:`, errorMessage);
      throw new Error(`Failed to update project hours: ${errorMessage}`);
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    console.log('Getting project: ' , id)
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)
    return nullsToUndefined(project) as Project;
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
          .orderBy(sql`${invoices.id} DESC`)
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

      const [newInvoiceFromDb] = await db
        .insert(invoices)
        .values({ ...invoice, referenceNumber })
        .returning();
    
      if (!newInvoiceFromDb) {
        throw new Error("Failed to create and return new invoice from the database.");
      }

      const entries = timesheetIds.map((timesheetId) => ({ invoiceId: newInvoiceFromDb.id, timesheetId }));
      await db
        .insert(invoiceTimesheets).values(entries);

      await db
        .update(timesheets)
        .set({ status: "invoiced" })
        .where(inArray(timesheets.id, timesheetIds));

      const finalInvoice: Invoice = {
        id: newInvoiceFromDb.id,
        referenceNumber: newInvoiceFromDb.referenceNumber,
        userId: newInvoiceFromDb.userId,
        subtotal: newInvoiceFromDb.subtotal,
        vatRate: newInvoiceFromDb.vatRate,
        cisRate: newInvoiceFromDb.cisRate,
        totalAmount: newInvoiceFromDb.totalAmount,
        normalHours: newInvoiceFromDb.normalHours,
        overtimeHours: newInvoiceFromDb.overtimeHours,
        // Safely handle null status, providing a default
        status: newInvoiceFromDb.status || 'pending',
        // Convert the Date object to a string
        createdAt: new Date(newInvoiceFromDb.createdAt!).toISOString(),
        // Convert a null note to undefined
        notes: newInvoiceFromDb.notes || undefined,
      };

    return finalInvoice;

    } catch (error) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.error("Invoice creation error:", errorMessage);
      throw new Error(`Failed to create invoice: ${errorMessage}`);
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
        totalCost: timesheets.totalCost,
        projectId: timesheets.projectId,
        username: users.username,
      })
      .from(invoiceTimesheets)
      .innerJoin(timesheets, eq(invoiceTimesheets.timesheetId, timesheets.id))
      .innerJoin(users, eq(timesheets.userId, users.id))
      .where(eq(invoiceTimesheets.invoiceId, invoiceId));

    // Explicitly create a new, fully-compliant object for each record.
    return result.map((ts) => {
      const finalTimesheet: Timesheet & { username: string } = {
        id: ts.id,
        referenceNumber: ts.referenceNumber,
        userId: ts.userId,
        weekStarting: new Date(ts.weekStarting).toISOString(),
        dailyHours: ts.dailyHours as DailyHours,
        totalHours: ts.totalHours,
        status: ts.status,
        notes: ts.notes || undefined,
        normalHours: ts.normalHours,
        normalRate: ts.normalRate,
        overtimeHours: ts.overtimeHours,
        overtimeRate: ts.overtimeRate,
        totalCost: ts.totalCost,
        projectId: ts.projectId,
        username: ts.username || 'Unknown User',
      };
      return finalTimesheet;
    });
  }

  async updateInvoice(id: number, update: Partial<Invoice>): Promise<Invoice> {

    const updateForDb = {
      ...update,
      createdAt: update.createdAt ? new Date(update.createdAt) : undefined,
    };
    
    const [updatedInvoiceFromDb] = await db
      .update(invoices)
      .set(updateForDb)
      .where(eq(invoices.id, id))
      .returning();
  
    if (!updatedInvoiceFromDb) {
      throw new Error(`Failed to update or retrieve invoice with ID: ${id}`);
    }
    // Transform the raw DB object before returning it
    const finalInvoice: Invoice = {
      id: updatedInvoiceFromDb.id,
      referenceNumber: updatedInvoiceFromDb.referenceNumber,
      userId: updatedInvoiceFromDb.userId,
      subtotal: updatedInvoiceFromDb.subtotal,
      vatRate: updatedInvoiceFromDb.vatRate,
      cisRate: updatedInvoiceFromDb.cisRate,
      totalAmount: updatedInvoiceFromDb.totalAmount,
      normalHours: updatedInvoiceFromDb.normalHours,
      overtimeHours: updatedInvoiceFromDb.overtimeHours,
      // Safely handle null status, providing a fallback
      status: updatedInvoiceFromDb.status || 'pending',
      // Convert the Date object back to a string
      createdAt: new Date(updatedInvoiceFromDb.createdAt!).toISOString(),
      // Convert a null value to undefined for optional fields
      notes: updatedInvoiceFromDb.notes || undefined,
      normalRate: updatedInvoiceFromDb.normalRate || undefined,
      overtimeRate: updatedInvoiceFromDb.overtimeRate || undefined,
    };

    return finalInvoice;
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

    // Transform every record to perfectly match the updated Invoice interface
    return result.map((invoiceFromDb) => {
      const finalInvoice: Invoice & { username: string } = {
        id: invoiceFromDb.id,
        referenceNumber: invoiceFromDb.referenceNumber,
        userId: invoiceFromDb.userId,
        subtotal: invoiceFromDb.subtotal,
        vatRate: invoiceFromDb.vatRate,
        cisRate: invoiceFromDb.cisRate,
        totalAmount: invoiceFromDb.totalAmount,
        normalHours: invoiceFromDb.normalHours,
        overtimeHours: invoiceFromDb.overtimeHours,
        status: invoiceFromDb.status || 'pending',
        createdAt: invoiceFromDb.createdAt ? new Date(invoiceFromDb.createdAt).toISOString() : new Date(0).toISOString(),
        notes: invoiceFromDb.notes || undefined,
        normalRate: invoiceFromDb.normalRate || undefined,
        overtimeRate: invoiceFromDb.overtimeRate || undefined,
        username: invoiceFromDb.username || 'Unknown User',
      };
      return finalInvoice;
    });
  }

  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const [timesheetFromDb] = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, id));

    if (!timesheetFromDb) return undefined;

    // Explicitly build the final object to match the Timesheet interface
    const finalTimesheet: Timesheet = {
      ...timesheetFromDb,
      weekStarting: new Date(timesheetFromDb.weekStarting).toISOString(),
      dailyHours: timesheetFromDb.dailyHours as DailyHours,
      // Safely convert a null 'notes' to 'undefined'
      notes: timesheetFromDb.notes || undefined,
      // Safely handle the nullable status field
      status: timesheetFromDb.status || 'draft',
    };

    return finalTimesheet;
  }

  async getUserTimesheets(userId: number): Promise<Timesheet[]> {
    const result = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.userId, userId));
    
    // Explicitly create a new object that handles all transformations
    return result.map(t => {
      const finalTimesheet: Timesheet = {
        ...t,
        weekStarting: new Date(t.weekStarting).toISOString(),
        dailyHours: t.dailyHours as DailyHours,
        // Convert a null 'notes' to 'undefined'
        notes: t.notes || undefined,
        // Provide a fallback for a null 'status'
        status: t.status || 'draft',
      };
      return finalTimesheet;
    });
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
        totalCost: timesheets.totalCost,
        projectId: timesheets.projectId,
      })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.userId, users.id));
  
    // The map must handle ALL transformations to match the Timesheet type
    return sheets.map((sheet) => ({
      ...sheet,
      weekStarting: new Date(sheet.weekStarting).toISOString(),
      dailyHours: sheet.dailyHours as DailyHours,
      // Add these next two lines to handle the nullable fields
      notes: sheet.notes || undefined, 
      status: sheet.status || 'draft',
      username: sheet.username || "Unknown User",
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

function nullsToUndefined<T extends object>(obj: T | undefined | null): T | undefined {
    if (!obj) return undefined;
    for (const key in obj) {
        if (obj[key] === null) {
            (obj as any)[key] = undefined;
        }
    }
    return obj;
}

export const storage = new DatabaseStorage();