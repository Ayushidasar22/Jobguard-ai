// ============================================================
// JobGuard AI — Jobs Routes (CRUD)
// ============================================================
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DB_PATH = path.join(__dirname, "../data/jobs.json");

// Helper: read jobs from JSON file
function readJobs() {
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper: write jobs to JSON file
function writeJobs(jobs) {
  fs.writeFileSync(DB_PATH, JSON.stringify(jobs, null, 2), "utf8");
}

// ── GET /api/jobs — Get all jobs ─────────────────────────────
router.get("/", (req, res) => {
  try {
    const jobs = readJobs();
    const { category, remote, verified, limit = 20, page = 1 } = req.query;

    let filtered = [...jobs];

    if (category) filtered = filtered.filter(j => j.category?.toLowerCase() === category.toLowerCase());
    if (remote !== undefined) filtered = filtered.filter(j => j.remote === (remote === "true"));
    if (verified !== undefined) filtered = filtered.filter(j => j.verified === (verified === "true"));

    // Sort by posted date (newest first)
    filtered.sort((a, b) => new Date(b.posted) - new Date(a.posted));

    // Pagination
    const total = filtered.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filtered.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      jobs: paginated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/jobs/:id — Get single job ───────────────────────
router.get("/:id", (req, res) => {
  try {
    const jobs = readJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ success: false, error: "Job not found" });
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/jobs — Create new job ──────────────────────────
router.post("/", (req, res) => {
  try {
    const {
      title, company, location, type, salary,
      description, requirements, benefits,
      contactEmail, companyWebsite, category, remote
    } = req.body;

    // Validation
    if (!title || !company || !description) {
      return res.status(400).json({
        success: false,
        error: "Title, company, and description are required."
      });
    }

    const jobs = readJobs();

    const newJob = {
      id: `job-${uuidv4().split("-")[0]}`,
      title: title.trim(),
      company: company.trim(),
      location: location || "Not specified",
      type: type || "Full-time",
      salary: salary || "Negotiable",
      description: description.trim(),
      requirements: Array.isArray(requirements) ? requirements : (requirements ? requirements.split("\n").filter(Boolean) : []),
      benefits: Array.isArray(benefits) ? benefits : (benefits ? benefits.split("\n").filter(Boolean) : []),
      contactEmail: contactEmail || "",
      companyWebsite: companyWebsite || "",
      category: category || "General",
      remote: remote === true || remote === "true",
      verified: false, // New jobs are unverified until reviewed
      posted: new Date().toISOString().split("T")[0],
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      applicants: 0,
      riskScore: null
    };

    jobs.push(newJob);
    writeJobs(jobs);

    res.status(201).json({
      success: true,
      message: "Job posted successfully!",
      job: newJob
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE /api/jobs/:id — Delete a job ──────────────────────
router.delete("/:id", (req, res) => {
  try {
    let jobs = readJobs();
    const index = jobs.findIndex(j => j.id === req.params.id);
    if (index === -1) return res.status(404).json({ success: false, error: "Job not found" });

    jobs.splice(index, 1);
    writeJobs(jobs);
    res.json({ success: true, message: "Job deleted." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/jobs/stats/summary — Stats ─────────────────────
router.get("/stats/summary", (req, res) => {
  try {
    const jobs = readJobs();
    const categories = {};
    let fakeCount = 0;
    let safeCount = 0;

    jobs.forEach(j => {
      categories[j.category] = (categories[j.category] || 0) + 1;
      if (j.riskScore >= 70) fakeCount++;
      else if (j.riskScore !== null) safeCount++;
    });

    res.json({
      success: true,
      stats: {
        total: jobs.length,
        verified: jobs.filter(j => j.verified).length,
        fake: fakeCount,
        safe: safeCount,
        categories,
        remote: jobs.filter(j => j.remote).length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;