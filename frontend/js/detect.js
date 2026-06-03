// ============================================================
// JobGuard AI — Detection Logic (Frontend)
// ============================================================

function switchDetectMode(mode) {
  document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".detect-mode").forEach(m => m.classList.add("hidden"));

  document.querySelector(`.mode-tab[onclick*="${mode}"]`).classList.add("active");
  document.getElementById(`detect${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.remove("hidden");
}

// ── Detailed Job Analysis ────────────────────────────────────
async function analyzeJob() {
  const title = document.getElementById("dTitle").value.trim();
  const description = document.getElementById("dDescription").value.trim();

  if (!title && !description) {
    showToast("Please provide at least a job title or description.", "error");
    return;
  }

  const btn = document.getElementById("detectBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-icon">⏳</span> Analyzing...`;

  showAnalyzing();

  try {
    const data = await API.detectJob({
      title,
      company: document.getElementById("dCompany").value.trim(),
      location: document.getElementById("dLocation").value.trim(),
      salary: document.getElementById("dSalary").value.trim(),
      contactEmail: document.getElementById("dEmail").value.trim(),
      companyWebsite: document.getElementById("dWebsite").value.trim(),
      description,
      requirements: document.getElementById("dRequirements").value.trim()
    });

    if (data.success) {
      renderAnalysisResult(data.analysis, { title, company: document.getElementById("dCompany").value });
    } else {
      showAnalysisError(data.error || "Analysis failed.");
    }
  } catch (e) {
    showAnalysisError("Cannot connect to server. Is the backend running?");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon">🤖</span> Analyze with AI`;
  }
}

// ── Quick Text Analysis ──────────────────────────────────────
async function analyzeQuick() {
  const text = document.getElementById("dQuickText").value.trim();
  if (!text) { showToast("Please paste a job listing to analyze.", "error"); return; }

  const btn = document.getElementById("detectBtnQuick");
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-icon">⏳</span> Analyzing...`;

  showAnalyzing();

  try {
    const data = await API.detectQuick(text);
    if (data.success) {
      renderAnalysisResult(data.analysis, { title: "Quick Analysis" });
    } else {
      showAnalysisError(data.error || "Analysis failed.");
    }
  } catch (e) {
    showAnalysisError("Cannot connect to server. Is the backend running?");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon">⚡</span> Quick Analyze`;
  }
}

// ── Show Analyzing State ─────────────────────────────────────
function showAnalyzing() {
  document.getElementById("detectResultPanel").innerHTML = `
    <div class="analyzing-state">
      <div class="analyze-spinner"></div>
      <h3>AI is analyzing...</h3>
      <p>Checking for fraud indicators, salary validity, company legitimacy, and more.</p>
    </div>`;
}

// ── Render Analysis Result ───────────────────────────────────
function renderAnalysisResult(analysis, meta = {}) {
  const { riskScore, verdict, confidence, summary, redFlags, positiveSignals, recommendation, detailedAnalysis } = analysis;

  const verdictClass = verdict === "SAFE" ? "safe" : verdict === "SUSPICIOUS" ? "suspicious" : "fake";
  const riskBarColor = riskScore >= 70 ? "var(--danger)" : riskScore >= 40 ? "var(--warn)" : "var(--safe)";
  const verdictEmoji = verdict === "SAFE" ? "✅" : verdict === "SUSPICIOUS" ? "🟡" : "❌";

  const html = `
    <div class="analysis-result">
      <!-- Verdict Banner -->
      <div class="verdict-banner ${verdictClass}">
        <div>
          <div class="verdict-label">AI VERDICT — ${confidence} CONFIDENCE</div>
          <div class="verdict-text">${verdictEmoji} ${verdict}</div>
          ${meta.title ? `<div style="font-size:0.8rem;margin-top:4px;opacity:0.7">${meta.title}${meta.company ? " · " + meta.company : ""}</div>` : ""}
        </div>
        <div class="verdict-score-block">
          <div class="score-num" style="color:${riskBarColor}">${riskScore}</div>
          <div class="score-label">Risk Score /100</div>
        </div>
      </div>

      <!-- Risk Bar -->
      <div class="risk-bar-container">
        <div class="risk-bar-label"><span>Safe</span><span>Suspicious</span><span>Fake</span></div>
        <div class="risk-bar-track">
          <div class="risk-bar-fill" id="riskBarFill" style="width:0%;background:${riskBarColor}"></div>
        </div>
      </div>

      <!-- Summary -->
      <div class="analysis-summary">${summary}</div>

      <!-- Red Flags -->
      ${redFlags?.length ? `
      <div class="result-section">
        <div class="result-section-title">🚩 Red Flags Detected (${redFlags.length})</div>
        <ul class="flag-list">
          ${redFlags.map(f => `
            <li class="flag-item red">
              <span class="flag-icon">⚠️</span> ${f}
            </li>`).join("")}
        </ul>
      </div>` : ""}

      <!-- Positive Signals -->
      ${positiveSignals?.length ? `
      <div class="result-section">
        <div class="result-section-title">✅ Trust Signals (${positiveSignals.length})</div>
        <ul class="flag-list">
          ${positiveSignals.map(s => `
            <li class="flag-item green">
              <span class="flag-icon">✓</span> ${s}
            </li>`).join("")}
        </ul>
      </div>` : ""}

      <!-- Recommendation -->
      <div class="result-section">
        <div class="result-section-title">💡 Recommendation</div>
        <div class="recommendation-box">
          <strong>What to do:</strong>${recommendation}
        </div>
      </div>

      <!-- Detailed Analysis -->
      ${detailedAnalysis && Object.keys(detailedAnalysis).length ? `
      <div class="result-section">
        <div class="result-section-title">🔎 Detailed Analysis</div>
        <div class="detail-grid">
          ${Object.entries(detailedAnalysis).map(([key, val]) => `
            <div class="detail-item">
              <div class="detail-item-label">${key.replace("Analysis","").replace(/([A-Z])/g," $1").trim()}</div>
              <div class="detail-item-text">${val}</div>
            </div>`).join("")}
        </div>
      </div>` : ""}

      ${analysis.fallback ? `<div style="font-size:0.75rem;color:var(--text3);margin-top:12px;padding:8px;background:rgba(255,255,255,0.03);border-radius:6px;">⚠️ Note: AI service unavailable — basic rule-based detection was used. Results may be less accurate.</div>` : ""}
    </div>`;

  document.getElementById("detectResultPanel").innerHTML = html;

  // Animate risk bar
  setTimeout(() => {
    const fill = document.getElementById("riskBarFill");
    if (fill) fill.style.width = `${riskScore}%`;
  }, 100);
}

