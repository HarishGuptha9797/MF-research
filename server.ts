import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables from .env or fallback to .env.example
if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
} else if (fs.existsSync(".env.example")) {
  dotenv.config({ path: ".env.example" });
} else {
  dotenv.config();
}

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strip quotes from env variables that might be accidentally wrapped
const cleanEnv = (val?: string) => val ? val.replace(/^["']|["']$/g, '').trim() : '';

const dbUrl = cleanEnv(process.env.DATABASE_URL) ;
const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.SUPABASE_ANON_KEY) || "";

// Initialize PostgreSQL connection pool as fallback
const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl ? { rejectUnauthorized: false } : undefined
});

// Initialize Supabase REST Client
const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith("http")) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Backend is running!" });
  });

  // Get ALL mutual funds for dropdown selection
  app.get("/api/funds/all", async (req, res) => {
    try {
      // Use standard pg connection to bypass any default pagination limits in REST APIs
      // This will grab all metadata immediately and efficiently on load
      const { rows } = await pool.query(`
        SELECT scheme_code, scheme_name, fund_house, scheme_category 
        FROM mutual_funds 
        WHERE scheme_category ILIKE '%Equity%' 
        ORDER BY scheme_name ASC
      `);
      res.json(rows);
    } catch (err) {
      console.error("Error fetching all funds metadata:", err);
      res.status(500).json({ error: "Failed to fetch master list of funds" });
    }
  });

  // Search mutual funds by name (Legacy approach for reference, can deprecate)
  app.get("/api/funds/search", async (req, res) => {
    try {
      const q = req.query.q as string || "";
      
      if (supabase) {
        // Use Supabase REST API
        let query = supabase.from("mutual_funds").select("scheme_code, scheme_name");
        if (q.length > 0) {
          query = query.ilike("scheme_name", `%${q}%`);
        }
        query = query.order("scheme_name", { ascending: true }).limit(50);
        
        const { data, error } = await query;
        if (error) throw error;
        return res.json(data);
      } else {
        // Fallback to pg
        let queryStr = "";
        let queryParams: any[] = [];

        if (q.length > 0) {
          queryStr = `
            SELECT scheme_code, scheme_name 
            FROM mutual_funds 
            WHERE scheme_name ILIKE $1 
            ORDER BY scheme_name ASC 
            LIMIT 50
          `;
          queryParams = [`%${q}%`];
        } else {
          queryStr = `
            SELECT scheme_code, scheme_name 
            FROM mutual_funds 
            ORDER BY scheme_name ASC 
            LIMIT 50
          `;
        }
        const { rows } = await pool.query(queryStr, queryParams);
        return res.json(rows);
      }
    } catch (err) {
      console.error("Error fetching funds:", err);
      res.status(500).json({ error: "Failed to search funds" });
    }
  });

  // Fetch full joined NAV history (simulates CSV row array)
  app.get("/api/funds/:id/full", async (req, res) => {
    try {
      const schemeCode = parseInt(req.params.id, 10);
      if (isNaN(schemeCode)) {
        return res.status(400).json({ error: "Invalid scheme code" });
      }

      // Join metadata and nav data to produce a flat array identical to uploaded CSV structures
      const { rows } = await pool.query(`
        SELECT 
          m.scheme_code, 
          m.scheme_name, 
          m.fund_house, 
          m.scheme_category, 
          e.date, 
          e.nav_value 
        FROM mutual_funds m
        JOIN equity_nav_data e ON m.scheme_code = e.scheme_code
        WHERE m.scheme_code = $1 
        ORDER BY e.date ASC
      `, [schemeCode]);

      return res.json(rows);
    } catch (err) {
      console.error("Error fetching joined nav data:", err);
      res.status(500).json({ error: "Failed to fetch joined DB data" });
    }
  });

  app.post("/api/analyze", (req, res) => {
    res.json({ success: true, message: "Analysis endpoint ready" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
