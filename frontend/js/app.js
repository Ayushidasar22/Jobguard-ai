// ============================================================
// JobGuard AI — Main App Logic
// ============================================================

// ── Saved Jobs (localStorage) ────────────────────────────────
function getSaved() {
  try { return JSON.parse(localStorage.getItem("savedJobs") || "[]"); } catch { return []; }
}
function setSaved(arr) { localStorage.setItem("savedJobs", JSON.stringify(arr)); }
function isSaved(id) { return getSaved().includes(id); }
function toggleSave(id, event) {
  if (event) event.stopPropagation();
  const saved = getSaved();
  const idx = saved.indexOf(id);
  if (idx === -1) { saved.push(id); showToast("Job saved! 🔖"); }
  else { saved.splice(idx, 1); showToast("Job removed from saved."); }
  setSaved(saved);
  // Update all save buttons with this id
  document.querySelectorAll(`[data-save-id="${id}"]`).forEach(btn => {
    btn.classList.toggle("saved", isSaved(id));
    btn.textContent = isSaved(id) ? "🔖" : "🏷️";
  });
  if (document.getElementById("tab-saved").classList.contains("active")) {
    renderSavedJobs();
  }
}

// ── Tab Navigation ───────────────────────────────────────────
function showTab(tab) {
  document.querySelectorAll(".tab-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

  document.getElementById(`tab-${tab}`)?.classList.add("active");
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add("active");

  if (tab === "search") performSearch();
  if (tab === "saved") renderSavedJobs();
}

// ── Toast ────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = "default") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.add("hidden"), 3000);
}

// ── Modal ────────────────────────────────────────────────────
function openModal(jobId) {
  API.getJob(jobId).then(data => {
    if (!data.success) return;
    const job = data.job;
    const modal = document.getElementById("jobModal");
    document.getElementById("modalContent").innerHTML = renderModalContent(job);
    modal.classList.remove("hidden");
  });
}
function closeModal() { document.getElementById("jobModal").classList.add("hidden"); }
document.getElementById("jobModal")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

function renderModalContent(job) {
  const riskColor = job.riskScore >= 70 ? "var(--danger)" : job.riskScore >= 40 ? "var(--warn)" : "var(--safe)";
  const riskLabel = job.riskScore >= 70 ? "⚠️ HIGH RISK — Possible Scam" : job.riskScore >= 40 ? "🟡 Medium Risk" : "✅ Low Risk";

  return `
    <div class="modal-job-title">${job.title}</div>
    <div class="modal-company">🏢 ${job.company} &nbsp;|&nbsp; 📍 ${job.location}</div>
    ${job.riskScore != null ? `<div style="display:inline-block;background:${riskColor}22;color:${riskColor};padding:6px 14px;border-radius:8px;font-size:0.82rem;font-weight:600;margin-bottom:16px;">${riskLabel} (${job.riskScore}/100)</div>` : ""}
    <div class="modal-tags">
      <span class="modal-tag">🕐 ${job.type}</span>
      <span class="modal-tag">💰 ${job.salary}</span>
      <span class="modal-tag">📂 ${job.category}</span>
      ${job.remote ? '<span class="modal-tag" style="color:var(--accent2)">🌐 Remote</span>' : ""}
      ${job.verified ? '<span class="modal-tag" style="color:var(--safe)">✓ Verified</span>' : ""}
    </div>
    <div class="modal-section">
      <h4>About the Role</h4>
      <p>${job.description}</p>
    </div>
    ${job.requirements?.length ? `
    <div class="modal-section">
      <h4>Requirements</h4>
      <ul>${job.requirements.map(r => `<li>${r}</li>`).join("")}</ul>
    </div>` : ""}
    ${job.benefits?.length ? `
    <div class="modal-section">
      <h4>Benefits</h4>
      <ul>${job.benefits.map(b => `<li>${b}</li>`).join("")}</ul>
    </div>` : ""}
    <div class="modal-section">
      <h4>Contact & Apply</h4>
      ${job.contactEmail ? `<p>📧 <a href="mailto:${job.contactEmail}" style="color:var(--accent2)">${job.contactEmail}</a></p>` : ""}
      ${job.companyWebsite ? `<p>🌐 <a href="${job.companyWebsite}" target="_blank" style="color:var(--accent2)">${job.companyWebsite}</a></p>` : ""}
      <p style="margin-top:8px;font-size:0.8rem;color:var(--text3)">Posted: ${job.posted} &nbsp;|&nbsp; Deadline: ${job.deadline || "Open"} &nbsp;|&nbsp; ${job.applicants || 0} applicants</p>
    </div>
    <div class="modal-footer">
      <button class="btn-primary" onclick="window.open('mailto:${job.contactEmail}','_blank')">Apply Now 🚀</button>
      <button class="btn-outline" onclick="analyzeFromModal(${JSON.stringify(job).replace(/"/g,'&quot;')})">Scan for Scam 🤖</button>
      <button class="btn-ghost" onclick="closeModal()">Close</button>
    </div>
  `;
}

