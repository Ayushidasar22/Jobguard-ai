// ============================================================
// JobGuard AI — Search Logic (Frontend)
// ============================================================

let suggestionTimeout;

async function performSearch() {
  const q = document.getElementById("searchInput")?.value.trim() || "";
  const location = document.getElementById("locationInput")?.value.trim() || "";
  const type = document.getElementById("filterType")?.value || "";
  const category = document.getElementById("filterCategory")?.value || "all";
  const sort = document.getElementById("filterSort")?.value || "recent";
  const remote = document.getElementById("filterRemote")?.checked ? "true" : "";
  const safeOnly = document.getElementById("filterSafe")?.checked ? "true" : "";

  const container = document.getElementById("searchResults");
  const info = document.getElementById("searchResultsInfo");

  container.innerHTML = `<div class="loading-spinner"></div>`;

  try {
    const params = {};
    if (q) params.q = q;
    if (location) params.location = location;
    if (type) params.type = type;
    if (category && category !== "all") params.category = category;
    if (sort) params.sort = sort;
    if (remote) params.remote = remote;
    if (safeOnly) params.safeOnly = safeOnly;

    const data = await API.search(params);

    if (!data.success) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Search failed</h3><p>${data.error || "Unknown error"}</p></div>`;
      return;
    }

    info.textContent = `Found ${data.total} job${data.total !== 1 ? "s" : ""}${q ? ` for "${q}"` : ""}`;

    if (!data.jobs?.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No jobs found</h3>
          <p>Try different keywords or clear your filters</p>
          <button class="btn-outline" onclick="clearFilters()">Clear Filters</button>
        </div>`;
      return;
    }

    container.innerHTML = data.jobs.map(renderJobCard).join("");

  } catch (e) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Cannot connect to server</h3>
        <p>Make sure the backend is running: <code>node server.js</code></p>
      </div>`;
  }
}

function handleSearchKey(event) {
  if (event.key === "Enter") performSearch();
}

function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("locationInput").value = "";
  document.getElementById("filterType").value = "";
  document.getElementById("filterCategory").value = "all";
  document.getElementById("filterSort").value = "recent";
  document.getElementById("filterRemote").checked = false;
  document.getElementById("filterSafe").checked = false;
  document.getElementById("suggestions").classList.add("hidden");
  performSearch();
}

// ── Autocomplete Suggestions ─────────────────────────────────
async function fetchSuggestions(q) {
  clearTimeout(suggestionTimeout);
  const dropdown = document.getElementById("suggestions");
  if (!q || q.length < 2) { dropdown.classList.add("hidden"); return; }

  suggestionTimeout = setTimeout(async () => {
    try {
      const data = await API.getSuggestions(q);
      if (data.suggestions?.length) {
        dropdown.innerHTML = data.suggestions.map(s =>
          `<div class="suggestion-item" onclick="selectSuggestion('${s.replace(/'/g,"\\'")}')">🔍 ${s}</div>`
        ).join("");
        dropdown.classList.remove("hidden");
      } else {
        dropdown.classList.add("hidden");
      }
    } catch {
      dropdown.classList.add("hidden");
    }
  }, 300);
}

function selectSuggestion(text) {
  document.getElementById("searchInput").value = text;
  document.getElementById("suggestions").classList.add("hidden");
  performSearch();
}

// Close suggestions on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    document.getElementById("suggestions")?.classList.add("hidden");
  }
});