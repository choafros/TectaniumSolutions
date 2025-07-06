import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { setupAuth, hashPassword } from "../auth";
import { db, users, companies, documents, timesheets, invoiceTimesheets, projects, invoices} from "../db";
import { eq, and } from "drizzle-orm";
import { calculateNormalAndOvertimeHours} from "../../client/src/lib/timesheet-utils"
// In-memory settings storage for now
let workSettings = {
  normalStartTime: "09:00",
  normalEndTime: "17:00",
  overtimeStartTime: "17:00",
  overtimeEndTime: "22:00",
  normalRate: "20.00",
  overtimeRate: "35.00",
};


const app = express();
const httpServer = createServer(app);

export async function registerRoutes(app: Express): Promise<void> {
  setupAuth(app);

  // Create admin user if none exists
  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) {
    await storage.createUser({
      username: "admin",
      password: await hashPassword("admin"),
      role: "admin",
      normalRate: "30",
      overtimeRate: "50",
      email: "admin@tectanium.com",
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
      // Create document for the current user only
      if (!req.user) return res.sendStatus(401);

      const doc = await storage.createDocument({
        userId: req.user.id,
        name: req.body.name,
        path: req.body.path,
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
      
      // Add project validation
      if (!req.body.projectId) {
        return res.status(400).json({ message: "Project is required" });
      }

      // Check project exists
      const project = await storage.getProject(req.body.projectId);
      if (!project) return res.status(400).json({ message: "Invalid project" });
      
      // Get user's hourly rate
      const user = await storage.getUserById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Check if timesheet exists for this specific user and week
      const userTimesheets = await storage.getUserTimesheets(req.user.id);
      const existingTimesheet = userTimesheets.find(
        (t) => new Date(t.weekStarting).toISOString().split("T")[0] ===
          weekStarting.toISOString().split("T")[0],
      );

      const { normalRate, overtimeRate } = user;
      console.log('user::normalRate: ', normalRate);
      console.log('user::overtimeRate: ', overtimeRate);

      // Calculate hour breakdown
      let totalNormalHours = 0;
      let totalOvertimeHours = 0;
      
      // Calculate total normal and overtime hours
      Object.values(req.body.dailyHours).forEach((dayHours) => {

        const { normalHours, overtimeHours } = calculateNormalAndOvertimeHours(
          dayHours as { start: string; end: string }, 
          {
            normalStartTime: "09:00",
            normalEndTime: "17:00",
            overtimeEndTime: "22:00",
          }        
        );
        totalNormalHours += normalHours;
        totalOvertimeHours += overtimeHours;
      });

      const totalCost =
        totalNormalHours * parseFloat(normalRate) +
        totalOvertimeHours * parseFloat(overtimeRate);
      console.log('totalCost: ', totalCost);

      let timesheet;
      if (existingTimesheet) {

        if (existingTimesheet.status !== "rejected") {
          throw new Error(
            "You have already submitted a timesheet for this week",
          );
        }

        // If timesheet was rejected, update it instead of creating new
        timesheet = await storage.updateTimesheet(
          existingTimesheet.id,
          {
            dailyHours: req.body.dailyHours,
            totalHours: String(totalNormalHours + totalOvertimeHours),
            normalHours: String(totalNormalHours),
            normalRate: String(user.normalRate),
            overtimeHours: String(totalOvertimeHours),
            overtimeRate: String(user.overtimeRate),
            totalCost: String(totalCost),
            status: req.body.status || "draft",
            projectId: req.body.projectId,
          },
        );
      
        // Update project hours here as well
        await storage.updateProjectHours(req.body.projectId);

        return res.json(timesheet);

      } else {

        timesheet = await storage.createTimesheet({
          referenceNumber: '',
          userId: req.user.id,
          weekStarting: weekStarting.toISOString(),
          dailyHours: req.body.dailyHours,
          totalHours: String(totalNormalHours + totalOvertimeHours),
          normalHours: String(totalNormalHours),
          normalRate: String(user.normalRate),
          overtimeHours: String(totalOvertimeHours),
          overtimeRate: String(user.overtimeRate),
          totalCost: String(totalCost),
          projectId: req.body.projectId,
          status: req.body.status || "draft",
        });
        console.log(timesheet);
        res.status(201).json(timesheet);
      }

      // Finally, Update project total hours
      await storage.updateProjectHours(req.body.projectId);
      
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/timesheets", async (req, res) => {

    try {
      if (!req.user) return res.sendStatus(401);

      let timesheets;

      if (req.user.role === "admin") {
        // Admin sees all timesheets with usernames
        timesheets = await storage.listAllTimesheets();
      } else {
        // Users only see their own timesheets
        timesheets = await storage.getUserTimesheets(req.user.id);
      }
      console.log('217:res: ',timesheets)
      res.json(timesheets);

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
      let totalNormalHours = 0;
      let totalOvertimeHours = 0;
    
      // Recalculate values to ensure accuracy
      const user = await storage.getUserById(timesheet.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { normalRate, overtimeRate } = user;

      const transformDailyHours = (dailyHours: Record<string, { start: string; end: string }>) => {
        return Object.values(dailyHours).map(({ start, end }) => ({
            normalHours: start && end ? `${start}-${end}` : "",
            overtimeHours: ""  // Leave empty as your logic already calculates overtime
        }));
      };

      console.log('timesheet.dailyHours: ', timesheet.dailyHours);
    
      // Calculate total normal and overtime hours
      Object.entries(timesheet.dailyHours).forEach(([day, hours]) => {
        if (!hours || !hours.start || !hours.end) {
          console.log(`Skipping ${day} due to empty hours`);
          return; // Skip days with empty values
        }
        const { normalHours, overtimeHours } = calculateNormalAndOvertimeHours(
            hours, // Now this correctly passes { start: "09:00", end: "17:00" }
            {
                normalStartTime: "09:00",
                normalEndTime: "17:00",
                overtimeEndTime: "22:00",
            }
        );
    
        totalNormalHours += normalHours;
        totalOvertimeHours += overtimeHours;
      });
    

      console.log('totalNormalHours: ', totalNormalHours);

      const totalCost =
        totalNormalHours * parseFloat(normalRate) +
        totalOvertimeHours * parseFloat(overtimeRate);
      console.log('patch: totalCost: ', totalCost);

      const updatedTimesheet = await storage.updateTimesheet(
        parseInt(req.params.id),
        {
          dailyHours: req.body.dailyHours,
          totalHours: String(totalNormalHours + totalOvertimeHours),
          normalHours: String(totalNormalHours),
          overtimeHours: String(totalOvertimeHours),
          totalCost: String(totalCost),
          status: req.body.status || "draft",
          projectId: timesheet.projectId,
        },
      );
      
       // Finally, update project total hours to keep consistency
       await storage.updateProjectHours(updatedTimesheet.projectId);

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

  // Project routes
  app.post("/api/projects", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      
      const project = await storage.createProject(req.body);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      if (!req.user) return res.sendStatus(401);
      
      const projects = await storage.listAllProjects();
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      
      const project = await storage.updateProject(
        parseInt(req.params.id),
        req.body
      );
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
      
      await storage.deleteProject(parseInt(req.params.id));
      res.sendStatus(204);
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

  app.get('/api/users/:id', async (req, res) => {
    const userId = Number(req.params.id);
    try {
      // Fetch the user from the database based on the userId.
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
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
      await storage.updateUser(userId, {active});
      return res.status(200).json({ success: true });

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id/rates", async (req, res) => {
    try {
      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);
  
      const userId = parseInt(req.params.id);
      const { normalRate, overtimeRate } = req.body;
  
      if (typeof normalRate !== "number" || normalRate <= 0 || isNaN(normalRate)) {
        return res.status(400).json({ message: "Normal rate must be a valid positive number." });
      }
      if (typeof overtimeRate !== "number" || overtimeRate <= 0 || isNaN(overtimeRate)) {
        return res.status(400).json({ message: "Overtime rate must be a valid positive number." });
      }
  
      const updatedUser = await storage.updateUserRates(userId, normalRate, overtimeRate);
  
      return res.status(200).json({ success: true, user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "An error occurred while updating rates." });
    }
  });
  
  
  // Invoices
  app.post("/api/invoices", async (req, res) => {
    
    try {

      if (!req.user || req.user.role !== "admin") return res.sendStatus(401);

      // Extract timesheetIds separately from the request body
      const { timesheetIds, ...invoiceData } = req.body;

      // Validate timesheetIds
      if (!timesheetIds || !Array.isArray(timesheetIds) || timesheetIds.length === 0) {
        return res.status(400).json({ message: "No timesheets selected for invoice generation" });
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
          totalCost: timesheets.totalCost,
          normalHours: timesheets.normalHours,
          normalRate: timesheets.normalRate,
          overtimeHours: timesheets.overtimeHours,
          overtimeRate: timesheets.overtimeRate,
          projectId: timesheets.projectId,
          projectName: projects.name,

        })
        .from(timesheets)
        .innerJoin(invoiceTimesheets, eq(invoiceTimesheets.timesheetId, timesheets.id))
        .innerJoin(users, eq(users.id, timesheets.userId))
        .innerJoin(projects, eq(projects.id, timesheets.projectId))
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
}


// Register routes
registerRoutes(app).catch((err) => {
  console.error("Error registering routes:", err);
});

// Export the Express app
export { app };
// Export the HTTP server
export default httpServer;