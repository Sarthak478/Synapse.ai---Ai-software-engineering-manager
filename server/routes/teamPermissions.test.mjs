import test from "node:test";
import assert from "node:assert/strict";
import {
  canDeleteDeveloper,
  canSetHeadPrivilege
} from "./teamPermissions.ts";

const headA = { id: "head-a", isHead: true };
const headB = { id: "head-b", isHead: true };
const member = { id: "member", isHead: false };

test("non-heads cannot delete team members", () => {
  assert.equal(canDeleteDeveloper([headA, member], member.id, headA.id, member.id).allowed, false);
});

test("a head cannot remove the last remaining head", () => {
  assert.equal(canDeleteDeveloper([headA, member], headA.id, headA.id, headA.id).allowed, false);
});

test("a head can remove another head when another head remains", () => {
  assert.equal(canDeleteDeveloper([headA, headB, member], headA.id, headB.id, headB.id).allowed, true);
});

test("a head cannot revoke their own head privilege", () => {
  assert.equal(canSetHeadPrivilege([headA, headB], headA.id, headA.id, false).allowed, false);
});

test("a head cannot demote the last remaining head", () => {
  assert.equal(canSetHeadPrivilege([headA, member], headA.id, headA.id, false).allowed, false);
});

test("a head can promote members and demote another head when one head remains", () => {
  assert.equal(canSetHeadPrivilege([headA, member], headA.id, member.id, true).allowed, true);
  assert.equal(canSetHeadPrivilege([headA, headB, member], headA.id, headB.id, false).allowed, true);
});
