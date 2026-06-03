// ============================================================
// JobGuard AI — Main Server
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const jobsRouter = require("./routes/jobs");
const detectRouter = require("./routes/detect");
const searchRouter = require("./routes/search");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: "*", // Allow all origins for local dev
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
app.use("/api/jobs", jobsRouter);
app.use("/api/detect", detectRouter);
app.use("/api/search", searchRouter);

// ── Health Check ────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "JobGuard AI Server is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// ── Root ────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Welcome to JobGuard AI API", docs: "/api/health" });
});

// ── Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    success: false
  });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ JobGuard AI Server running on http://localhost:${PORT}`);
  console.log(`📋 API Routes:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/jobs`);
  console.log(`   POST /api/jobs`);
  console.log(`   POST /api/detect`);
  console.log(`   GET  /api/search?q=keyword&location=city&type=fulltime`);
  console.log(`\n🤖 AI Detection: ${process.env.ANTHROPIC_API_KEY ? "✅ API Key Found" : "❌ Missing API Key in .env"}\n`);
});