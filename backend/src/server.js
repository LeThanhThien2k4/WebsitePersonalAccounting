import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import journalsRouter from "./routes/journals.js";
import accountsRouter from "./routes/accounts.js";
import ledgersRouter from "./routes/ledgers.js";
import reportsRouter from "./routes/reports.js";
import exportRouter from "./routes/export.js";
import inventoryRoutes from "./routes/inventory.js";
import userRoutes from "./routes/users.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Debug log
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/journals", journalsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/ledgers", ledgersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/export", exportRouter);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);


// Global error
app.use((err, _req, res, _next) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({ error: err.message });
});

app.listen(4000, () => console.log("✅ Server running at http://localhost:4000"));
