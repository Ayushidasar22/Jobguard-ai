// ============================================================
// JobGuard AI — Search Route
// ============================================================
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/jobs.json");

function readJobs() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (e) {
    return [];
  }
}

// ── GET /api/search — Search jobs ────────────────────────────
// Query params: q, location, type, category, remote, minSalary, sort
router.get("/", (req, res) => {
  try {
    const { q, location, type, category, remote, sort = "recent", safeOnly } = req.query;

    let jobs = readJobs();

    // Full-text search
    if (q) {
      const query = q.toLowerCase();
      jobs = jobs.filter(job =>
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.category?.toLowerCase().includes(query) ||
        job.requirements?.some(r => r?.toLowerCase().includes(query))
      );
    }

    // Location filter
    if (location) {
      const loc = location.toLowerCase();
      jobs = jobs.filter(job =>
        job.location?.toLowerCase().includes(loc) ||
        (loc === "remote" && job.remote)
      );
    }

    // Job type filter
    if (type) {
      jobs = jobs.filter(job =>
        job.type?.toLowerCase().includes(type.toLowerCase())
      );
    }

    // Category filter
    if (category && category !== "all") {
      jobs = jobs.filter(job =>
        job.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Remote filter
    if (remote === "true") {
      jobs = jobs.filter(job => job.remote === true);
    }

    // Safe jobs only (low risk score)
    if (safeOnly === "true") {
      jobs = jobs.filter(job => !job.riskScore || job.riskScore < 40);
    }

    // Sorting
    switch (sort) {
      case "recent":
        jobs.sort((a, b) => new Date(b.posted) - new Date(a.posted));
        break;
      case "oldest":
        jobs.sort((a, b) => new Date(a.posted) - new Date(b.posted));
        break;
      case "safest":
        jobs.sort((a, b) => (a.riskScore || 0) - (b.riskScore || 0));
        break;
      case "popular":
        jobs.sort((a, b) => (b.applicants || 0) - (a.applicants || 0));
        break;
    }

    // Get unique categories for filter options
    const allJobs = readJobs();
    const categories = [...new Set(allJobs.map(j => j.category).filter(Boolean))];
    const locations = [...new Set(allJobs.map(j => j.location).filter(Boolean))];

    res.json({
      success: true,
      total: jobs.length,
      query: { q, location, type, category, remote, sort },
      jobs,
      filters: { categories, locations }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/search/suggestions — Autocomplete ───────────────
router.get("/suggestions", (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });

    const jobs = readJobs();
    const query = q.toLowerCase();

    const suggestions = new Set();
    jobs.forEach(job => {
      if (job.title?.toLowerCase().includes(query)) suggestions.add(job.title);
      if (job.company?.toLowerCase().includes(query)) suggestions.add(job.company);
      if (job.category?.toLowerCase().includes(query)) suggestions.add(job.category);
    });

    res.json({ success: true, suggestions: [...suggestions].slice(0, 8) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;