function showAnalysisError(msg) {
  document.getElementById("detectResultPanel").innerHTML = `
    <div class="analyzing-state">
      <div style="font-size:3rem">❌</div>
      <h3>Analysis Failed</h3>
      <p style="color:var(--danger)">${msg}</p>
      <p style="color:var(--text3);font-size:0.8rem;margin-top:8px">
        Check that your backend server is running and your ANTHROPIC_API_KEY is set in .env
      </p>
    </div>`;
}

// ── Load Sample Jobs ─────────────────────────────────────────
function loadSampleJob(type) {
  if (type === "real") {
    document.getElementById("dTitle").value = "Senior Software Engineer";
    document.getElementById("dCompany").value = "InfoSys Ltd.";
    document.getElementById("dLocation").value = "Bangalore, India";
    document.getElementById("dSalary").value = "₹20-30 LPA";
    document.getElementById("dEmail").value = "recruitment@infosys.com";
    document.getElementById("dWebsite").value = "https://www.infosys.com";
    document.getElementById("dDescription").value = "We are seeking a Senior Software Engineer with strong backend development skills to join our growing engineering team. You will be responsible for designing and implementing scalable microservices, mentoring junior developers, conducting code reviews, and collaborating with product managers to deliver high-quality software solutions. Experience with cloud platforms (AWS/Azure) and agile methodologies is preferred.";
    document.getElementById("dRequirements").value = "5+ years of software development experience\nProficiency in Java/Python/Node.js\nExperience with microservices architecture\nKnowledge of SQL and NoSQL databases\nFamiliarity with Docker and Kubernetes\nStrong communication skills";
  } else {
    document.getElementById("dTitle").value = "URGENT!!! Work From Home DATA ENTRY - Earn $$$";
    document.getElementById("dCompany").value = "QuickEarnings Global";
    document.getElementById("dLocation").value = "Anywhere";
    document.getElementById("dSalary").value = "$3000-$8000 per week GUARANTEED!!!";
    document.getElementById("dEmail").value = "quickearnings247@gmail.com";
    document.getElementById("dWebsite").value = "";
    document.getElementById("dDescription").value = "🔥 URGENT HIRING!!! 🔥 Earn $3000-$8000 per WEEK from the comfort of your home!!! NO EXPERIENCE NEEDED!!! Just fill simple online forms and get PAID INSTANTLY! We guarantee your income! 100% LEGIT! You just need to pay a small registration fee of $99 to access our exclusive system. LIMITED SLOTS AVAILABLE - ACT NOW!!! Send your name, address, bank details and national ID to start immediately. We will double your investment in 30 days GUARANTEED!!!";
    document.getElementById("dRequirements").value = "No experience needed\nInternet access\nWillingness to earn money fast";
  }
  showToast(type === "real" ? "Real job sample loaded ✅" : "Fake job sample loaded ⚠️");
}