function analyzeFromModal(job) {
  closeModal();
  showTab("detect");
  document.getElementById("dTitle").value = job.title || "";
  document.getElementById("dCompany").value = job.company || "";
  document.getElementById("dLocation").value = job.location || "";
  document.getElementById("dSalary").value = job.salary || "";
  document.getElementById("dEmail").value = job.contactEmail || "";
  document.getElementById("dWebsite").value = job.companyWebsite || "";
  document.getElementById("dDescription").value = job.description || "";
  document.getElementById("dRequirements").value = (job.requirements || []).join("\n");
  setTimeout(() => analyzeJob(), 300);
}

// ── Render Job Card ──────────────────────────────────────────
function renderJobCard(job) {
  const colors = ["logo-0","logo-1","logo-2","logo-3","logo-4","logo-5"];
  const colorClass = colors[Math.abs(hashStr(job.company || "")) % colors.length];
  const initial = (job.company || "?")[0].toUpperCase();
  const saved = isSaved(job.id);

  let riskClass = "risk-low", riskLabel = "✅ Safe", riskColor = "safe";
  if (job.riskScore >= 70) { riskClass = "risk-high"; riskLabel = "⚠️ FAKE"; riskColor = "fake"; }
  else if (job.riskScore >= 40) { riskClass = "risk-medium"; riskLabel = "🟡 Suspicious"; riskColor = "warn"; }

  return `
    <div class="job-card ${riskClass}" onclick="openModal('${job.id}')">
      <div class="jc-header">
        <div class="jc-logo ${colorClass}">${initial}</div>
        <div class="jc-info">
          <div class="jc-title">${job.title}</div>
          <div class="jc-company">${job.company}</div>
        </div>
        <div class="jc-actions">
          <button class="jc-save-btn ${saved ? "saved" : ""}" 
            data-save-id="${job.id}"
            onclick="toggleSave('${job.id}', event)">
            ${saved ? "🔖" : "🏷️"}
          </button>
        </div>
      </div>
      <div class="jc-tags">
        <span class="jc-tag">${job.type}</span>
        ${job.salary ? `<span class="jc-tag salary">💰 ${job.salary}</span>` : ""}
        ${job.remote ? `<span class="jc-tag remote">🌐 Remote</span>` : `<span class="jc-tag">📍 ${job.location}</span>`}
      </div>
      <div class="jc-desc">${job.description}</div>
      <div class="jc-footer">
        <div class="jc-meta">📅 ${job.posted} &nbsp;·&nbsp; 👥 ${job.applicants || 0} applied</div>
        ${job.riskScore != null
          ? `<div class="jc-risk-badge ${riskColor}">${riskLabel} ${job.riskScore}/100</div>`
          : `<div class="jc-risk-badge safe">📂 ${job.category}</div>`
        }
      </div>
    </div>
  `;
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i);
  return h;
}

