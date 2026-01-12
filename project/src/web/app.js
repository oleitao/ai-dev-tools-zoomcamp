import { api } from "./apiClient.js";
import { fileItems, formatRisk, summarizeReview } from "./viewModel.js";

const $ = (id) => document.getElementById(id);

function setHidden(el, hidden) {
  el.classList.toggle("hidden", Boolean(hidden));
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function el(tag, { className, text } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderList(items) {
  if (!items.length) return el("p", { className: "muted", text: "—" });
  const ul = el("ul");
  for (const item of items) ul.appendChild(el("li", { text: item }));
  return ul;
}

function renderSummary(review) {
  const summaryRoot = $("summary");
  summaryRoot.classList.remove("empty");
  clear(summaryRoot);

  const summary = summarizeReview(review);
  const risk = formatRisk(summary.risk);

  const header = el("div", { className: "row space-between" });
  header.appendChild(el("div", { className: `badge ${risk.className}`, text: `RISK: ${risk.label}` }));

  const meta = el("div", { className: "muted small" });
  meta.textContent = `Review: ${summary.id.slice(0, 8)}…`;
  header.appendChild(meta);
  summaryRoot.appendChild(header);

  const grid = el("div", { className: "summary-grid" });
  const left = el("div");
  left.appendChild(el("div", { className: "muted small", text: "Highlights" }));
  left.appendChild(renderList(summary.highlights));

  const right = el("div");
  right.appendChild(el("div", { className: "muted small", text: "Missing tests" }));
  right.appendChild(renderList(summary.missingTests));

  grid.appendChild(left);
  grid.appendChild(right);
  summaryRoot.appendChild(grid);

  const checklist = el("div");
  checklist.appendChild(el("div", { className: "muted small", text: "Checklist" }));
  checklist.appendChild(renderList(summary.checklist));
  summaryRoot.appendChild(checklist);

  if (summary.policy) {
    const policy = el("div");
    policy.appendChild(el("div", { className: "muted small", text: "Policy" }));
    const status = summary.policy.passed ? "passed" : "failed";
    policy.appendChild(
      el("p", { className: `muted small`, text: `policy=${status} (id=${summary.policy.policyId ?? "—"})` })
    );
    if (Array.isArray(summary.policy.blockers) && summary.policy.blockers.length > 0) {
      policy.appendChild(renderList(summary.policy.blockers));
    }
    summaryRoot.appendChild(policy);
  }
}

function renderFiles(review) {
  const root = $("files");
  root.classList.remove("empty");
  clear(root);

  const files = fileItems(review);
  if (!files.length) {
    root.appendChild(el("p", { className: "muted", text: "Sem ficheiros para mostrar." }));
    return;
  }

  for (const file of files) {
    const card = el("div", { className: "file" });
    const header = el("div", { className: "file-header" });
    header.appendChild(el("div", { className: "file-path", text: file.path }));

    const risk = formatRisk(file.risk);
    header.appendChild(el("div", { className: `badge ${risk.className}`, text: risk.label }));
    card.appendChild(header);

    if (file.missingTests.length) {
      const mt = el("div");
      mt.appendChild(el("div", { className: "muted small", text: "Missing tests" }));
      mt.appendChild(renderList(file.missingTests));
      card.appendChild(mt);
    }

    const comments = el("div", { className: "comments" });
    if (!file.comments.length) {
      comments.appendChild(el("p", { className: "muted small", text: "Sem comentários." }));
    } else {
      for (const c of file.comments) {
        const item = el("div", { className: "comment" });
        const meta = el("div", {
          className: "meta",
          text: `${c.type}${c.line ? ` @L${c.line}` : ""}`
        });
        item.appendChild(meta);
        item.appendChild(el("div", { text: c.message }));
        comments.appendChild(item);
      }
    }
    card.appendChild(comments);

    root.appendChild(card);
  }
}

async function refreshHistory() {
  const historyRoot = $("history");
  clear(historyRoot);

  const list = await api.listReviews({ limit: 10, offset: 0 });
  for (const r of list.reviews ?? []) {
    const chip = el("button", { className: "chip", text: (r.id ?? "").slice(0, 8) });
    chip.type = "button";
    chip.addEventListener("click", async () => {
      const loaded = await api.getReview(r.id);
      renderSummary(loaded.review);
      renderFiles(loaded.review);
    });
    historyRoot.appendChild(chip);
  }
}

async function refreshPolicies() {
  const select = $("policyId");
  clear(select);

  const { policies } = await api.listPolicies();
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "Default";
  select.appendChild(none);

  for (const p of policies ?? []) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.isDefault ? `${p.name} (default)` : p.name;
    if (p.isDefault) opt.selected = true;
    select.appendChild(opt);
  }
}

async function refreshMetrics() {
  const root = $("metrics");
  const { metrics } = await api.metrics();
  root.textContent = `total=${metrics.totalReviews} missing-tests=${metrics.missingTestsReviews}`;
}

function setError(message) {
  const root = $("error");
  if (!message) {
    setHidden(root, true);
    root.textContent = "";
    return;
  }
  root.textContent = message;
  setHidden(root, false);
}

function setTabs(active) {
  const diffTab = $("tab-diff");
  const gitTab = $("tab-github");
  const diffPanel = $("panel-diff");
  const gitPanel = $("panel-github");

  const isDiff = active === "diff";
  diffTab.classList.toggle("active", isDiff);
  gitTab.classList.toggle("active", !isDiff);
  setHidden(diffPanel, !isDiff);
  setHidden(gitPanel, isDiff);
}

async function boot() {
  try {
    const health = await api.health();
    $("health").textContent = `backend=${health.status} v${health.version}`;
  } catch {
    $("health").textContent = "backend=offline";
  }

  $("tab-diff").addEventListener("click", () => setTabs("diff"));
  $("tab-github").addEventListener("click", () => setTabs("github"));

  $("btnClear").addEventListener("click", () => {
    $("diff").value = "";
    $("prUrl").value = "";
    setError(null);
  });

  $("btnReview").addEventListener("click", async () => {
    setError(null);

    const isGitHub = $("tab-github").classList.contains("active");
    const maxCommentsPerFile = parseInt($("maxCommentsPerFile").value, 10);
    const policyId = $("policyId").value || undefined;
    const provider = $("provider").value || "heuristic";

    const options = { maxCommentsPerFile, provider };
    if (policyId) options.policyId = policyId;

    const payload = isGitHub
      ? { source: "github", prUrl: $("prUrl").value.trim(), options }
      : { source: "diff", diff: $("diff").value, options };

    try {
      const { review } = await api.createReview(payload);
      renderSummary(review);
      renderFiles(review);
      await Promise.all([refreshHistory(), refreshMetrics()]);
    } catch (error) {
      setError(`${error.code ?? "error"}: ${error.message}`);
    }
  });

  await Promise.all([refreshPolicies(), refreshHistory(), refreshMetrics()]);
}

boot();
