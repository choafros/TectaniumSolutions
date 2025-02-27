import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertCompanySchema, insertTimesheetSchema } from "@shared/schema";

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
    });
  }

  // Companies
  app.post("/api/companies", async (req, res) => {
    try {
      const parsed = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(parsed);
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.listCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.updateCompany(parseInt(req.params.id), req.body);
      res.json(company);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

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
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      const docs = await storage.getDocuments(req.user.id);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ message: error.message });
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

      const parsed = insertTimesheetSchema.parse({
        ...req.body,
        userId: req.user.id,
        weekStarting,
      });

      const timesheet = await storage.createTimesheet(parsed);
      res.status(201).json(timesheet);
    } catch (error) {
      console.error("Timesheet submission error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/timesheets", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      if (req.user.role === "admin") {
        const timesheets = await storage.listTimesheets();
        res.json(timesheets);
      } else {
        const timesheets = await storage.getUserTimesheets(req.user.id);
        res.json(timesheets);
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/timesheets/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      const timesheet = await storage.updateTimesheet(
        parseInt(req.params.id),
        req.body,
      );
      res.json(timesheet);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}