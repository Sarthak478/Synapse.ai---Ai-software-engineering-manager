import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalProjectData, mergeServerAndLocalState } from "./stateSync.ts";

test("buildLocalProjectData keeps per-user project data but excludes repositories", () => {
  const localProject = buildLocalProjectData({
    repositories: [{ id: "repo-1", name: "shared-repo" }],
    tasks: [{ id: "task-1" }],
    codeReviews: [{ id: "review-1" }],
    standups: [{ id: "standup-1" }],
    chats: [{ id: "chat-1" }],
    sprints: [{ id: "sprint-1" }]
  });

  assert.deepEqual(localProject, {
    tasks: [{ id: "task-1" }],
    codeReviews: [{ id: "review-1" }],
    standups: [{ id: "standup-1" }],
    chats: [{ id: "chat-1" }],
    sprints: [{ id: "sprint-1" }]
  });
});

test("mergeServerAndLocalState always prefers workspace-shared repositories from the server", () => {
  const merged = mergeServerAndLocalState(
    {
      developers: [],
      repositories: [{ id: "repo-shared", name: "team-repo" }],
      settings: { hasGeminiApiKey: true }
    },
    {
      repositories: [{ id: "repo-local", name: "stale-local-repo" }],
      tasks: [{ id: "task-1" }]
    }
  );

  assert.deepEqual(merged.repositories, [{ id: "repo-shared", name: "team-repo" }]);
  assert.deepEqual(merged.tasks, [{ id: "task-1" }]);
});
