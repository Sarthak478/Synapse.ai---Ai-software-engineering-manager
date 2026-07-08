import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDatabases } from "./repoAnalysis.ts";

test("normalizeDatabases removes MongoDB when only Redis is evidenced", () => {
  const databases = normalizeDatabases(
    ["MongoDB", "Redis"],
    "Uses Redis cache for queues and session locks.",
    "- package.json Dependencies: express, redis, ioredis"
  );

  assert.deepEqual(databases, ["Redis"]);
});

test("normalizeDatabases preserves MongoDB when mongoose is evidenced", () => {
  const databases = normalizeDatabases(
    ["MongoDB", "Redis"],
    "Uses Redis cache and mongoose models.",
    "- package.json Dependencies: express, mongoose, redis"
  );

  assert.deepEqual(databases, ["MongoDB", "Redis"]);
});
