// server/seed.ts
import { db, users } from "./db";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

async function seed() {
  try {
    console.log("Starting database seeding...");

    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));

    if (existingAdmin.length === 0) {
      console.log("Admin user not found. Creating admin user...");
      const hashedPassword = await hashPassword("admin"); // Use a strong password in production!

      const [newAdmin] = await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        role: "admin",
        active: true,
        normalRate: "15.00", // Default value
        overtimeRate: "20.00", // Default value
        email: "admin@tectanium.com" // Example default email
      }).returning();

      console.log("Admin user created successfully:", newAdmin.username);
    } else {
      console.log("Admin user already exists. Skipping creation.");
    }

    console.log("Database seeding completed.");
    process.exit(0); // Exit successfully
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1); // Exit with error
  }
}

seed();