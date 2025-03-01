import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertCompanySchema, insertTimesheetSchema } from "@shared/schema";
import { db, users, companies, documents, timesheets } from "./db";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Create admin user if none exists
  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) {
    await storage.createUser({
      username: "admin",
      password: await hashPassword("admin"),
      role: "admin",
      companyId: null,
      active: true,
    });
  }

  // Documents
  app.post("/api/documents", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      const doc = await storage.createDocument({
        userId: req.user.id,
        name: req.body.name,
        path: req.body.path,
        uploadedAt: new Date(),
      });
      res.status(201).json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      if (req.user.role === "admin") {
        const docs = await db.select({
          id: documents.id,
          name: documents.name,
          path: documents.path,
          uploadedAt: documents.uploadedAt,
          approved: documents.approved,
          userId: documents.userId,
          username: users.username,
        })
        .from(documents)
        .leftJoin(users, eq(documents.userId, users.id));
        res.json(docs);
      } else {
        const docs = await storage.getDocuments(req.user.id);
        res.json(docs);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      const doc = await storage.updateDocument(parseInt(req.params.id), req.body);
      res.json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Timesheets
  app.post("/api/timesheets", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      // Parse the date string into a Date object
      const weekStarting = new Date(req.body.weekStarting);
      if (isNaN(weekStarting.getTime())) {
        throw new Error("Invalid date format");
      }

      // Check if timesheet already exists for this week and user
      const existingTimesheet = await db
        .select()
        .from(timesheets)
        .where(
          and(
            eq(timesheets.userId, req.user.id),
            eq(timesheets.weekStarting, weekStarting)
          )
        );

      if (existingTimesheet.length > 0) {
        throw new Error("A timesheet for this week already exists");
      }

      const parsed = insertTimesheetSchema.parse({
        ...req.body,
        userId: req.user.id,
        weekStarting,
      });

      const timesheet = await storage.createTimesheet(parsed);
      res.status(201).json(timesheet);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/timesheets", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      if (req.user.role === "admin") {
        const timesheets = await db.select({
          id: timesheets.id,
          userId: timesheets.userId,
          weekStarting: timesheets.weekStarting,
          hours: timesheets.hours,
          status: timesheets.status,
          notes: timesheets.notes,
          username: users.username,
        })
        .from(timesheets)
        .leftJoin(users, eq(timesheets.userId, users.id));
        res.json(timesheets);
      } else {
        const timesheets = await storage.getUserTimesheets(req.user.id);
        res.json(timesheets);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/timesheets/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      const timesheet = await storage.updateTimesheet(parseInt(req.params.id), req.body);
      res.json(timesheet);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      const users = await storage.listUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      const user = await storage.updateUser(parseInt(req.params.id), req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}