// ── Saved Jobs Tab ───────────────────────────────────────────
async function renderSavedJobs() {
  const container = document.getElementById("savedJobsList");
  const savedIds = getSaved();

  if (!savedIds.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔖</div>
        <h3>No saved jobs yet</h3>
        <p>Click the bookmark icon on any job to save it here</p>
        <button class="btn-primary" onclick="showTab('search')">Browse Jobs</button>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="loading-spinner"></div>`;
  try {
    const data = await API.getJobs({ limit: 100 });
    const jobs = data.jobs?.filter(j => savedIds.includes(j.id)) || [];
    if (!jobs.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔖</div><h3>No saved jobs found</h3><p>Your saved jobs may have been removed.</p></div>`;
    } else {
      container.innerHTML = jobs.map(renderJobCard).join("");
    }
  } catch {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load saved jobs</h3><p>Make sure the server is running.</p></div>`;
  }
}

// ── Hero Search ──────────────────────────────────────────────
function heroSearch() {
  const q = document.getElementById("heroSearchInput").value.trim();
  if (q) { document.getElementById("searchInput").value = q; }
  showTab("search");
}
function quickSearch(term) {
  document.getElementById("searchInput").value = term;
  showTab("search");
}
document.getElementById("heroSearchInput")?.addEventListener("keyup", e => {
  if (e.key === "Enter") heroSearch();
});

// ── Post Job ─────────────────────────────────────────────────
async function postJob() {
  const btn = document.getElementById("postJobBtn");
  const title = document.getElementById("pTitle").value.trim();
  const company = document.getElementById("pCompany").value.trim();
  const description = document.getElementById("pDescription").value.trim();

  if (!title || !company || !description) {
    showToast("Please fill in Title, Company, and Description.", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Posting...";

  try {
    const data = await API.postJob({
      title,
      company,
      location: document.getElementById("pLocation").value,
      type: document.getElementById("pType").value,
      salary: document.getElementById("pSalary").value,
      category: document.getElementById("pCategory").value,
      description,
      requirements: document.getElementById("pRequirements").value,
      benefits: document.getElementById("pBenefits").value,
      contactEmail: document.getElementById("pEmail").value,
      companyWebsite: document.getElementById("pWebsite").value,
      remote: document.getElementById("pRemote").checked
    });

    if (data.success) {
      document.getElementById("postSuccessMsg").classList.remove("hidden");
      clearPostForm();
      showToast("Job posted successfully! 🎉", "success");
    } else {
      showToast(data.error || "Failed to post job.", "error");
    }
  } catch (e) {
    showToast("Server error. Is the backend running?", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = "📤 Post Job Listing";
  }
}

function clearPostForm() {
  ["pTitle","pCompany","pLocation","pSalary","pDescription","pRequirements","pBenefits","pEmail","pWebsite"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.getElementById("pRemote").checked = false;
}

// ── Load Home Data ───────────────────────────────────────────
async function loadHomeData() {
  // Check server health
  const health = await API.checkHealth();
  const dot = document.querySelector(".status-dot");
  const statusText = document.querySelector(".status-text");
  if (health.status === "ok") {
    dot.classList.add("online");
    statusText.textContent = "Server Online";
  } else {
    dot.classList.add("offline");
    statusText.textContent = "Server Offline";
  }

  // Load stats
  try {
    const statsData = await API.getStats();
    if (statsData.success) {
      const s = statsData.stats;
      document.getElementById("statTotal").textContent = s.total;
      document.getElementById("statVerified").textContent = s.verified;
      document.getElementById("statFake").textContent = s.fake || "0";
      document.getElementById("statRemote").textContent = s.remote;
    }
  } catch {}

  // Load recent jobs
  try {
    const jobsData = await API.getJobs({ limit: 6 });
    const container = document.getElementById("homeJobsList");
    if (jobsData.jobs?.length) {
      container.innerHTML = jobsData.jobs.map(renderJobCard).join("");
    } else {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No jobs found</h3><p>Be the first to post a job!</p></div>`;
    }
  } catch {
    document.getElementById("homeJobsList").innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Server not reachable</h3><p>Please start the backend server.</p></div>`;
  }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadHomeData();
});