// ============================================================
// JobGuard AI — API Helper (Frontend)
// ============================================================

const API_BASE = "http://localhost:5000/api";

const API = {
  // ── Jobs ──────────────────────────────────────────────────
  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/jobs${query ? "?" + query : ""}`);
    return res.json();
  },

  async getJob(id) {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    return res.json();
  },

  async postJob(data) {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ── Search ────────────────────────────────────────────────
  async search(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/search?${query}`);
    return res.json();
  },

  async getSuggestions(q) {
    const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(q)}`);
    return res.json();
  },

  // ── Detection ─────────────────────────────────────────────
  async detectJob(jobData) {
    const res = await fetch(`${API_BASE}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobData)
    });
    return res.json();
  },

  async detectQuick(text) {
    const res = await fetch(`${API_BASE}/detect/quick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    return res.json();
  },

  // ── Health ────────────────────────────────────────────────
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.json();
    } catch {
      return { status: "offline" };
    }
  },

  // ── Stats ─────────────────────────────────────────────────
  async getStats() {
    const res = await fetch(`${API_BASE}/jobs/stats/summary`);
    return res.json();
  }
};