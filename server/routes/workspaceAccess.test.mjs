import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspaceIdFromDeveloper } from "./workspaceAccess.ts";

test("resolveWorkspaceIdFromDeveloper returns the workspace id for active developers", () => {
  assert.equal(
    resolveWorkspaceIdFromDeveloper({ id: "dev-1", workspaceId: "team-alpha" }),
    "team-alpha"
  );
});

test("resolveWorkspaceIdFromDeveloper throws a 403 for orphaned sessions", () => {
  assert.throws(
    () => resolveWorkspaceIdFromDeveloper(null),
    (err) => {
      assert.equal(err.status, 403);
      assert.match(err.message, /Session no longer maps/i);
      return true;
    }
  );
});
