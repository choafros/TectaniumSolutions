import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { pool } from "./db";
import { User as SelectUser } from "@shared/schema";

// This declares that the Express User can be our custom User type
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  
  if (!hashed || !salt) {
    throw new Error("Invalid stored password format");
  }

  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  
  // Use connect-pg-simple for the session store
  const PgStore = connectPgSimple(session);

  const sessionStore = new PgStore({
    pool: pool, // Use the pool from db.ts
    tableName: "user_sessions",
    createTableIfMissing: true,
  });

  // TODO: Remove
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Use database-backed store not in memory!
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      httpOnly: true,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    // Local strategy for username/password authentication
    // This strategy will be used for login and registration
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user || !user.password) {
          return done(null, false, { message: "Invalid username or password." });
        } 

        const passwordsMatch = await comparePasswords(password, user.password);
        
        if (!passwordsMatch) {
          return done(null, false, { message: "Invalid username or password." });
        }

        if (!user.active) {
          return done(null, false, { message:"Your account is deactivated. Please contact your administrator."});
        }

        return done(null, user);
        
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
      done(null, user.id);
    });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // --- API Routes for Auth ---

  // Register a new user
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        active: true, // Ensure new users are active by default
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Login an existing user
  app.post("/api/login", (req, res, next) => {
  
    // passport.authenticate callback to include types for err, user, and info
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {

      if (err) {
        return res.status(401).json({ message: err.message });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}