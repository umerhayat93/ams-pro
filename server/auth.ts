
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { pool } from "./db";
import { User } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashed, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export async function setupAuth(app: Express) {
  // Dynamically import connect-pg-simple so this file works when bundled
  // to CJS (where import.meta isn't available) and also in ESM.
  const mod = await import("connect-pg-simple");
  const connectPgSimple = (mod && (mod.default || mod)) as any;

  const createTableIfMissing = true;

  // create the store instance but avoid letting the library try to read a
  // packaged table.sql file (which isn't available after bundling). We'll
  // create the table manually using the app's `pool` which is SSL-configured.
  const StoreConstructor = connectPgSimple(session);
  // Override the internal table-creation method to avoid reading a packaged
  // `table.sql` file which isn't available after bundling. Use our SSL-enabled
  // `pool` to create the table instead.
  const tableName = process.env.SESSION_TABLE_NAME || 'session';
  const createSql = `
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        sid varchar PRIMARY KEY NOT NULL,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_${tableName}_expire" ON "${tableName}" ("expire");
    `;

  StoreConstructor.prototype._rawEnsureSessionStoreTable = async function () {
    try {
      await pool.query(createSql);
    } catch (err) {
      console.error('connect-pg-simple: failed to create session table via pool override', err);
      throw err;
    }
  };

  const storeInstance = new StoreConstructor({ pool, createTableIfMissing: false });

  if (createTableIfMissing) {
    // create the sessions table in a safe idempotent way
    const tableName = process.env.SESSION_TABLE_NAME || 'session';
    const createSql = `
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        sid varchar PRIMARY KEY NOT NULL,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_${tableName}_expire" ON "${tableName}" ("expire");
    `;
    try {
      await pool.query(createSql);
    } catch (err) {
      console.error('Failed to ensure session table exists:', err);
      throw err;
    }
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r3pl1t_sup3r_s3cr3t_k3y",
    resave: false,
    saveUninitialized: false,
    store: storeInstance,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username" });
        }
        
        // In a real app we hash, but for the seed data provided in prompt
        // we might need to handle plain text first or hash it immediately.
        // Assuming we will seed with hashed password or hash on create.
        
        // Let's assume stored password is hashed.
        // If the seed password is plain text (rehan055), we need to ensure 
        // the seed process hashes it.
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid password" });
        }
        
        // Check if user is banned
        if (user.banned) {
          return done(null, false, { message: "Account is banned. Contact administrator." });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

// Export hashing utils for seeding
export const authUtils = { hashPassword };
