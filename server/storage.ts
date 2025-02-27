import { User, Company, Document, Timesheet, InsertUser, InsertCompany, InsertDocument, InsertTimesheet } from "@shared/schema";
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
  listAllDocuments(): Promise<Document[]>;

  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getUserTimesheets(userId: number): Promise<Timesheet[]>;
  updateTimesheet(id: number, timesheet: Partial<Timesheet>): Promise<Timesheet>;
  listTimesheets(): Promise<Timesheet[]>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private documents: Map<number, Document>;
  private timesheets: Map<number, Timesheet>;
  private currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.documents = new Map();
    this.timesheets = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const id = this.currentId++;
    const newCompany: Company = { ...company, id };
    this.companies.set(id, newCompany);
    return newCompany;
  }

  async updateCompany(id: number, company: Partial<Company>): Promise<Company> {
    const existing = await this.getCompany(id);
    if (!existing) throw new Error("Company not found");
    const updated = { ...existing, ...company };
    this.companies.set(id, updated);
    return updated;
  }

  async listCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const id = this.currentId++;
    const document: Document = { ...doc, id, approved: false };
    this.documents.set(id, document);
    return document;
  }

  async getDocuments(userId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.userId === userId,
    );
  }

  async updateDocument(id: number, doc: Partial<Document>): Promise<Document> {
    const existing = this.documents.get(id);
    if (!existing) throw new Error("Document not found");
    const updated = { ...existing, ...doc };
    this.documents.set(id, updated);
    return updated;
  }

  async listAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const id = this.currentId++;
    const newTimesheet: Timesheet = { 
      ...timesheet, 
      id,
      status: "pending"
    };
    this.timesheets.set(id, newTimesheet);
    return newTimesheet;
  }

  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    return this.timesheets.get(id);
  }

  async getUserTimesheets(userId: number): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values()).filter(
      (ts) => ts.userId === userId,
    );
  }

  async updateTimesheet(id: number, timesheet: Partial<Timesheet>): Promise<Timesheet> {
    const existing = await this.getTimesheet(id);
    if (!existing) throw new Error("Timesheet not found");
    const updated = { ...existing, ...timesheet };
    this.timesheets.set(id, updated);
    return updated;
  }

  async listTimesheets(): Promise<Timesheet[]> {
    return Array.from(this.timesheets.values());
  }
}

export const storage = new MemStorage();