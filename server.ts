import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
  });

  // API Route for Admin Login
  app.use("/api/admin/login", (req, res, next) => {
    console.log(`Login route hit with method: ${req.method}`);
    
    // Debug: Log available env keys (not values)
    console.log("Available env keys:", Object.keys(process.env).filter(k => k.includes("ADMIN")));

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed. Use POST." });
    }

    const { password } = req.body;
    console.log("Password received:", password ? "Yes" : "No");
    
    // Check both VITE_ and non-VITE_ versions for maximum flexibility
    const passwordsStr = process.env.VITE_ADMIN_PASSWORDS || 
                        process.env.ADMIN_PASSWORDS || 
                        process.env.VITE_ADMIN_PASSWORD || 
                        process.env.ADMIN_PASSWORD || 
                        "";
    
    if (!passwordsStr) {
      console.error("Admin passwords not configured in environment variables.");
      return res.status(500).json({ success: false, message: "Server configuration error: Admin passwords missing." });
    }

    const adminPasswords = passwordsStr.split(",").map((p: string) => p.trim());
    
    if (password && adminPasswords.includes(password.trim())) {
      console.log("Login successful");
      return res.json({ success: true });
    } else {
      console.log("Login failed: Invalid password");
      return res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
