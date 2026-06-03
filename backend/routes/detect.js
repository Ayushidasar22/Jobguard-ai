// ============================================================
// JobGuard AI — Detection Route
// ============================================================
const express = require("express");
const router = express.Router();
const { detectFakeJob } = require("../services/aiDetector");

// ── POST /api/detect — Analyze a job listing ─────────────────
router.post("/", async (req, res) => {
  try {
    const jobData = req.body;

    // Require at least a description or title
    if (!jobData.description && !jobData.title) {
      return res.status(400).json({
        success: false,
        error: "Please provide at least a job title or description to analyze."
      });
    }

    console.log(`🔍 Analyzing job: "${jobData.title || 'Untitled'}" at "${jobData.company || 'Unknown Company'}"`);

    const analysis = await detectFakeJob(jobData);

    console.log(`✅ Analysis complete: ${analysis.verdict} (Risk: ${analysis.riskScore}/100)`);

    res.json({
      success: true,
      analysis,
      jobData: {
        title: jobData.title,
        company: jobData.company,
        location: jobData.location
      }
    });

  } catch (error) {
    console.error("Detection route error:", error);
    res.status(500).json({
      success: false,
      error: "Analysis failed. Please check your API key and try again.",
      details: error.message
    });
  }
});

// ── POST /api/detect/quick — Quick text analysis ─────────────
router.post("/quick", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "No text provided." });

    // Parse the raw text into a job-like structure
    const jobData = {
      title: "Unknown Position",
      company: "Unknown Company",
      description: text,
      salary: "",
      requirements: "",
      contactEmail: "",
      companyWebsite: "",
      location: ""
    };

    // Try to extract fields from text
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const websiteMatch = text.match(/https?:\/\/[\w.-]+/);
    const salaryMatch = text.match(/(\$|₹|€|£)[\d,]+[\s-]*[\d,]*(\/\w+|per\s\w+|LPA|k|K)?/i);

    if (emailMatch) jobData.contactEmail = emailMatch[0];
    if (websiteMatch) jobData.companyWebsite = websiteMatch[0];
    if (salaryMatch) jobData.salary = salaryMatch[0];

    const analysis = await detectFakeJob(jobData);
    res.json({ success: true, analysis });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;