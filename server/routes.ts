import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
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
        // Admin sees all documents with user information
        const docs = await storage.listAllDocuments();
        res.json(docs);
      } else {
        // Users only see their own documents
        const docs = await storage.getDocuments(req.user.id);
        res.json(docs);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      await storage.deleteDocument(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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

      const weekStarting = new Date(req.body.weekStarting);
      if (isNaN(weekStarting.getTime())) {
        throw new Error("Invalid date format");
      }

      // Check if timesheet already exists for this week and user
      const existingTimesheets = await storage.getUserTimesheets(req.user.id);
      const hasExisting = existingTimesheets.some(
        t => t.weekStarting.toISOString().split('T')[0] === weekStarting.toISOString().split('T')[0]
      );

      if (hasExisting) {
        throw new Error("A timesheet for this week already exists");
      }

      const timesheet = await storage.createTimesheet({
        userId: req.user.id,
        weekStarting,
        hours: req.body.hours,
        status: "pending",
      });

      res.status(201).json(timesheet);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/timesheets", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      if (req.user.role === "admin") {
        // Admin sees all timesheets with user information
        const allTimesheets = await storage.listAllTimesheets();
        res.json(allTimesheets);
      } else {
        // Regular users only see their own timesheets
        const userTimesheets = await storage.getUserTimesheets(req.user.id);
        res.json(userTimesheets);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/timesheets/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      await storage.deleteTimesheet(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/timesheets/:id", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const timesheet = await storage.getTimesheet(parseInt(req.params.id));
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      // Only admin can update any timesheet, regular users can only update their own
      if (req.user.role !== "admin" && timesheet.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized to modify this timesheet" });
      }

      const updatedTimesheet = await storage.updateTimesheet(parseInt(req.params.id), req.body);
      res.json(updatedTimesheet);
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

  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);

      const userId = parseInt(req.params.id);
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(userId);
      res.sendStatus(200);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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