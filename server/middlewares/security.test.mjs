import test from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "./security.ts";

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader() {}
  };
}

test("createRateLimiter blocks requests over the configured limit", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });
  const req = { ip: "127.0.0.1", headers: {}, socket: {} };

  let nextCalls = 0;
  limiter(req, createMockResponse(), () => nextCalls++);
  limiter(req, createMockResponse(), () => nextCalls++);

  const blockedRes = createMockResponse();
  limiter(req, blockedRes, () => nextCalls++);

  assert.equal(nextCalls, 2);
  assert.equal(blockedRes.statusCode, 429);
});
