export function formatRisk(risk) {
  if (risk === "high") return { label: "HIGH", className: "high" };
  if (risk === "medium") return { label: "MEDIUM", className: "medium" };
  return { label: "LOW", className: "low" };
}

export function summarizeReview(review) {
  const summary = review?.result?.summary ?? {};
  const policy = review?.result?.policy ?? null;

  return {
    id: review?.id ?? "",
    risk: summary?.risk ?? "low",
    highlights: Array.isArray(summary?.highlights) ? summary.highlights : [],
    missingTests: Array.isArray(summary?.missingTests) ? summary.missingTests : [],
    checklist: Array.isArray(review?.result?.checklist) ? review.result.checklist : [],
    policy
  };
}

export function fileItems(review) {
  const files = Array.isArray(review?.result?.files) ? review.result.files : [];
  return files.map((file) => ({
    path: file.path,
    risk: file.risk ?? "low",
    missingTests: Array.isArray(file.missingTests) ? file.missingTests : [],
    comments: Array.isArray(file.comments) ? file.comments : []
  }));
}

