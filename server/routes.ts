import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertCompanySchema, insertTimesheetSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Companies
  app.post("/api/companies", async (req, res) => {
    const parsed = insertCompanySchema.parse(req.body);
    const company = await storage.createCompany(parsed);
    res.status(201).json(company);
  });

  app.get("/api/companies", async (req, res) => {
    const companies = await storage.listCompanies();
    res.json(companies);
  });

  app.patch("/api/companies/:id", async (req, res) => {
    const company = await storage.updateCompany(parseInt(req.params.id), req.body);
    res.json(company);
  });

  // Documents
  app.post("/api/documents", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const doc = await storage.createDocument({
      userId: req.user.id,
      name: req.body.name,
      path: req.body.path,
    });
    res.status(201).json(doc);
  });

  app.get("/api/documents", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const docs = await storage.getDocuments(req.user.id);
    res.json(docs);
  });

  // Timesheets
  app.post("/api/timesheets", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const parsed = insertTimesheetSchema.parse({
      ...req.body,
      userId: req.user.id,
    });
    const timesheet = await storage.createTimesheet(parsed);
    res.status(201).json(timesheet);
  });

  app.get("/api/timesheets", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role === "admin") {
      const timesheets = await storage.listTimesheets();
      res.json(timesheets);
    } else {
      const timesheets = await storage.getUserTimesheets(req.user.id);
      res.json(timesheets);
    }
  });

  app.patch("/api/timesheets/:id", async (req, res) => {
    if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
    const timesheet = await storage.updateTimesheet(
      parseInt(req.params.id),
      req.body,
    );
    res.json(timesheet);
  });

  const httpServer = createServer(app);
  return httpServer;
}
