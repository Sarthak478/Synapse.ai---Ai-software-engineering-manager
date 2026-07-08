function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function hasEvidence(haystack: string, terms: string[]) {
  const normalized = haystack.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function normalizeDatabases(databases: string[] = [], description = "", githubInfo = "") {
  const evidence = `${description}\n${githubInfo}`;
  const seen = new Set<string>();
  const normalizedDatabases: string[] = [];

  for (const db of databases) {
    const name = String(db || "").trim();
    if (!name) continue;

    const normalizedName = normalizeName(name);
    const isMongo = normalizedName.includes("mongo") || normalizedName.includes("mongoose");
    if (isMongo && !hasEvidence(evidence, ["mongodb", "mongo db", "mongoose", "mongo"])) {
      continue;
    }

    const displayName = normalizedName.includes("redis") || normalizedName.includes("ioredis")
      ? "Redis"
      : name;

    const key = normalizeName(displayName);
    if (!seen.has(key)) {
      seen.add(key);
      normalizedDatabases.push(displayName);
    }
  }

  if (hasEvidence(evidence, ["redis", "ioredis"]) && !seen.has("redis")) {
    normalizedDatabases.push("Redis");
  }

  return normalizedDatabases;
}
