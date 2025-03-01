import { User, Company, Document, Timesheet, InsertUser, InsertCompany, InsertDocument, InsertTimesheet } from "@shared/schema";
import { db, users, companies, documents, timesheets } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company>;
  listCompanies(): Promise<Company[]>;

  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(userId: number): Promise<Document[]>;
  updateDocument(id: number, doc: Partial<Document>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  listAllDocuments(): Promise<Document[]>;

  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getUserTimesheets(userId: number): Promise<Timesheet[]>;
  updateTimesheet(id: number, timesheet: Partial<Timesheet>): Promise<Timesheet>;
  deleteTimesheet(id: number): Promise<void>;
  listTimesheets(): Promise<Timesheet[]>;

  sessionStore: session.Store;
  listUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async deleteUser(id: number): Promise<void> {
    // First delete all related timesheets and documents
    await db.delete(timesheets).where(eq(timesheets.userId, id));
    await db.delete(documents).where(eq(documents.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
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
    return await db.select().from(documents).where(eq(documents.userId, userId));
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

  async listAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const [newTimesheet] = await db.insert(timesheets).values(timesheet).returning();
    return newTimesheet;
  }

  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return timesheet;
  }

  async getUserTimesheets(userId: number): Promise<Timesheet[]> {
    return await db.select().from(timesheets).where(eq(timesheets.userId, userId));
  }

  async updateTimesheet(id: number, timesheet: Partial<Timesheet>): Promise<Timesheet> {
    const [updatedTimesheet] = await db
      .update(timesheets)
      .set(timesheet)
      .where(eq(timesheets.id, id))
      .returning();
    return updatedTimesheet;
  }

  async deleteTimesheet(id: number): Promise<void> {
    await db.delete(timesheets).where(eq(timesheets.id, id));
  }

  async listTimesheets(): Promise<Timesheet[]> {
    return await db.select().from(timesheets);
  }
}

export const storage = new DatabaseStorage();