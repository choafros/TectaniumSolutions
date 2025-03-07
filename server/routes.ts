import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { db, users, companies, documents, timesheets, invoiceTimesheets } from "./db";
import { eq, and } from "drizzle-orm";
// In-memory settings storage for now
let workSettings = {
  normalStartTime: "09:00",
  normalEndTime: "17:00",
  overtimeStartTime: "17:00",
  overtimeEndTime: "22:00",
  normalRate: "20.00",
  overtimeRate: "35.00",
};

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

  // Settings routes
  app.get("/api/settings", (req, res) => {
    if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
    res.json(workSettings);
  });

  app.post("/api/settings", (req, res) => {
    if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
    workSettings = { ...workSettings, ...req.body };
    res.json(workSettings);
  });

  // Documents
  app.post("/api/documents", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      // Create document for the current user only
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
        // Admin sees all documents with usernames
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

  // Timesheets
  app.post("/api/timesheets", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const weekStarting = new Date(req.body.weekStarting);
      if (isNaN(weekStarting.getTime())) {
        throw new Error("Invalid date format");
      }

      // Check if timesheet exists for this specific user and week
      const userTimesheets = await storage.getUserTimesheets(req.user.id);
      const existingTimesheet = userTimesheets.find(
        (t) =>
          new Date(t.weekStarting).toISOString().split("T")[0] ===
          weekStarting.toISOString().split("T")[0],
      );

      if (existingTimesheet) {
        if (existingTimesheet.status !== "rejected") {
          throw new Error(
            "You have already submitted a timesheet for this week",
          );
        }
        // If timesheet was rejected, update it instead of creating new
        const updatedTimesheet = await storage.updateTimesheet(
          existingTimesheet.id,
          {
            dailyHours: req.body.dailyHours,
            totalHours: req.body.totalHours,
            status: req.body.status || "draft",
          },
        );
        return res.json(updatedTimesheet);
      }

      const timesheet = await storage.createTimesheet({
        userId: req.user.id,
        weekStarting,
        dailyHours: req.body.dailyHours,
        totalHours: req.body.totalHours,
        status: req.body.status || "draft",
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
        // Admin sees all timesheets with usernames
        const timesheets = await storage.listAllTimesheets();
        res.json(timesheets);
      } else {
        // Users only see their own timesheets
        const timesheets = await storage.getUserTimesheets(req.user.id);
        res.json(timesheets);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/timesheets/:id", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);

      const timesheet = await storage.getTimesheet(parseInt(req.params.id));
      if (!timesheet) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      // Regular users can only update their draft or rejected timesheets
      if (req.user.role !== "admin") {
        if (timesheet.userId !== req.user.id) {
          return res
            .status(403)
            .json({ message: "You can only modify your own timesheets" });
        }
        if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
          return res.status(403).json({
            message: "Only draft or rejected timesheets can be modified",
          });
        }
      }

      const updatedTimesheet = await storage.updateTimesheet(
        parseInt(req.params.id),
        req.body,
      );
      res.json(updatedTimesheet);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
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
  
      const userId = parseInt(req.params.id);
      const { active } = req.body;
  
      // Validate that active is a boolean
      if (typeof active !== "boolean") {
        return res.status(400).json({ message: "Active status must be a boolean" });
      }
  
      // Update the user's active status
      await storage.updateUserActiveStatus(userId, active);
      return res.status(200).json({ success: true });

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Invoices
  app.post("/api/invoices", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);

      // Extract timesheetIds separately from the request body
      const { timesheetIds, ...invoiceData } = req.body;
      // Validate timesheetIds
      if (
        !timesheetIds ||
        !Array.isArray(timesheetIds) ||
        timesheetIds.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "No timesheets selected for invoice generation" });
      }
      console.log("Received timesheetIds:", timesheetIds);

      // Now pass both `invoiceData` and `timesheetIds` to `createInvoice`
      const invoice = await storage.createInvoice(invoiceData, timesheetIds);

      res.status(201).json(invoice);
    } catch (error: any) {
      console.error("Invoice creation error:", error.message);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/invoices", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);

      const invoices = await storage.listAllInvoices();
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);

      const invoice = await storage.updateInvoice(
        parseInt(req.params.id),
        req.body,
      );
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id/timesheets", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);

      const invoiceId = parseInt(req.params.id);
      if (!invoiceId || isNaN(invoiceId)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      // Get all timesheets linked to this invoice with username
      const linkedTimesheets = await db
        .select({
          id: timesheets.id,
          userId: timesheets.userId,
          referenceNumber: timesheets.referenceNumber,
          weekStarting: timesheets.weekStarting,
          dailyHours: timesheets.dailyHours,
          totalHours: timesheets.totalHours,
          status: timesheets.status,
          notes: timesheets.notes,
          username: users.username,
        })
        .from(timesheets)
        .innerJoin(invoiceTimesheets, eq(invoiceTimesheets.timesheetId, timesheets.id))
        .innerJoin(users, eq(users.id, timesheets.userId))
        .where(eq(invoiceTimesheets.invoiceId, invoiceId));

        console.log("Found linked timesheets:", linkedTimesheets);

        // Map the results to ensure all fields are present
        const formattedTimesheets = linkedTimesheets.map((timesheet) => ({
          ...timesheet,
          username: timesheet.username || "Unknown User",
        }));

      res.json(formattedTimesheets);

    } catch (error: any) {
      console.error("Error fetching linked timesheets:", error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}